package com.warehouse.common.util;

import java.sql.SQLException;
import java.util.Locale;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;

public final class DatabaseConstraintUtils {
    private DatabaseConstraintUtils() {
    }

    public static boolean isUniqueConstraintViolation(
            DataIntegrityViolationException exception,
            String columnName) {
        String expectedColumn = columnName.toLowerCase(Locale.ROOT);
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation
                    && violation.getConstraintName() != null
                    && violation.getConstraintName().toLowerCase(Locale.ROOT).contains(expectedColumn)) {
                return true;
            }
            if (cause instanceof SQLException sqlException
                    && (sqlException.getErrorCode() == 1062 || "23505".equals(sqlException.getSQLState()))) {
                String message = sqlException.getMessage();
                if (message != null && message.toLowerCase(Locale.ROOT).contains(expectedColumn)) {
                    return true;
                }
            }
        }
        return false;
    }
}
