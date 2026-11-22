-- Idempotently adds account-setup fields and the Google ID uniqueness constraint.
-- The current warehouse_db.sql already contains these schema elements.

SET @has_password_setup_token_hash = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'password_setup_token_hash'
);
SET @migration_sql = IF(
    @has_password_setup_token_hash = 0,
    'ALTER TABLE users ADD COLUMN password_setup_token_hash varchar(64) NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_password_setup_expires_at = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'password_setup_expires_at'
);
SET @migration_sql = IF(
    @has_password_setup_expires_at = 0,
    'ALTER TABLE users ADD COLUMN password_setup_expires_at datetime NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_unique_google_id = (
    SELECT COUNT(*)
    FROM information_schema.statistics s
    WHERE s.table_schema = DATABASE()
      AND s.table_name = 'users'
      AND s.column_name = 'google_id'
      AND s.non_unique = 0
      AND (
          SELECT COUNT(*)
          FROM information_schema.statistics index_columns
          WHERE index_columns.table_schema = s.table_schema
            AND index_columns.table_name = s.table_name
            AND index_columns.index_name = s.index_name
      ) = 1
);
SET @migration_sql = IF(
    @has_unique_google_id = 0,
    'ALTER TABLE users ADD CONSTRAINT uq_users_google_id UNIQUE (google_id)',
    'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
