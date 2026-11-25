# Database migrations

Migrations live in `backend/migrations/` and are applied by `npm run migrate` (recorded in the `schema_migrations` table). Each file runs once.

| File | Adds |
|---|---|
| 001–005 | original schema (jobs, candidates, recruiters, applications, assistance, password reset) |
| **006_premium.sql** | structured job fields (state/city/address, remote region & eligibility, sector, employer type, fresher/experience years, salary currency/period, company website, source URL, logo, verification status, featured, **walk-in drive fields**, duplicate key) + indexes; `email_otps`, `auth_sessions`, `job_reports`, `admin_activity`, `announcements`, `site_settings`; `email_verified_at` on candidates and recruiters |

## Is 006 safe on a live database?
- **Additive only.** No table or column is dropped, no row is deleted, no existing value is rewritten except: jobs posted by a recruiter get `verification_status='recruiter_submitted'` (a new column), and existing candidates/recruiters get `email_verified_at` set with `email_verified_via='legacy'` so they can still sign in. New sign-ups must verify by email.
- Tested on a database containing legacy rows (rows preserved, labels as described) and through the real runner: fresh, re-run (idempotent, skipped), and `--baseline-through=005`.
- Old free-text `location` values are kept. Filters fall back to that text for rows without a structured city/state; nothing is guessed or back-filled.
- MySQL has no `ADD COLUMN IF NOT EXISTS`; the runner records a migration only after it succeeds. If it fails part-way on your server, restore the backup (DDL is not transactional), fix the cause, and run again.

## Apply
```bash
mysqldump -u … -p techabhi > backup-before-006.sql     # always
cd backend
npm run migrate                                         # normal case
npm run migrate -- --baseline-through=005              # tables were created by hand up to 005 (skip 001–005)
```
Run it with an account that may ALTER/CREATE tables (not the runtime app user). After deploying, everybody signs in once more: sessions are now server-side HttpOnly cookies, and old browser tokens are not accepted.

## Rollback
Restore the backup taken above. There is no down-migration: the new columns are harmless to older code, but older code cannot use the new session scheme.
