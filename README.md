# TechAbhi – job portal

A job and career platform: candidates search and filter jobs, save them and track applications; recruiters post jobs and manage applications; admins verify, publish and moderate. React + Vite + Tailwind on the front, Node/Express on the back, MySQL/MariaDB for data.

## What is in it

**Public site** – home (with admin-managed announcements and featured jobs); job search with URL-synced filters, suggestions, chips, sorting and pagination; **Walk-in Drives** (`/walk-in-drive`), **Remote Jobs** (`/remote-jobs`), **All India Jobs** (`/all-india-jobs`), Internships, Fresher Jobs; job pages with `JobPosting` structured data; company directory (built only from real live jobs and approved recruiters); career guides; resume services.
**Trust** – every listing carries one honest label: *Verified by TechAbhi* (an admin checked an official source), *Recruiter submitted*, *Awaiting verification* or *Reported opportunity*. Anyone can report a listing; several independent reports flag it. Duplicate listings are detected. Expired jobs and past walk-in drives disappear automatically.
**Location** – optional "use my current location" (permission asked only when pressed), manual city/state search, All India, Remote – India, Remote – Worldwide, and a reset button. Cities are searchable from real job data; all 28 states and 8 union territories are available.
**Candidates** – register with an emailed one-time code, login, password reset, profile, PDF resume + AI resume check, saved jobs, applications, career-assistance requests, notifications.
**Recruiters** – register with a company email (one-time code), admin approval before publishing, company profile, post/edit/publish/close jobs incl. walk-in drives and remote eligibility, logo upload, review applications.
**Admins** – dashboard (jobs, drafts, expired, walk-ins, remote, candidates, recruiters, pending approvals, applications, views, reports, recent activity), manage jobs (filters, pagination, verify, feature, publish/unpublish/close/delete with confirmation, logo upload, preview), reported-jobs queue, recruiter approvals, directories, assistance queue, **site content** (announcements, homepage text and sections, contact details).

Nothing in the UI is decorative: every control calls the real API. No fake jobs, companies, salaries, ratings or links are generated anywhere.

## Requirements
- **Backend:** Node 20+, MySQL 8 or MariaDB 10.5+, an SMTP account (needed for sign-up codes).
- **Frontend build and tests:** Node **22.12+** (Vite 8 / Vitest 5). Use `nvm install 22` if needed. The backend runs on Node 20+.
- Optional: Gemini API key (AI features), a geocoding provider for heavy "use my location" traffic.

## Run locally
```bash
# 1. database (utf8mb4)
mysql -u root -p -e "CREATE DATABASE techabhi CHARACTER SET utf8mb4; CREATE USER 'techabhi_app'@'localhost' IDENTIFIED BY 'choose-a-password'; GRANT ALL ON techabhi.* TO 'techabhi_app'@'localhost';"

# 2. backend
cd backend
cp .env.example .env            # edit: DB_*, JWT_SECRET and MAIL_* are required (see below)
npm ci
npm run migrate                 # creates/updates every table (tracked in schema_migrations)
npm run create-admin -- you@example.com "a-long-passphrase"
npm run dev                     # API on http://localhost:4000

# 3. frontend (second terminal)
cd frontend
npm ci
npm run dev                     # http://localhost:5173, proxies /api to the backend
```
For local development set `PUBLIC_URL=http://localhost:5173` in `backend/.env` so the CSRF origin check accepts the Vite dev server.

### SMTP / email one-time codes
Sign-up needs working email: every new candidate and recruiter must enter a 6-digit code sent to their address. Set all five `MAIL_*` values. Any SMTP service works (Gmail app password, Brevo, SES, Mailgun, your host). For local development you can run a catcher such as MailHog/Mailpit on port 1025 (`MAIL_HOST=localhost MAIL_PORT=1025`). If SMTP is missing, sign-up answers with a clear setup error (HTTP 503); it never pretends a code was sent. Check status at `GET /api/auth/capabilities`.
Codes: cryptographically random, stored only as an HMAC, valid 5 minutes, single use, 5 wrong guesses per code, 60-second resend cooldown, at most 6 codes per hour per account, older codes invalidated when a new one is sent.
Phone/SMS codes are **not** implemented (no provider is wired in); the verification service is isolated in `backend/services/otp.js` so an SMS channel can be added with a real provider later.

### Location services
`POST /api/locations/reverse` turns coordinates into city/state/country using a Nominatim-compatible geocoder (`GEOCODER_URL`). Coordinates are rounded to about 1 km, used for that single request, never stored or logged. The default public OpenStreetMap server is rate-limited (1 request/second); for production traffic run your own Nominatim or a compatible provider (LocationIQ etc., `GEOCODER_API_KEY`). Set `GEOCODER_DISABLED=true` to hide automatic detection.

### Databases that already exist
See `docs/MIGRATIONS.md`. In short: take a backup, then `npm run migrate` (or `npm run migrate -- --baseline-through=00N` if you created tables by hand). Migration 006 is additive and keeps all data; existing accounts are marked as verified (`legacy`) so nobody is locked out, and everyone has to sign in again once because sessions moved to server-side cookies.

## Production build
```bash
cd frontend && npm ci && npm run build        # writes frontend/dist
cd ../backend && NODE_ENV=production node server.js
```
The Express server serves `frontend/dist`, injects per-page SEO tags, and serves `/sitemap.xml` and `/robots.txt`. In production `index.html` is cached at startup, so **restart the server after every frontend build**. See `DEPLOYMENT.md` and `SECURITY.md`.

## Tests
```bash
cd backend && DB_USER=… DB_PASSWORD=… DB_NAME=techabhi_test MYSQL_CLI="mysql -u… -p…" npm test   # API + security suites (needs a throwaway DB: the runner DROPS it)
cd frontend && npm test                                                                          # UI tests (jsdom)
cd frontend && npm run build                                                                     # production build
cd backend && npm audit; npm audit --omit=dev                                                    # dependency audit (also frontend)
```
The backend runner starts a local mail sink and a mock geocoder, resets and re-migrates the database named in `DB_NAME`, and runs nine suites. **Never point it at real data.**
`e2e/browser-check.mjs` is an optional real-browser check (layout at six widths, sign-up with OTP, cookie flags, location flow); see the header of that file.

## Layout
```
backend/   server.js, routes/, middleware/ (auth, csrf), services/ (otp, session, mail, logo, AI), utils/, migrations/, scripts/, tests/
frontend/  src/pages, src/components (explorer/ = shared job-list engine), src/lib, src/__tests__
docs/      MIGRATIONS.md, UPGRADE_REPORT.md, PHASE_NOTES.md (history)
e2e/       optional browser check
```

## External configuration you still need
| Feature | Needs | Without it |
|---|---|---|
| Sign-up (OTP), password reset, notifications | all five `MAIL_*` values | sign-up shows a setup error; reset is hidden |
| "Use my location" at scale | own Nominatim or a provider key | public OSM server is used (rate-limited) |
| AI resume check, job-text parsing | `GEMINI_API_KEY` | those actions report they are unavailable |
| Correct canonical URLs, sitemap, reset links, CSRF origin check | `PUBLIC_URL` = your real domain | links point at localhost |
| HTTPS, backups, log shipping | your hosting | see `DEPLOYMENT.md` |

## Known gaps
- No SMS/phone verification and no 2FA. No CAPTCHA.
- Career-resource articles are still maintained in code (`frontend/src/data`); the CMS covers announcements, homepage, contact details and featured jobs.
- The city selector is driven by real listings plus the geocoder; there is no bundled national city database.
- Static pages (About, Privacy, Terms): have them reviewed by a lawyer before launch.
- Not tested: real Gemini calls, real SMTP providers, real Nominatim/LocationIQ (mocked), MySQL 8 specifically (tests ran on MariaDB 10.11), load/performance, third-party penetration testing. SEO rankings are never guaranteed.
