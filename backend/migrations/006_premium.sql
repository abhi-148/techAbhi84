-- 006: premium upgrade (additive only; no data is deleted or overwritten).
--  * structured job fields (location, remote eligibility, walk-in drives, verification, featured, logo)
--  * email verification (OTP) + server-side sessions
--  * job reports, admin activity log, announcements and site settings (CMS)
-- Tracked by `npm run migrate` (schema_migrations), so it runs once. MySQL has no ADD COLUMN IF NOT EXISTS;
-- if you applied part of this by hand, use `npm run migrate -- --baseline-through=005`, fix the schema, then re-run.

ALTER TABLE jobs
  ADD COLUMN job_kind ENUM('standard','walk_in') NOT NULL DEFAULT 'standard',
  ADD COLUMN sector ENUM('it','non_it','semi_it') NULL,
  ADD COLUMN employer_type ENUM('private','mnc','startup','government','other') NULL,
  ADD COLUMN country VARCHAR(100) NULL,
  ADD COLUMN state VARCHAR(100) NULL,
  ADD COLUMN city VARCHAR(100) NULL,
  ADD COLUMN address VARCHAR(500) NULL,
  ADD COLUMN remote_region VARCHAR(30) NULL,
  ADD COLUMN remote_country VARCHAR(100) NULL,
  ADD COLUMN timezone_requirement VARCHAR(100) NULL,
  ADD COLUMN work_authorization_required TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN fresher_eligible TINYINT(1) NULL,
  ADD COLUMN experience_min_years TINYINT UNSIGNED NULL,
  ADD COLUMN experience_max_years TINYINT UNSIGNED NULL,
  ADD COLUMN salary_currency CHAR(3) NOT NULL DEFAULT 'INR',
  ADD COLUMN salary_period ENUM('year','month','hour') NOT NULL DEFAULT 'year',
  ADD COLUMN company_website VARCHAR(1000) NULL,
  ADD COLUMN source_url VARCHAR(1000) NULL,
  ADD COLUMN logo_file VARCHAR(100) NULL,
  ADD COLUMN verification_status ENUM('awaiting','recruiter_submitted','verified','reported') NOT NULL DEFAULT 'awaiting',
  ADD COLUMN verified_at DATETIME NULL,
  ADD COLUMN verified_by INT NULL,
  ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN featured_at DATETIME NULL,
  ADD COLUMN drive_date DATE NULL,
  ADD COLUMN drive_end_date DATE NULL,
  ADD COLUMN reporting_time TIME NULL,
  ADD COLUMN interview_time TIME NULL,
  ADD COLUMN venue VARCHAR(255) NULL,
  ADD COLUMN venue_address VARCHAR(500) NULL,
  ADD COLUMN maps_url VARCHAR(1000) NULL,
  ADD COLUMN interview_process JSON NULL,
  ADD COLUMN documents_required JSON NULL,
  ADD COLUMN dedupe_key CHAR(64) NULL,
  ADD INDEX idx_jobs_kind_drive (job_kind, status, drive_date),
  ADD INDEX idx_jobs_geo (state, city),
  ADD INDEX idx_jobs_remote (work_mode, remote_region),
  ADD INDEX idx_jobs_featured (featured, status, published_at),
  ADD INDEX idx_jobs_sector (sector),
  ADD INDEX idx_jobs_company (company),
  ADD INDEX idx_jobs_dedupe (dedupe_key),
  ADD INDEX idx_jobs_verif (verification_status);

-- Jobs that a recruiter posted are labelled as such. Everything else stays "awaiting verification" until an admin verifies it.
UPDATE jobs SET verification_status='recruiter_submitted' WHERE recruiter_id IS NOT NULL;

-- Email verification. Accounts that existed before this migration are grandfathered ('legacy') so nobody is locked out;
-- every NEW account must verify through an emailed one-time code.
ALTER TABLE candidates ADD COLUMN email_verified_at DATETIME NULL, ADD COLUMN email_verified_via ENUM('otp','legacy') NULL;
ALTER TABLE recruiters ADD COLUMN email_verified_at DATETIME NULL, ADD COLUMN email_verified_via ENUM('otp','legacy') NULL;
UPDATE candidates SET email_verified_at=UTC_TIMESTAMP(), email_verified_via='legacy' WHERE email_verified_at IS NULL;
UPDATE recruiters SET email_verified_at=UTC_TIMESTAMP(), email_verified_via='legacy' WHERE email_verified_at IS NULL;

-- One-time codes. Only an HMAC of the code is stored, never the code.
CREATE TABLE IF NOT EXISTS email_otps (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_type ENUM('candidate','recruiter') NOT NULL,
  account_id INT NOT NULL,
  code_hash CHAR(64) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  INDEX idx_otp_account (account_type, account_id, created_at)
) DEFAULT CHARSET=utf8mb4;

-- Server-side sessions (revocable). Only a SHA-256 hash of the refresh token is stored.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(32) PRIMARY KEY,
  account_type ENUM('candidate','recruiter','admin') NOT NULL,
  account_id INT NOT NULL,
  refresh_hash CHAR(64) NOT NULL,
  prev_refresh_hash CHAR(64) NULL,
  user_agent VARCHAR(200) NULL,
  created_at DATETIME NOT NULL,
  last_used_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  absolute_expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  INDEX idx_sess_account (account_type, account_id),
  INDEX idx_sess_refresh (refresh_hash),
  INDEX idx_sess_prev (prev_refresh_hash)
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS job_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  reason ENUM('fake_or_scam','asks_for_money','expired','duplicate','wrong_details','other') NOT NULL,
  details VARCHAR(1000) NULL,
  reporter_key CHAR(64) NOT NULL,
  status ENUM('open','dismissed','actioned') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL,
  handled_at DATETIME NULL,
  handled_by INT NULL,
  UNIQUE KEY uq_report_once (job_id, reporter_key),
  INDEX idx_report_status (status, created_at),
  CONSTRAINT fk_report_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_activity (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NULL,
  action VARCHAR(60) NOT NULL,
  entity VARCHAR(40) NOT NULL,
  entity_id INT NULL,
  detail VARCHAR(300) NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_activity_time (created_at)
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message VARCHAR(300) NOT NULL,
  link_url VARCHAR(500) NULL,
  level ENUM('info','success','warning') NOT NULL DEFAULT 'info',
  active TINYINT(1) NOT NULL DEFAULT 1,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_at DATETIME NOT NULL
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS site_settings (
  k VARCHAR(60) PRIMARY KEY,
  v TEXT NOT NULL,
  updated_at DATETIME NOT NULL
) DEFAULT CHARSET=utf8mb4;
