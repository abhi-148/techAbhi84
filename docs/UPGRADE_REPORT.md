# TechAbhi premium upgrade – report

Work was done directly on `TechAbhi_Premium_Job_Portal_Final.zip` (same architecture: React + Vite + Tailwind, Node + Express, MySQL, JWT, bcrypt, Gemini, SMTP). Nothing that worked was removed; where a rule had to change (stricter publish rules, sign-up needing email codes) the affected old tests were updated and are listed below.

## 1. Original project audit (what I found)
Strong base: 331 passing API checks, role-separated auth, parameterised SQL, PDF validation, SEO server rendering, rate limits, password reset by email.
Gaps against the brief:
- **No walk-in, remote-eligibility or India-wide model.** `jobs` had free-text `location`; "Remote" was just text (a remote job could be filtered as a city). No state/city fields, no hiring region, no drive dates/venue.
- **Authentication:** JWT in `localStorage` (documented risk), 7-day non-revocable tokens, no email verification, no OTP, logout did not invalidate anything, password change did not sign out other devices.
- **Trust:** no verification status, no job reports, no duplicate detection, no company logos.
- **UI:** about 120 uses of 9–12 px text, single generic indigo style, same card for everything, `window.confirm` dialogs, no skeleton states on some lists, no location system.
- **Admin:** no draft/expired/walk-in/remote counts, no pagination or filters on job management, no activity log, no content management.
- **Tooling:** 6 dev-dependency advisories in the frontend (esbuild, tinypool); production dependencies were clean.

## 2. Already present and kept
Candidate/recruiter/admin areas, applications and tracker, resume upload + AI check, career assistance queue, saved jobs, company directory from real data, password reset, SEO/sitemap, admin directory and approvals, rate limiting, security headers, migrations runner, 331 backend + ~70 frontend checks.

## 3. New features
- **Walk-in Drives** `/walk-in-drive`: Today / Upcoming / Recently announced tabs (counts), company + logo, role, venue and full address, interview date, reporting and interview time, salary, experience, fresher flag, documents, process, Google Maps directions, official registration link, share, status (Upcoming / Today / Ongoing / Expired). Filters: state, city, company, role/category, IT/Non-IT/Semi-IT, experience (fresher/experienced/bands), salary, interview date, education, verified. Drives expire automatically at the end of their last day (IST) and are never shown as active after that (list, detail, sitemap, search engines get 410).
- **Remote Jobs** `/remote-jobs`: only `work_mode=remote`; hiring region (India, Worldwide, USA, UK, Germany, Canada, Australia, Europe, Other), "Indian applicants eligible", "Worldwide applicants eligible", work-authorization required/not, time zone; job types (full-time, part-time, internship, freelance). Hybrid/office jobs can never appear. A city named "Remote"/"WFH" is rejected by validation.
- **All India Jobs** `/all-india-jobs`: all 28 states and 8 UTs, dynamic city search from real listings (+ optional geocoder), IT/Non-IT/Semi-IT, employer type (private/MNC/startup/government), categories (banking & finance, sales & marketing, operations, support, engineering, …), fresher/experienced. **Government jobs stay hidden until an admin verifies them with an official source.**
- **Shared search/filter engine** for Find Jobs, Internships, Fresher, Walk-in, Remote, All India: suggestions (titles, companies, skills, cities), URL-synced filters, active-filter chips, clear all, sorting, pagination, skeletons, empty/error states with recovery actions, mobile filter drawer.
- **Location system:** permission asked only on button press → reverse geocoding (coordinates rounded to ~1 km, never stored) → manual state/city search → All India / Remote – India / Remote – Worldwide → reset. Denial never blocks anything. A chosen place is a removable chip, not a hidden filter.
- **Trust & safety:** four honest labels (Verified by TechAbhi, Recruiter submitted, Awaiting verification, Reported opportunity); official source and company website; deadline; report-a-job dialog; auto-flag on independent reports; admin moderation queue; duplicate detection for admins and recruiters; scam warning.
- **Auth:** email OTP (candidates and recruiters), business-email rule + admin approval for recruiters, strength meter/confirm/show-hide, cookie sessions with rotation, logout-all, CSRF. See SECURITY.md.
- **Admin:** richer dashboard (total/published/draft/expired/walk-ins/remote/featured/awaiting verification/candidates/recruiters/pending approvals/applications/views/reports/recent activity); job management with search, status/type/mode/verification filters, pagination, publish/unpublish/close/delete-with-confirmation, feature, verify, copy link/message, preview, logo upload; structured job form (location, remote eligibility, walk-in section, salary currency/period, sources); reported-jobs queue; site content (announcements, homepage text/sections, contact details); recruiter list shows unverified emails and blocks approving them.
- **SEO:** page titles/descriptions/canonical/Open Graph/Twitter for the three new pages; richer `JobPosting` (remote = `TELECOMMUTE` + `applicantLocationRequirements` only when a country is real, structured address, salary currency/unit, logo, hiring organisation website); Organization data on company pages; sitemap with new pages and without closed jobs; closed jobs 410 + noindex. No ranking promises.

## 4. UI/UX
New navy/ink + marigold identity (white surfaces); distinct treatments: walk-in = rose "ticket" cards and dark rose hero, remote = teal, featured = amber edge/ribbon, internships = emerald, India = navy/marigold. Self-hosted Inter (no third-party font requests). Type scale: page headings 30–36 px, section 22–28, card headings 18–20, body 15–16, labels/meta 13 px; **nothing under 13 px** (enforced by a test and checked in the rendered DOM). Layout verified in headless Chromium at 320, 375, 425, 768, 1024, 1440 px on 20 pages: no horizontal overflow, mobile menu and filter drawer work, interactive controls are 44 px tall in the new components and none measured under 36 px in the mobile filter drawer (checkbox rows count their full 44 px label). axe-core (WCAG 2 A/AA) on 19 pages × 2 widths: **0 violations** after fixing contrast and list markup it found. Dialogs trap Escape, have labels and return focus; icons are `aria-hidden`; status is never colour-only.

## 5. Security improvements
See SECURITY.md for the full list and the remaining risks. Headlines: no tokens in localStorage; HttpOnly/Secure/SameSite cookies; refresh rotation with reuse detection; server-side revocation (logout, password change/reset, suspension); CSRF double-submit + Origin check; hashed 6-digit OTPs with attempt/expiry/cooldown/replay protection; strict ids; logo upload hardening (no SVG, byte sniffing); Permissions-Policy; production cookie flags verified.

## 6. Database changes
`backend/migrations/006_premium.sql` (additive; details and rollback in `docs/MIGRATIONS.md`): 34 new `jobs` columns + 8 indexes; `email_verified_at/_via` on candidates and recruiters; new tables `email_otps`, `auth_sessions`, `job_reports` (FK → jobs, unique per reporter), `admin_activity`, `announcements`, `site_settings`. Applied and checked fresh, repeated, baselined, and on a database with pre-existing data.

## 7–9. Tests, results, build
| Check | Result |
|---|---|
| Backend API/security suites (`backend/tests/run.sh`, MariaDB 10.11) | **562 passed, 0 failed, 0 skipped** across 9 suites (phase 1–4, 6, security: 334 incl. adapted; new: premium 141, auth 80, no-SMTP 7) |
| Frontend (`npm test`, Vitest, jsdom) | **106 passed, 0 failed** (70 pre-existing, adapted + 36 new) |
| Real browser (`e2e/browser-check.mjs`, headless Chromium) | **36 passed, 0 failed**, 0 console errors / failed requests / 5xx |
| axe-core WCAG 2 A/AA | **0 violations** (19 pages × 375 and 1440 px) |
| `npm run build` (frontend) | OK |
| `npm audit` and `npm audit --omit=dev` (backend and frontend) | **0 vulnerabilities** |
| Migration runner | fresh / re-run / baselined: OK |
Clean `npm ci` was verified for both packages.

**Existing tests I changed (not deleted), and why:** all suites now send `X-Auth-Mode: bearer` and create accounts through register + emailed code (new sign-up rule); test password `password123` became a stronger one (it is now on the common-password list); phase 2 fixture job got a city (on-site jobs now need one to publish); phase 6 re-logs in after a password reset (resets now sign out all sessions) and verifies a recruiter before approval (new rule); frontend tests assert cookie sessions instead of bearer headers, the new nav/filter wording, and the walk-in test now asserts the real feature instead of the absence of a fake one.

## 10. Remaining issues / not done
- **Not verifiable here:** real SMTP delivery, real Gemini, real Nominatim/LocationIQ (a mock Nominatim-shaped server and a local mail sink were used), MySQL 8 itself (MariaDB 10.11 was used), HTTPS `Secure` cookies end-to-end (headers verified), real phones and screen readers.
- Phone/SMS OTP and 2FA are **not** implemented (no provider; designed so it can be added). No CAPTCHA.
- Career-resource articles remain in code, not in the CMS. Static legal pages need legal review.
- There is no bundled national city database: city search is driven by real listings plus the geocoder.
- Rate limits are per-process (use a shared store when running several instances).
- Frontend build/test toolchain needs Node 22.12+ (Vite 8 / Vitest 5), which is how the dev-dependency advisories were cleared; the backend still runs on Node 20+.
- No "ongoing" label is shown for a one-day drive on its day (it says "Today"); multi-day drives say "Ongoing".

## 11. What you must configure
`JWT_SECRET`, DB credentials, **all `MAIL_*` values** (required for sign-up), `PUBLIC_URL`, `ADMIN_NOTIFICATION_EMAIL`; optional `GEMINI_API_KEY`; a geocoder (`GEOCODER_URL`/`GEOCODER_API_KEY`) for real traffic; persistent `UPLOAD_DIR`/`LOGO_DIR`; HTTPS reverse proxy forwarding `Host` and `X-Forwarded-For`. Then add real contact details in Admin → Site content.

## 12. Run it
See README.md ("Run locally") and DEPLOYMENT.md. Short version: create DB → `cd backend && cp .env.example .env && npm ci && npm run migrate && npm run create-admin -- you@example.com "passphrase" && npm run dev` → `cd frontend && npm ci && npm run dev`.
