-- Adds separate state for email ownership verification.
-- Existing accounts remain verified; new email registrations explicitly set false.

SET @has_email_verified = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'email_verified'
);
SET @migration_sql = IF(
    @has_email_verified = 0,
    'ALTER TABLE users ADD COLUMN email_verified boolean NOT NULL DEFAULT TRUE',
    'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

SET @has_verification_token_hash = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'email_verification_token_hash'
);
SET @migration_sql = IF(
    @has_verification_token_hash = 0,
    'ALTER TABLE users ADD COLUMN email_verification_token_hash varchar(64) NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_verification_expires_at = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'email_verification_expires_at'
);
SET @migration_sql = IF(
    @has_verification_expires_at = 0,
    'ALTER TABLE users ADD COLUMN email_verification_expires_at datetime NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_verification_sent_at = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'email_verification_sent_at'
);
SET @migration_sql = IF(
    @has_verification_sent_at = 0,
    'ALTER TABLE users ADD COLUMN email_verification_sent_at datetime NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @has_unique_verification_token_hash = (
    SELECT COUNT(*)
    FROM information_schema.statistics s
    WHERE s.table_schema = DATABASE()
      AND s.table_name = 'users'
      AND s.column_name = 'email_verification_token_hash'
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
    @has_unique_verification_token_hash = 0,
    'ALTER TABLE users ADD CONSTRAINT uq_users_email_verification_token_hash UNIQUE (email_verification_token_hash)',
    'SELECT 1'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
