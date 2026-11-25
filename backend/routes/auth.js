import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { sendEmail, isEmailConfigured } from '../services/emailService.js';
import { issueOtp, verifyOtp, OTP_COOLDOWN_S } from '../services/otp.js';
import { startSession, refreshSession, revokeSession, revokeAll, clearSessionCookies, authenticate, parseCookies, RT, ROLES } from '../services/session.js';
import { notifyAdminNewRecruiter } from '../services/notify.js';
import { passwordIssues, emailOk } from '../utils/validate.js';
import { geocoderConfigured } from './locations.js';
import { baseUrl } from './seo.js';

// Email OTP, sessions (refresh / logout / who-am-I) and password reset for candidates and recruiters.
// Admin passwords are reset with `npm run create-admin`.
const r = Router();
const TABLE = { candidate: 'candidates', recruiter: 'recruiters' };
const TTL_MINUTES = 60;
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const GENERIC = 'If an account exists for that email, a reset link has been sent. It expires in 1 hour.';
const lim = (windowMin, max) => rateLimit({ windowMs: windowMin * 60 * 1000, max, standardHeaders: true, legacyHeaders: false });

// The UI uses this to show only what can truly work.
r.get('/capabilities', (req, res) => res.json({ password_reset: isEmailConfigured(), email_otp: isEmailConfigured(), phone_otp: false, geocoding: geocoderConfigured() }));

// ---- email one-time codes ----
r.post('/otp/resend', lim(15, 8), async (req, res) => {
  const type = req.body?.type; const email = String(req.body?.email || '').trim().toLowerCase();
  if (!TABLE[type] || !emailOk(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!isEmailConfigured()) return res.status(503).json({ error: 'Email verification is not set up on this server yet. The site owner must configure SMTP (MAIL_* settings).', code: 'EMAIL_NOT_CONFIGURED' });
  const [[a]] = await pool.query(`SELECT id, full_name, email_verified_at FROM ${TABLE[type]} WHERE email=?`, [email]);
  if (a && !a.email_verified_at) {
    try { await issueOtp({ type, id: a.id, email, name: a.full_name }); }
    catch (e) {
      if (e.code === 'EMAIL_SEND_FAILED') return res.status(502).json({ error: e.message, code: e.code });
      if (e.code !== 'OTP_COOLDOWN' && e.code !== 'OTP_HOURLY_LIMIT') throw e;   // cooldown / hourly cap stay silent: same answer as "no such account"
    }
  }
  res.json({ ok: true, message: 'If that account is waiting for verification, a new code is on its way.', resend_after: OTP_COOLDOWN_S });
});

r.post('/otp/verify', lim(15, 30), async (req, res) => {
  const type = req.body?.type; const email = String(req.body?.email || '').trim().toLowerCase();
  if (!TABLE[type] || !emailOk(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  const bad = { error: 'That code is invalid or has expired.', code: 'OTP_INVALID' };
  const [[a]] = await pool.query(`SELECT id, full_name${type === 'recruiter' ? ', company_name, status' : ''}, email_verified_at FROM ${TABLE[type]} WHERE email=?`, [email]);
  if (!a || a.email_verified_at) return res.status(400).json(bad);   // unknown, or already verified: same answer, nothing to guess
  const v = await verifyOtp({ type, id: a.id, code: req.body?.code });
  if (!v.ok) return res.status(v.reason === 'locked' ? 429 : 400).json(v.reason === 'locked' ? { error: 'Too many wrong codes. Ask for a new code.', code: 'OTP_LOCKED' } : v.reason === 'wrong' ? { ...bad, attempts_left: v.attempts_left } : bad);
  const [u] = await pool.query(`UPDATE ${TABLE[type]} SET email_verified_at=UTC_TIMESTAMP(), email_verified_via='otp' WHERE id=? AND email_verified_at IS NULL`, [a.id]);
  if (u.affectedRows !== 1) return res.status(400).json(bad);
  if (type === 'recruiter') notifyAdminNewRecruiter({ name: a.full_name, company: a.company_name, email });
  const s = await startSession(req, res, type, a.id);
  res.json({ ok: true, role: type, full_name: a.full_name, ...(type === 'recruiter' && { status: a.status }), ...s });
});

// ---- sessions ----
r.post('/refresh', lim(15, 120), async (req, res) => {
  const role = req.body?.role;
  if (!ROLES[role]) return res.status(400).json({ error: 'Invalid request.' });
  const out = await refreshSession(req, res, role);
  if (!out) { clearSessionCookies(req, res, role); return res.status(401).json({ error: 'Session expired. Please log in again.' }); }
  const { id, ...body } = out; res.json({ ok: true, ...body });
});

// One call tells the SPA which areas are signed in. If an access cookie has expired but the refresh cookie is valid, it renews silently.
r.get('/session', async (req, res) => {
  const out = { candidate: null, recruiter: null, admin: null };
  for (const role of Object.keys(ROLES)) {
    let a = await authenticate(req, role);
    if (!a && parseCookies(req)[RT(role)]) { const n = await refreshSession(req, res, role); if (n) a = { id: n.id }; }
    if (!a) continue;
    if (role === 'candidate') { const [[c]] = await pool.query('SELECT full_name, email FROM candidates WHERE id=?', [a.id]); out.candidate = c || null; }
    else if (role === 'recruiter') { const [[c]] = await pool.query('SELECT full_name, email, company_name, status FROM recruiters WHERE id=?', [a.id]); out.recruiter = c || null; }
    else { const [[c]] = await pool.query('SELECT email FROM admin_users WHERE id=?', [a.id]); out.admin = c || null; }
  }
  res.set('Cache-Control', 'no-store').json(out);
});

r.post('/logout', async (req, res) => {
  const roles = ROLES[req.body?.role] ? [req.body.role] : Object.keys(ROLES);
  for (const role of roles) {
    const a = await authenticate(req, role);
    let sid = a?.sid;
    if (!sid) { const t = parseCookies(req)[RT(role)]; if (t && /^[a-f0-9]{64}$/.test(t)) { const [[s]] = await pool.query('SELECT id FROM auth_sessions WHERE account_type=? AND (refresh_hash=? OR prev_refresh_hash=?) LIMIT 1', [role, hash(t), hash(t)]); sid = s?.id; } }
    if (sid) await revokeSession(sid);
    clearSessionCookies(req, res, role);
  }
  res.json({ ok: true });
});

r.post('/logout-all', async (req, res) => {
  const role = req.body?.role;
  if (!ROLES[role]) return res.status(400).json({ error: 'Invalid request.' });
  const a = await authenticate(req, role);
  if (!a) return res.status(401).json({ error: 'Session expired. Please log in again.' });
  await revokeAll(role, a.id);
  clearSessionCookies(req, res, role);
  res.json({ ok: true });
});

// ---- password reset (emailed single-use link) ----
r.post('/forgot', lim(15, 6), async (req, res) => {
  const type = req.body?.type;
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!TABLE[type]) return res.status(400).json({ error: 'Invalid request.' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!isEmailConfigured()) return res.status(503).json({ error: 'Password reset by email is not enabled on this server. Please contact support.' });
  res.json({ ok: true, message: GENERIC });   // same answer whether or not the account exists
  try {
    const [[acct]] = await pool.query(`SELECT id, full_name AS name FROM ${TABLE[type]} WHERE email=? AND email_verified_at IS NOT NULL`, [email]);
    if (!acct) return;
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('DELETE FROM password_resets WHERE account_type=? AND account_id=?', [type, acct.id]);   // newest link wins
    await pool.query('INSERT INTO password_resets (account_type, account_id, token_hash, expires_at) VALUES (?,?,?, UTC_TIMESTAMP() + INTERVAL ? MINUTE)', [type, acct.id, hash(token), TTL_MINUTES]);
    const link = `${baseUrl()}/reset-password?type=${type}&token=${token}`;
    await sendEmail({ to: email, subject: 'Reset your TechAbhi password', text: `Hi ${acct.name || ''},\n\nWe received a request to reset your TechAbhi password. Use this link within ${TTL_MINUTES} minutes:\n\n${link}\n\nIf you did not ask for this, ignore this email and your password will stay the same.` });
  } catch (e) { console.error('Password reset email failed:', e?.code || e?.name, String(e?.message).slice(0, 120)); }   // never log the token or link
});

r.post('/reset', lim(15, 15), async (req, res) => {
  const token = String(req.body?.token || '');
  const pw = String(req.body?.password || '');
  if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
  const [[row]] = await pool.query('SELECT id, account_type, account_id FROM password_resets WHERE token_hash=? AND expires_at > UTC_TIMESTAMP()', [hash(token)]);
  if (!row) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
  const [[acct]] = await pool.query(`SELECT email FROM ${TABLE[row.account_type]} WHERE id=?`, [row.account_id]);
  const issues = passwordIssues(pw, { email: acct?.email });
  if (issues.length) return res.status(400).json({ error: issues[0], details: issues });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE ${TABLE[row.account_type]} SET password_hash=? WHERE id=?`, [await bcrypt.hash(pw, 12), row.account_id]);
    await conn.query('DELETE FROM password_resets WHERE account_type=? AND account_id=?', [row.account_type, row.account_id]);   // single use
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  await revokeAll(row.account_type, row.account_id);   // a reset signs out every device
  res.json({ ok: true, type: row.account_type });
});

export default r;
