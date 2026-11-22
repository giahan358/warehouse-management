package com.warehouse.inbound;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

@EnabledIfSystemProperty(named = "mysql.integration.url", matches = "jdbc:mysql:.*")
class InboundCapacityMysqlConcurrencyTest {
    @Test
    void repeatableReadKeepsAnOldCapacitySnapshotAfterWaitingForCustomerLock() throws Exception {
        assertEquals(0, readAfterLockWait(Connection.TRANSACTION_REPEATABLE_READ).compareTo(BigDecimal.ZERO));
    }

    @Test
    void readCommittedSeesCapacityReservationAfterWaitingForCustomerLock() throws Exception {
        assertEquals(0, readAfterLockWait(Connection.TRANSACTION_READ_COMMITTED)
                .compareTo(new BigDecimal("1.00")));
    }

    private BigDecimal readAfterLockWait(int isolationLevel) throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String customersTable = "capacity_test_customers_" + suffix;
        String reservationsTable = "capacity_test_reservations_" + suffix;
        createTables(customersTable, reservationsTable);

        ExecutorService executor = Executors.newSingleThreadExecutor();
        try (Connection writer = openConnection()) {
            writer.setAutoCommit(false);
            lockCustomer(writer, customersTable);

            CountDownLatch snapshotCreated = new CountDownLatch(1);
            CountDownLatch lockRequested = new CountDownLatch(1);
            Future<BigDecimal> readerResult = executor.submit(() -> {
                try (Connection reader = openConnection()) {
                    reader.setTransactionIsolation(isolationLevel);
                    reader.setAutoCommit(false);
                    sumReservations(reader, reservationsTable);
                    snapshotCreated.countDown();
                    lockRequested.countDown();
                    lockCustomer(reader, customersTable);
                    BigDecimal result = sumReservations(reader, reservationsTable);
                    reader.commit();
                    return result;
                }
            });

            assertTrue(snapshotCreated.await(5, TimeUnit.SECONDS), "Reader did not establish its snapshot");
            assertTrue(lockRequested.await(5, TimeUnit.SECONDS), "Reader did not request the customer lock");
            Thread.sleep(100);
            insertReservation(writer, reservationsTable);
            writer.commit();
            return readerResult.get(5, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
            dropTables(customersTable, reservationsTable);
        }
    }

    private void createTables(String customersTable, String reservationsTable) throws SQLException {
        try (Connection connection = openConnection();
                Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE " + customersTable
                    + " (id BIGINT PRIMARY KEY) ENGINE=InnoDB");
            statement.execute("CREATE TABLE " + reservationsTable
                    + " (customer_id BIGINT NOT NULL, volume DECIMAL(12, 2) NOT NULL,"
                    + " INDEX (customer_id)) ENGINE=InnoDB");
            statement.executeUpdate("INSERT INTO " + customersTable + " (id) VALUES (1)");
        }
    }

    private void dropTables(String customersTable, String reservationsTable) throws SQLException {
        try (Connection connection = openConnection();
                Statement statement = connection.createStatement()) {
            statement.execute("DROP TABLE IF EXISTS " + reservationsTable);
            statement.execute("DROP TABLE IF EXISTS " + customersTable);
        }
    }

    private void lockCustomer(Connection connection, String customersTable) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT id FROM " + customersTable + " WHERE id = 1 FOR UPDATE");
                ResultSet resultSet = statement.executeQuery()) {
            if (!resultSet.next()) {
                throw new SQLException("Test customer row is missing");
            }
        }
    }

    private BigDecimal sumReservations(Connection connection, String reservationsTable) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COALESCE(SUM(volume), 0) FROM " + reservationsTable + " WHERE customer_id = 1");
                ResultSet resultSet = statement.executeQuery()) {
            if (!resultSet.next()) {
                throw new SQLException("Reservation aggregate returned no row");
            }
            return resultSet.getBigDecimal(1);
        }
    }

    private void insertReservation(Connection connection, String reservationsTable) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO " + reservationsTable + " (customer_id, volume) VALUES (1, 1.00)")) {
            statement.executeUpdate();
        }
    }

    private Connection openConnection() throws SQLException {
        String url = System.getProperty("mysql.integration.url");
        String username = System.getProperty("mysql.integration.username", "root");
        String password = System.getProperty("mysql.integration.password", "");
        return DriverManager.getConnection(url, username, password);
    }
}
