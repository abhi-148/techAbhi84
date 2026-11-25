# TechAbhi – security notes

What follows describes what is **implemented and was tested** and what is **not**. No third-party penetration test or security certification has been performed. Treat this as a solid, reviewed baseline, not a guarantee.

Verified at delivery by: `backend/tests/run.sh` (562 API checks in 9 suites, including OTP, session, CSRF, authorization and injection checks), `frontend` `npm test` (106 UI checks), and `e2e/browser-check.mjs` (36 real-browser checks). `npm audit` and `npm audit --omit=dev`: **0 vulnerabilities** in both backend and frontend at delivery. Re-run before every deploy.

## Implemented controls

### Accounts, passwords, email verification
- Passwords: bcrypt (cost 12). Rules enforced on the server: 8–72 bytes, letters mixed with numbers/symbols, not a common password, not containing the email name. The UI shows a strength meter, confirm field and show/hide toggle. Login timing is equalised so unknown emails look like wrong passwords.
- **Email one-time codes** (candidates and recruiters): 6 digits from `crypto.randomInt`; only an HMAC (`OTP_SECRET`, or derived from `JWT_SECRET`) is stored; 5-minute expiry; 5 wrong guesses per code, counted atomically so parallel guesses cannot exceed it; single use (replay fails); issuing a new code invalidates older ones; 60-second resend cooldown; 6 codes/hour/account; per-IP rate limits on verify and resend; resend never reveals whether an account exists; codes never appear in API responses or logs (tested). Accounts cannot log in or use any protected route until verified (enforced per request, tested even with a validly signed token).
- Without SMTP the server answers 503 with a setup message. It never marks an email verified without a real code.
- Recruiters need a business email (free-mail domains blocked unless `RECRUITER_ALLOW_FREE_EMAIL=true`), verify it, and are approved by an admin before they can publish. An admin cannot approve an unverified email.
- Phone/SMS verification is **not implemented** (no provider). The OTP service is isolated so a real SMS channel can be added.
- Password reset: single-use hashed link (1 hour), generic responses, and it signs out every device. Changing a password signs out all other devices.

### Sessions and CSRF
- **No tokens in localStorage.** Sessions are HttpOnly cookies (`SameSite=Strict`, `Secure` in production): a short-lived (default 15 min) access JWT and an opaque refresh token. The refresh token is stored hashed, **rotates on every use**, and re-use of an old one revokes the whole session (theft response). Sessions are rows in `auth_sessions`, so logout, logout-everywhere, password change/reset and recruiter suspension take effect immediately (tested: a copied cookie dies at logout).
- Idle limit 14 days (candidates/recruiters), absolute 30 days; admins 8 h idle / 12 h absolute.
- CSRF: `Origin` check on every state-changing API call plus a double-submit token (`ta_csrf` cookie echoed in `X-CSRF-Token`) whenever a cookie session is used; sign-in style endpoints rely on the Origin check. Verified in a real browser and by tests (missing/wrong token, foreign origin).
- JWT HS256 only; `none`, wrong secret, expired, wrong-role and session-less tokens are rejected.
- API clients can opt into bearer tokens with `X-Auth-Mode: bearer` (used by the test suite). Set `ALLOW_BEARER_AUTH=false` if you have no such clients; browsers never use it.

### Authorization
- Three separate roles. A test enumerates the protected routes and checks each rejects missing and wrong-role tokens; admin endpoints (stats, jobs, reports, CMS, logos, verification) are tested with candidate tokens. Recruiters only touch their own jobs/applications (other recruiters get 404/403: IDOR tested, including logo upload). Drafts, closed jobs and unverified **government** jobs are never served publicly.

### Input, output, files
- Every query is parameterised; filters are whitelisted (SQL-injection payloads in `q`, `state`, `sort`, `remote_region` are tested). Mass assignment is blocked by field whitelists.
- React escapes output; server-rendered SEO tags are escaped and JSON-LD escapes `<`. External links are rendered only when http(s) with `rel="noopener noreferrer nofollow"`. Maps links must be Google domains. `?next=` redirects accept in-app paths only.
- Resumes: `%PDF-` check, ≤2 MB, random names outside any static folder, streamed only through authenticated endpoints.
- Company logos: PNG/JPEG/WebP only (**SVG refused**), content sniffed from the bytes, ≤512 KB, random file names, stored outside static folders, served only via `/api/jobs/:id/logo` with `nosniff`, a locked-down CSP and `Cross-Origin-Resource-Policy`. Draft jobs' logos are not public. Stored file names are never exposed.
- Location: coordinates are validated, rounded to ~1 km, used once, never stored or logged; results are cached by rounded cell only.

### HTTP
- Strict CSP (self only, no inline script, `frame-ancestors 'none'`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (geolocation only for this site), HSTS in production, no `X-Powered-By`, API responses `no-store` except public job data. CORS limited to `CORS_ORIGIN`. Fonts are self-hosted (no third-party requests).
- Rate limits: logins, registration, OTP verify/resend, forgot/reset, job reports, location lookup, suggestions, events, AI endpoints, plus a global per-IP limit. Limits are in memory (see risks).
- Body limits (JSON 200 KB, PDF 2 MB, logo 512 KB), malformed JSON → 400, generic 500s that never log SQL, tokens, codes or bodies.

### Trust and abuse
- Verification badges exist only after an admin verifies a listing (and requires an official source URL or company website). Recruiter edits remove a verified badge. Public reports are limited to one per person per job; several independent reports label the job "Reported opportunity"; admins review. Duplicate listings are detected. Admin actions are written to an audit log.

## Remaining risks and limitations
1. **Rate limits are per IP and in memory** – they reset on restart and are not shared across instances (use a Redis store for several). Set `trust proxy` to match your proxy chain. No CAPTCHA, no per-account lockout other than the OTP limits. Roughly 30 OTP guesses per hour per account are possible in the worst case (6 codes × 5 tries; chance ≈ 0.003%).
2. **No 2FA, no SMS verification.** Admin accounts have a password only; consider network restrictions for `/admin`. Admin passwords are reset with `npm run create-admin`.
3. **Legacy accounts** created before this upgrade were grandfathered as email-verified (`email_verified_via='legacy'`). Candidate sign-ups can still use throwaway inboxes; recruiter approval is manual.
4. **Bearer mode** (`ALLOW_BEARER_AUTH=true`) means a leaked bearer token works until it expires (15 min) or the session is revoked.
5. **Reports can be gamed** by several people at several IPs; the label is only a warning and admins decide. Analytics counters are inflatable.
6. Cookies are same-site by design: serve site and API from one origin (or sibling subdomains with `COOKIE_SAMESITE=lax`).
7. Resumes and logos are stored unencrypted on disk (and in backups). Use an encrypted volume; restrict backup access. No data-retention job exists.
8. PDF parsing happens in-process (size-capped); AI output is untrusted and re-validated but prompt injection is mitigated, not impossible.
9. CSP allows inline style attributes (React `style={{}}`), not inline scripts.
10. The frontend build/test toolchain requires Node 22.12+. Dev servers (`npm run dev`, `vitest --ui`) must not be exposed to an untrusted network.
11. **Not tested:** real SMTP/SMS/Gemini/geocoder providers (mocked or simulated), MySQL 8 specifically (tests ran on MariaDB 10.11), `Secure` cookies over real HTTPS (only the header was checked), load, accessibility with screen readers and real mobile devices (a headless Chromium at 320–1440 px was used), third-party penetration testing.

## Reporting
Publish a security mailbox in **Admin → Site content → Contact details** (field "Security / abuse email"); it is shown on the Contact page.
