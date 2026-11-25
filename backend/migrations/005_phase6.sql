-- Phase 6: password reset tokens (candidates and recruiters). Safe to run once, after 001-004.
-- Only a SHA-256 hash of the emailed token is stored, never the token itself.
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_type ENUM('candidate','recruiter') NOT NULL,
  account_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reset_token (token_hash),
  INDEX idx_reset_account (account_type, account_id)
) DEFAULT CHARSET=utf8mb4;
