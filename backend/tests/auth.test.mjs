// Authentication: email OTP, sessions (HttpOnly cookies, rotation, revocation), CSRF, password rules, role separation.
import { execSync } from 'child_process'; import fs from 'fs'; import jwt from 'jsonwebtoken';
import { BEARER, otpFor, mailCount, mailsTo, sleep, candidate, STRONG } from './helpers.mjs';
const B = process.env.API_URL; const SECRET = process.env.JWT_SECRET; let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + x)); };
const sql = (q) => execSync(`${process.env.MYSQL_CLI} ${process.env.DB_NAME} -N -B -e ${JSON.stringify(q)}`).toString().trim();
// minimal browser: keeps cookies
const jar = () => { const c = {}; return { c,
  async f(p, { method = 'GET', body, headers = {}, csrf = true, origin } = {}) {
    const h = { ...headers }; if (body) h['Content-Type'] = 'application/json'; if (origin) h.Origin = origin;
    const ck = Object.entries(c).map(([k, v]) => `${k}=${v}`).join('; '); if (ck) h.Cookie = ck;
    if (csrf && c.ta_csrf && method !== 'GET') h['X-CSRF-Token'] = c.ta_csrf;
    const r = await fetch(B + p, { method, headers: h, body: body && JSON.stringify(body) });
    const raw = r.headers.getSetCookie(); for (const s of raw) { const [kv] = s.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i); const v = kv.slice(i + 1); if (/Max-Age=0/i.test(s) || v === '') delete c[k]; else c[k] = v; }
    let j = null; try { j = await r.json(); } catch { /* none */ } return { s: r.status, j, raw }; } }; };
const api = async (p, { method = 'GET', body, token, headers = {} } = {}) => { const h = { ...BEARER, ...headers, ...(token && { Authorization: 'Bearer ' + token }) }; if (body) h['Content-Type'] = 'application/json'; const r = await fetch(B + p, { method, headers: h, body: body && JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch { /* none */ } return { s: r.status, j }; };
const reg = (email, extra = {}) => api('/api/candidate/register', { method: 'POST', body: { email, full_name: 'Test User', password: STRONG, ...extra } });

// ---------- password rules ----------
let r = await reg('pw1@x.com', { password: 'abc' }); ok('short password rejected', r.s === 400);
r = await reg('pw1@x.com', { password: 'password123' }); ok('very common password rejected', r.s === 400 && /common/i.test(r.j.error));
r = await reg('pw1@x.com', { password: 'abcdefghij' }); ok('letters-only password rejected', r.s === 400);
r = await reg('maria.santos@x.com', { password: 'maria.santos99' }); ok('password containing the email name rejected', r.s === 400);
r = await reg('pw1@x.com', { password: 'a1'.repeat(40) }); ok('password over 72 bytes rejected (bcrypt limit)', r.s === 400);
r = await api('/api/recruiter/register', { method: 'POST', body: { email: 'boss@gmail.com', full_name: 'B', password: STRONG, company_name: 'Co' } }); ok('recruiter needs a business email (Gmail refused)', r.s === 400 && r.j.code === 'BUSINESS_EMAIL_REQUIRED');

// ---------- registration + OTP ----------
const em = 'otp1@x.com';
r = await reg(em); ok('register: no token, no session; verification required', r.s === 201 && r.j.needs_verification && !r.j.token && r.j.expires_in === 300, JSON.stringify(r.j));
const code1 = await otpFor(em);
ok('a 6-digit code was emailed', /^\d{6}$/.test(code1));
ok('API responses never contain the code', !JSON.stringify(r.j).includes(code1));
const mail = (await mailsTo(em))[0].raw; ok('email states the 5-minute expiry', /5 minutes/.test(mail));
ok('only a hash is stored (no plaintext code in the database)', sql(`SELECT COUNT(*) FROM email_otps WHERE code_hash='${code1}'`) === '0' && /^[a-f0-9]{64}$/.test(sql("SELECT code_hash FROM email_otps ORDER BY id DESC LIMIT 1")));
ok('the code is not in the server log', !fs.readFileSync('/tmp/techabhi-test-api.log', 'utf8').includes(code1));
r = await api('/api/candidate/login', { method: 'POST', body: { email: em, password: STRONG } }); ok('unverified account cannot log in (403, EMAIL_NOT_VERIFIED)', r.s === 403 && r.j.code === 'EMAIL_NOT_VERIFIED' && !r.j.token);
r = await api('/api/candidate/me', { token: jwt.sign({ sub: 1, role: 'candidate' }, SECRET) }); ok('token without a server session is refused', r.s === 401);
r = await api('/api/candidate/login', { method: 'POST', body: { email: em, password: 'wrong-Pass1' } }); ok('wrong password still 401', r.s === 401);

// wrong codes and the attempt limit
const wrong = code1 === '000000' ? '111111' : '000000';
r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: wrong } }); ok('wrong code: 400 with attempts left', r.s === 400 && r.j.attempts_left === 4);
r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: 'abcdef' } }); ok('non-numeric code rejected', r.s === 400);
for (let i = 0; i < 2; i++) await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: wrong } });
r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: wrong } }); ok('5th wrong guess locks the code', r.s === 429 && r.j.code === 'OTP_LOCKED', JSON.stringify(r.j));
r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: code1 } }); ok('after lock-out even the CORRECT code is refused', r.s === 400 || r.s === 429);
ok('account is still unverified after brute force', sql(`SELECT email_verified_at IS NULL FROM candidates WHERE email='${em}'`) === '1');

// resend cooldown + invalidation of the old code
const before = await mailCount(em);
r = await api('/api/auth/otp/resend', { method: 'POST', body: { type: 'candidate', email: em } }); await sleep(300);
ok('resend inside the cooldown answers 200 but sends nothing', r.s === 200 && (await mailCount(em)) === before);
await sleep(2300);
r = await api('/api/auth/otp/resend', { method: 'POST', body: { type: 'candidate', email: em } }); const code2 = await otpFor(em, { after: before });
ok('resend after the cooldown sends a NEW code', r.s === 200 && !!code2 && (await mailCount(em)) === before + 1);
r = await api('/api/auth/otp/resend', { method: 'POST', body: { type: 'candidate', email: 'ghost-never@x.com' } }); const r2 = await api('/api/auth/otp/resend', { method: 'POST', body: { type: 'candidate', email: em } });
ok('resend does not reveal whether an account exists', r.s === 200 && r2.s === 200 && r.j.message === r2.j.message);
if (code2 !== code1) { r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: code1 } }); ok('an older code stops working once a new one is issued', r.s === 400); }
// expiry
sql(`UPDATE email_otps SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE account_type='candidate' AND account_id=(SELECT id FROM candidates WHERE email='${em}')`);
r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: code2 } }); ok('expired code refused', r.s === 400 && r.j.code === 'OTP_INVALID');
await sleep(2300); const b3 = await mailCount(em); await api('/api/auth/otp/resend', { method: 'POST', body: { type: 'candidate', email: em } }); const code3 = await otpFor(em, { after: b3 });
// parallel brute force cannot exceed 5 guesses
const burst = await Promise.all(Array.from({ length: 25 }, (_, i) => api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: String(100000 + i) }, headers: { 'X-Forwarded-For': '8.8.' + i + '.1' } })));
const attempts = Number(sql("SELECT attempts FROM email_otps ORDER BY id DESC LIMIT 1"));
ok('25 parallel guesses count as at most 5 attempts', attempts <= 5 && burst.every((x) => x.s !== 200), String(attempts));
r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: code3 } }); ok('locked code stays locked', r.s !== 200);
await sleep(2300); const b4 = await mailCount(em); await api('/api/auth/otp/resend', { method: 'POST', body: { type: 'candidate', email: em } }); const code4 = await otpFor(em, { after: b4 });
r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: code4 } }); ok('correct code verifies the email and starts a session', r.s === 200 && !!r.j.token && !!r.j.refresh_token, JSON.stringify(r.j));
const tok = r.j.token;
r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: em, code: code4 } }); ok('replaying a used code fails', r.s === 400);
ok('verified timestamp recorded via otp', sql(`SELECT email_verified_via FROM candidates WHERE email='${em}'`) === 'otp');
r = await api('/api/candidate/me', { token: tok }); ok('verified user reaches protected routes', r.s === 200);
r = await api('/api/candidate/register', { method: 'POST', body: { email: em, full_name: 'T', password: STRONG } }); ok('a verified email cannot be registered again', r.s === 409);

// unverified re-registration may not hijack: ownership is only proven by the code
const em2 = 'otp2@x.com'; await reg(em2); const c2a = await otpFor(em2);
await sleep(2300); r = await reg(em2, { password: 'Another-Pass-77' }); ok('re-registering an unverified email replaces the details and sends a fresh code', r.s === 201 && r.j.needs_verification);
r = await api('/api/candidate/login', { method: 'POST', body: { email: em2, password: STRONG } }); ok('old password no longer valid for the replaced unverified account', r.s === 401);

// a session row for an unverified account is useless
const em3 = 'otp3@x.com'; await reg(em3); const id3 = sql(`SELECT id FROM candidates WHERE email='${em3}'`);
sql(`INSERT INTO auth_sessions (id, account_type, account_id, refresh_hash, created_at, last_used_at, expires_at, absolute_expires_at) VALUES ('${'a'.repeat(32)}','candidate',${id3},'${'b'.repeat(64)}',UTC_TIMESTAMP(),UTC_TIMESTAMP(),UTC_TIMESTAMP()+INTERVAL 1 DAY,UTC_TIMESTAMP()+INTERVAL 1 DAY)`);
r = await api('/api/candidate/me', { token: jwt.sign({ sub: Number(id3), role: 'candidate', sid: 'a'.repeat(32) }, SECRET, { expiresIn: 600 }) }); ok('even a validly signed token is refused while the email is unverified', r.s === 401);

// ---------- cookie sessions ----------
const br = jar(); await reg('ck@x.com'); const ckCode = await otpFor('ck@x.com');
r = await br.f('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: 'ck@x.com', code: ckCode } });
ok('browser verify: tokens are NOT in the JSON body', r.s === 200 && !r.j.token && !r.j.refresh_token);
const at = r.raw.find((s) => s.startsWith('ta_at_candidate=')), rt = r.raw.find((s) => s.startsWith('ta_rt_candidate=')), cs = r.raw.find((s) => s.startsWith('ta_csrf='));
ok('access cookie is HttpOnly + SameSite=Strict', /HttpOnly/i.test(at) && /SameSite=Strict/i.test(at) && /Path=\/api/.test(at), at);
ok('refresh cookie is HttpOnly and only sent to /api/auth', /HttpOnly/i.test(rt) && /Path=\/api\/auth/.test(rt));
ok('CSRF cookie is readable by the page (not HttpOnly)', !/HttpOnly/i.test(cs));
ok('access token lifetime is short', Number(at.match(/Max-Age=(\d+)/)[1]) <= 60 * 60 * 4);
r = await br.f('/api/candidate/me'); ok('cookie session works for GET', r.s === 200);
r = await br.f('/api/candidate/account/password', { method: 'POST', body: { current_password: STRONG, new_password: STRONG }, csrf: false }); ok('CSRF: state-changing request without the token is blocked', r.s === 403 && r.j.code === 'CSRF', JSON.stringify(r.j));
r = await br.f('/api/candidate/account/password', { method: 'POST', body: { current_password: STRONG, new_password: STRONG }, headers: { 'X-CSRF-Token': 'f'.repeat(48) }, csrf: false }); ok('CSRF: a wrong token is blocked', r.s === 403);
r = await br.f('/api/candidate/account/password', { method: 'POST', body: { current_password: STRONG, new_password: STRONG }, origin: 'https://evil.example' }); ok('CSRF: a foreign Origin is blocked even with a valid token', r.s === 403);
r = await br.f('/api/candidate/account/password', { method: 'POST', body: { current_password: STRONG, new_password: STRONG } }); ok('CSRF: valid token passes (reaches the real handler)', r.s === 400 && /different|same/i.test(r.j.error || ''), JSON.stringify(r.j));
r = await api('/api/auth/otp/resend', { method: 'POST', body: { type: 'candidate', email: 'x@x.com' }, headers: { Origin: 'https://evil.example' } }); ok('a login/signup style POST from a foreign origin is blocked', r.s === 403);
r = await br.f('/api/auth/session'); ok('session probe reports who is signed in, and only for this browser', r.j.candidate?.email === 'ck@x.com' && r.j.recruiter === null && r.j.admin === null);
const oldRefresh = br.c.ta_rt_candidate, oldAccess = br.c.ta_at_candidate;
await sleep(1100); r = await br.f('/api/auth/refresh', { method: 'POST', body: { role: 'candidate' } }); ok('refresh issues a new access AND a new refresh token (rotation)', r.s === 200 && br.c.ta_rt_candidate !== oldRefresh && br.c.ta_at_candidate !== oldAccess);
const rotated = br.c.ta_rt_candidate;
const thief = jar(); thief.c.ta_rt_candidate = oldRefresh; thief.c.ta_csrf = 'x'.repeat(40);
r = await thief.f('/api/auth/refresh', { method: 'POST', body: { role: 'candidate' } }); ok('re-using an old refresh token is refused', r.s === 401);
r = await br.f('/api/candidate/me'); ok('...and it burns the whole session (theft response)', r.s === 401);
br.c.ta_rt_candidate = rotated; r = await br.f('/api/auth/refresh', { method: 'POST', body: { role: 'candidate' } }); ok('the rotated token is dead too', r.s === 401);

// fresh login in cookie mode, then silent renewal after the access token expires
const b2 = jar();
r = await b2.f('/api/candidate/login', { method: 'POST', body: { email: 'ck@x.com', password: STRONG } }); ok('cookie login sets cookies, no token in body', r.s === 200 && !r.j.token && !!b2.c.ta_at_candidate);
delete b2.c.ta_at_candidate;   // simulate the 15-minute access cookie expiring
r = await b2.f('/api/auth/session'); ok('expired access cookie is renewed silently from the refresh cookie', r.j.candidate?.email === 'ck@x.com' && !!b2.c.ta_at_candidate);
r = await b2.f('/api/auth/logout', { method: 'POST', body: { role: 'candidate' } }); const stale = jar(); 
ok('logout clears the cookies', r.s === 200 && !b2.c.ta_at_candidate && !b2.c.ta_rt_candidate);
const b3j = jar(); await b3j.f('/api/candidate/login', { method: 'POST', body: { email: 'ck@x.com', password: STRONG } }); const savedAccess = b3j.c.ta_at_candidate;
await b3j.f('/api/auth/logout', { method: 'POST', body: { role: 'candidate' } });
stale.c.ta_at_candidate = savedAccess; r = await stale.f('/api/candidate/me'); ok('server-side invalidation: a copied access cookie dies at logout', r.s === 401);

// logout everywhere / role separation / forged tokens
const d1 = jar(), d2 = jar(); await d1.f('/api/candidate/login', { method: 'POST', body: { email: 'ck@x.com', password: STRONG } }); await d2.f('/api/candidate/login', { method: 'POST', body: { email: 'ck@x.com', password: STRONG } });
r = await d1.f('/api/auth/logout-all', { method: 'POST', body: { role: 'candidate' } }); ok('logout-all succeeds', r.s === 200);
const stale2 = jar(); stale2.c.ta_at_candidate = d2.c.ta_at_candidate; r = await stale2.f('/api/candidate/me'); ok('logout-all ends the session on the other device', r.s === 401);
const t1 = (await api('/api/candidate/login', { method: 'POST', body: { email: 'ck@x.com', password: STRONG } })).j.token, t2 = (await api('/api/candidate/login', { method: 'POST', body: { email: 'ck@x.com', password: STRONG } })).j.token;
r = await api('/api/candidate/account/password', { method: 'POST', token: t1, body: { current_password: STRONG, new_password: 'Brand-New-Pass-5' } }); ok('changing the password works', r.s === 200);
ok('...and signs out the OTHER devices but not this one', (await api('/api/candidate/me', { token: t2 })).s === 401 && (await api('/api/candidate/me', { token: t1 })).s === 200);
const sidOf = (t) => jwt.decode(t).sid;
const expired = jwt.sign({ sub: jwt.decode(t1).sub, role: 'candidate', sid: sidOf(t1) }, SECRET, { expiresIn: -10 });
ok('expired access token refused', (await api('/api/candidate/me', { token: expired })).s === 401);
ok('wrong-role token refused on a candidate route', (await api('/api/candidate/me', { token: jwt.sign({ sub: jwt.decode(t1).sub, role: 'recruiter', sid: sidOf(t1) }, SECRET) })).s === 401);
ok('token signed with another secret refused', (await api('/api/candidate/me', { token: jwt.sign({ sub: 1, role: 'candidate', sid: sidOf(t1) }, 'x'.repeat(40)) })).s === 401);
const noneTok = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: 1, role: 'admin', sid: sidOf(t1) })).toString('base64url') + '.';
ok('alg=none token refused on admin routes', (await api('/api/admin/stats', { token: noneTok })).s === 401);
ok('candidate token cannot open recruiter or admin areas', (await api('/api/recruiter/me', { token: t1 })).s === 401 && (await api('/api/admin/stats', { token: t1 })).s === 401);

// ---------- recruiter ----------
r = await api('/api/recruiter/register', { method: 'POST', body: { email: 'hr@acme-auth.com', full_name: 'HR', password: STRONG, company_name: 'AcmeAuth', company_website: 'https://acme-auth.example' } });
ok('recruiter registers with a business email: pending + verification needed', r.s === 201 && r.j.status === 'pending' && r.j.needs_verification && !r.j.token);
r = await api('/api/recruiter/login', { method: 'POST', body: { email: 'hr@acme-auth.com', password: STRONG } }); ok('unverified recruiter cannot log in', r.s === 403 && r.j.code === 'EMAIL_NOT_VERIFIED');
const rc = await otpFor('hr@acme-auth.com');
r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'recruiter', email: 'hr@acme-auth.com', code: rc } }); ok('recruiter verifies by OTP and is still PENDING admin approval', r.s === 200 && r.j.status === 'pending');
const RT = r.j.token;
r = await api('/api/recruiter/jobs', { method: 'POST', token: RT, body: { title: 'Dev', description: 'd' } }); ok('pending recruiter cannot post jobs (admin approval required)', r.s === 403);
r = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: 'hr@acme-auth.com', code: rc } }); ok('a code is only valid for its own account type', r.s === 400);
const A = (await api('/api/admin/login', { method: 'POST', body: { email: 'admin@test.com', password: 'longpassword123' } })).j.token;
const rid = sql("SELECT id FROM recruiters WHERE email='hr@acme-auth.com'");
await api(`/api/admin/recruiters/${rid}/status`, { method: 'POST', token: A, body: { status: 'approved' } });
r = await api('/api/recruiter/jobs', { method: 'POST', token: RT, body: { title: 'Auth Dev', description: 'd'.repeat(40), work_mode: 'remote', remote_region: 'india', application_email: 'hr@acme-auth.com' } });
ok('after approval the recruiter can create a job, labelled "Recruiter submitted"', r.s === 201 && r.j.job.verification_status === 'recruiter_submitted', JSON.stringify(r.j));
const recJob = r.j.job.id;
r = await api('/api/recruiter/jobs', { method: 'POST', token: RT, body: { title: 'Auth Dev', description: 'd'.repeat(40), work_mode: 'remote', remote_region: 'india', application_email: 'hr@acme-auth.com' } }); ok('recruiter duplicate detected', r.s === 409 && r.j.code === 'DUPLICATE');
r = await api(`/api/recruiter/jobs/${recJob}`, { method: 'PUT', token: RT, body: { title: 'Auth Dev', description: 'd'.repeat(40) + ' updated', work_mode: 'remote', remote_region: 'india', application_email: 'hr@acme-auth.com' } }); ok('recruiter can edit own job', r.s === 200);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 2)]);
let lr = await fetch(B + `/api/recruiter/jobs/${recJob}/logo`, { method: 'POST', headers: { ...BEARER, Authorization: 'Bearer ' + RT, 'Content-Type': 'image/png' }, body: PNG }); ok('recruiter uploads a logo for their own job', lr.status === 200);
const RT2 = await (async () => { await api('/api/recruiter/register', { method: 'POST', body: { email: 'hr@other-co.com', full_name: 'HR2', password: STRONG, company_name: 'OtherCo' } }); const c = await otpFor('hr@other-co.com'); return (await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'recruiter', email: 'hr@other-co.com', code: c } })).j.token; })();
lr = await fetch(B + `/api/recruiter/jobs/${recJob}/logo`, { method: 'POST', headers: { ...BEARER, Authorization: 'Bearer ' + RT2, 'Content-Type': 'image/png' }, body: PNG }); ok('another recruiter cannot touch this job (IDOR)', lr.status === 404 || lr.status === 403);
r = await api('/api/auth/capabilities'); ok('capabilities: email OTP on, phone OTP honestly off', r.j.email_otp === true && r.j.phone_otp === false);

// ---------- admin session ----------
const ab = jar(); r = await ab.f('/api/admin/login', { method: 'POST', body: { email: 'admin@test.com', password: 'longpassword123' } });
ok('admin login uses HttpOnly cookies too', r.s === 200 && !r.j.token && !!ab.c.ta_at_admin);
r = await ab.f('/api/admin/stats'); ok('admin session works', r.s === 200);
r = await ab.f('/api/admin/jobs/1/feature', { method: 'POST', body: { featured: true }, csrf: false }); ok('admin writes need the CSRF token', r.s === 403);
r = await api('/api/admin/login', { method: 'POST', body: { email: 'admin@test.com', password: 'nope-nope-nope' } }); ok('admin wrong password 401', r.s === 401);
// the per-IP limiter is a second wall in front of the per-code limit
let limited = 0; for (let i = 0; i < 40; i++) { const x = await api('/api/auth/otp/verify', { method: 'POST', body: { type: 'candidate', email: 'nobody@x.com', code: '123456' }, headers: { 'X-Forwarded-For': '7.7.7.7' } }); if (x.s === 429) limited++; }
ok('OTP verification is rate limited per IP', limited > 0, String(limited));
console.log(`\n${pass} passed, ${fail} failed`);
