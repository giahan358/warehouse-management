ALTER TABLE users
  ADD COLUMN password_setup_token_hash varchar(64) NULL,
  ADD COLUMN password_setup_expires_at datetime NULL;

ALTER TABLE users
  ADD CONSTRAINT uq_users_google_id UNIQUE (google_id);
