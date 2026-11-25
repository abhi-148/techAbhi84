# Deployment checklist

## 1. Prerequisites
- Backend: Node 20+. Building the frontend needs Node 22.12+ (can be done in CI; the server only needs the built `dist`).
- MySQL 8 (or MariaDB 10.5+), HTTPS in front (nginx/Caddy/Cloudflare), a process manager (systemd/pm2/Docker).
- An SMTP account: **required**, new accounts verify by emailed code.
- A Google AI Studio key for Gemini (server-side only).

## 2. Database
```
CREATE DATABASE techabhi CHARACTER SET utf8mb4;
CREATE USER 'techabhi_app'@'%' IDENTIFIED BY '<long random password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON techabhi.* TO 'techabhi_app'@'%';   -- no DROP/ALTER/GRANT at runtime
```
**Back up first.** Create/upgrade the schema with `cd backend && npm run migrate` using an account that may CREATE/ALTER tables (a migration account, not the runtime app user). For a database you set up by hand, run `npm run migrate -- --baseline-through=00N` once instead. Details, safety notes and rollback: `docs/MIGRATIONS.md`. The runner also converts any non-utf8mb4 table. Turn on automated backups and test a restore.

## 3. Backend `.env` (never commit; never put in the frontend)
```
PORT=4000
DB_HOST=…  DB_USER=techabhi_app  DB_PASSWORD=…  DB_NAME=techabhi
JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
GEMINI_API_KEY=…            GEMINI_MODEL=gemini-2.5-flash
PUBLIC_URL=https://yourdomain.com      # used in sitemap/canonical/share links
CORS_ORIGIN=https://yourdomain.com     # same-origin deployments can leave empty
UPLOAD_DIR=/var/lib/techabhi/resumes   # outside the web root, mode 700, encrypted disk, backed up
DEFAULT_COUNTRY=IN
NODE_ENV=production
MAIL_HOST=…  MAIL_PORT=587  MAIL_SECURE=false  MAIL_USER=…  MAIL_PASS=…  MAIL_FROM="TechAbhi <no-reply@yourdomain.com>"   # REQUIRED: sign-up codes, password reset, notifications
ADMIN_NOTIFICATION_EMAIL=you@yourdomain.com   # told when a recruiter verifies their email and awaits approval
LOGO_DIR=/var/lib/techabhi/logos       # company logos; persistent, backed up, outside the web root
GEOCODER_URL=…  GEOCODER_API_KEY=…     # see below; default public OSM server is rate-limited
OTP_SECRET=<another random 48-byte hex>   # optional; otherwise derived from JWT_SECRET
```
Copy `backend/.env.example` as a starting point (every variable is documented there). `PUBLIC_URL` must be your real HTTPS domain: password-reset links, the sitemap **and the CSRF origin check** use it.
Create the first admin: `cd backend && npm ci --omit=dev && npm run create-admin -- you@domain "a-strong-passphrase"`.

## 4. Build and run
```
cd frontend && npm ci && npm run build        # produces frontend/dist
cd ../backend && node server.js                # serves API + dist + SEO tags + sitemap + robots
```
In production the server caches `index.html` at start: **restart it after every frontend build**.
The Express server serves the built SPA and injects per-job SEO tags, so route all traffic (including `/jobs/*`, `/sitemap.xml`, `/robots.txt`) to it. If you host the frontend elsewhere (CDN), job pages will NOT get server-rendered SEO tags.

## 5. Reverse proxy
- Terminate TLS; redirect HTTP→HTTPS; forward `Host` (or `X-Forwarded-Host`) and set `X-Forwarded-For`. Session cookies are `Secure` in production, so HTTPS is required for sign-in to work. The app uses `trust proxy = 1` (one proxy hop). Change it in `server.js` if you have more/less.
- Limit request size at the proxy too (e.g. `client_max_body_size 3m`).

## 5b. Email, cookies, location
- **SMTP / OTP:** after setting `MAIL_*`, open `https://yourdomain.com/api/auth/capabilities` (should show `"email_otp":true`), then register a test candidate and receive the code. Use a transactional provider (SES, Brevo, Mailgun) with SPF/DKIM so codes do not land in spam.
- **Cookies:** serve the site and API from the same origin (default). For sibling subdomains set `COOKIE_DOMAIN` and `COOKIE_SAMESITE=lax`. Never use `SameSite=None`.
- **Everyone signs in again** after the first deploy of this version (sessions moved from browser tokens to server-side cookies).
- **Location:** the default OpenStreetMap server allows ~1 request/second and requires an identifying `GEOCODER_USER_AGENT`. For production traffic run your own Nominatim or use a compatible provider and set `GEOCODER_URL`/`GEOCODER_API_KEY`. `GEOCODER_DISABLED=true` hides automatic detection.
- **Logos:** `LOGO_DIR` must persist across deploys and be included in backups.
- If you run several instances, move rate limiting to a shared store (Redis); sessions already live in the database.

## 6. Before launch
- [ ] `bash backend/tests/run.sh` and `cd frontend && npm test && npm run build` pass against a **test** database (never your production DB: the runner drops its database).
- [ ] `npm audit --omit=dev` is clean in both folders.
- [ ] Register a test candidate and recruiter on the real server and complete the emailed code; request a password reset and open the link.
- [ ] In Admin → Site content: add real contact details, then publish only real jobs. Verify listings only after checking the official source.
- [ ] Optional: `e2e/browser-check.mjs` against staging.
- [ ] Replace the placeholder email/addresses in Contact, Privacy and Terms; have Privacy/Terms/consent wording reviewed legally.
- [ ] Confirm `curl -I https://yourdomain.com` shows the CSP header and HTTPS redirect.
- [ ] Publish one real job; open `/jobs/<id>` with "view source": one `<title>`, one description, canonical and `JobPosting` JSON-LD present; test it in Google's Rich Results Test.
- [ ] Submit `https://yourdomain.com/sitemap.xml` in Google Search Console. Indexing and traffic are not guaranteed.
- [ ] Verify an unauthenticated request to `/api/admin/jobs` returns 401 and a draft job's URL returns 404.
- [ ] Decide retention periods for assistance data and old accounts; schedule a purge.
- [ ] Set up log shipping/alerts. Logs never contain SQL, tokens or request bodies; keep it that way.

## 7. Operating
- Rotate `JWT_SECRET` (logs everyone out) and the DB/Gemini credentials if they leak; rotate on staff changes.
- Review pending recruiters promptly (check website + domain email); suspend bad actors, which also closes their live jobs.
- Admins can read assistance requests while open; every view/packet is logged in `assistance_access_log`.
- Keep Node and dependencies patched; re-run the audit and the test suites after every upgrade.
