import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

// Server-side sessions: a short-lived signed access token + a rotating opaque refresh token.
// Browsers get both in HttpOnly cookies (JavaScript can never read them). API clients may send
// `X-Auth-Mode: bearer` to receive the tokens in the JSON body instead (set ALLOW_BEARER_AUTH=false to turn that off).
export const ROLES = { candidate: 'candidates', recruiter: 'recruiters', admin: 'admin_users' };   // role -> account table (constants, never user input)
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const rand = (n = 32) => crypto.randomBytes(n).toString('hex');
const accessMin = () => Math.max(parseInt(process.env.ACCESS_TTL_MIN, 10) || 15, 1);
const IDLE_DAYS = { candidate: 14, recruiter: 14, admin: 0.33 };      // refresh token lifetime (slides on each refresh)
const ABS_DAYS = { candidate: 30, recruiter: 30, admin: 0.5 };       // hard cap from login
export const bearerAllowed = () => String(process.env.ALLOW_BEARER_AUTH ?? 'true').toLowerCase() !== 'false';
export const wantsBearer = (req) => bearerAllowed() && String(req.headers['x-auth-mode'] || '').toLowerCase() === 'bearer';

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('='); if (i < 1) continue;
    try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore malformed */ }
  }
  return out;
}
export const AT = (role) => `ta_at_${role}`;
export const RT = (role) => `ta_rt_${role}`;
export const CSRF = 'ta_csrf';

function cookie(req, name, value, { maxAgeSec, path = '/api', httpOnly = true }) {
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  const same = String(process.env.COOKIE_SAMESITE || 'strict').toLowerCase() === 'lax' ? 'Lax' : 'Strict';
  return [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `Max-Age=${maxAgeSec}`, `SameSite=${same}`, httpOnly && 'HttpOnly', secure && 'Secure', process.env.COOKIE_DOMAIN && `Domain=${process.env.COOKIE_DOMAIN}`].filter(Boolean).join('; ');
}
const addCookies = (res, list) => res.append('Set-Cookie', list);

export const signAccess = (role, id, sid) => jwt.sign({ sub: id, role, sid }, process.env.JWT_SECRET, { expiresIn: accessMin() * 60, algorithm: 'HS256' });

function setSessionCookies(req, res, role, access, refresh, refreshMaxAgeSec, csrf) {
  const list = [cookie(req, AT(role), access, { maxAgeSec: accessMin() * 60 }), cookie(req, RT(role), refresh, { maxAgeSec: refreshMaxAgeSec, path: '/api/auth' })];
  if (csrf) list.push(cookie(req, CSRF, csrf, { maxAgeSec: 30 * 86400, path: '/', httpOnly: false }));
  addCookies(res, list);
}
export function clearSessionCookies(req, res, role) {
  addCookies(res, [cookie(req, AT(role), '', { maxAgeSec: 0 }), cookie(req, RT(role), '', { maxAgeSec: 0, path: '/api/auth' })]);
}

/** Creates a session after a successful login/verification. Returns the body fields to merge into the response. */
export async function startSession(req, res, role, accountId) {
  const sid = rand(16); const refresh = rand(32);
  const idle = Math.round(IDLE_DAYS[role] * 86400); const abs = Math.round(ABS_DAYS[role] * 86400);
  await pool.query(
    'INSERT INTO auth_sessions (id, account_type, account_id, refresh_hash, user_agent, created_at, last_used_at, expires_at, absolute_expires_at) VALUES (?,?,?,?,?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP() + INTERVAL ? SECOND, UTC_TIMESTAMP() + INTERVAL ? SECOND)',
    [sid, role, accountId, sha(refresh), String(req.headers['user-agent'] || '').slice(0, 200) || null, idle, abs]);
  const access = signAccess(role, accountId, sid);
  if (wantsBearer(req)) return { token: access, refresh_token: refresh, expires_in: accessMin() * 60 };
  setSessionCookies(req, res, role, access, refresh, idle, parseCookies(req)[CSRF] || rand(24));
  return {};
}

/** Exchanges a refresh token for a new access token and a NEW refresh token. Re-use of an old refresh token revokes the session. */
export async function refreshSession(req, res, role) {
  const presented = wantsBearer(req) && req.body?.refresh_token ? String(req.body.refresh_token) : parseCookies(req)[RT(role)];
  if (!presented || !/^[a-f0-9]{64}$/.test(presented)) return null;
  const h = sha(presented);
  const [[s]] = await pool.query('SELECT id, account_id, refresh_hash, prev_refresh_hash, revoked_at, expires_at > UTC_TIMESTAMP() fresh, absolute_expires_at > UTC_TIMESTAMP() under_cap FROM auth_sessions WHERE account_type=? AND (refresh_hash=? OR prev_refresh_hash=?) LIMIT 1', [role, h, h]);
  if (!s || s.revoked_at) return null;
  if (s.refresh_hash !== h) { await revokeSession(s.id); clearSessionCookies(req, res, role); return null; }   // an already-used token came back: assume theft
  if (!s.fresh || !s.under_cap) return null;
  const [[acct]] = await pool.query(`SELECT id FROM ${ROLES[role]} WHERE id=?${role === 'admin' ? '' : ' AND email_verified_at IS NOT NULL'}`, [s.account_id]);
  if (!acct) { await revokeSession(s.id); return null; }
  const next = rand(32); const idle = Math.round(IDLE_DAYS[role] * 86400);
  const [upd] = await pool.query('UPDATE auth_sessions SET prev_refresh_hash=refresh_hash, refresh_hash=?, last_used_at=UTC_TIMESTAMP(), expires_at=LEAST(UTC_TIMESTAMP() + INTERVAL ? SECOND, absolute_expires_at) WHERE id=? AND refresh_hash=? AND revoked_at IS NULL', [sha(next), idle, s.id, h]);
  if (upd.affectedRows !== 1) return null;   // lost a race with another refresh of the same token
  const access = signAccess(role, s.account_id, s.id);
  if (wantsBearer(req)) return { id: s.account_id, token: access, refresh_token: next, expires_in: accessMin() * 60 };
  setSessionCookies(req, res, role, access, next, idle, null);
  return { id: s.account_id };
}

export const revokeSession = (sid) => pool.query('UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP() WHERE id=? AND revoked_at IS NULL', [sid]);
export const revokeAll = (role, accountId, exceptSid = null) => pool.query('UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP() WHERE account_type=? AND account_id=? AND revoked_at IS NULL AND id<>?', [role, accountId, exceptSid || '']);

/** Resolves the caller for a role from a Bearer header or the role's access cookie. Returns {id, sid, csrfRequired} or null. */
export async function authenticate(req, role) {
  const h = req.headers.authorization || '';
  const bearer = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (bearer && !bearerAllowed()) return null;
  const token = bearer || parseCookies(req)[AT(role)];
  if (!token) return null;
  let p;
  try { p = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); } catch { return null; }
  if (p.role !== role || !p.sid || typeof p.sid !== 'string') return null;
  const verified = role === 'admin' ? '' : ' AND a.email_verified_at IS NOT NULL';
  const [[ok]] = await pool.query(
    `SELECT 1 ok FROM auth_sessions s JOIN ${ROLES[role]} a ON a.id=s.account_id WHERE s.id=? AND s.account_type=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP() AND s.absolute_expires_at > UTC_TIMESTAMP()${verified}`,
    [p.sid, role, p.sub]);
  if (!ok) return null;
  return { id: p.sub, sid: p.sid, viaCookie: !bearer };
}
