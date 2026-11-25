import crypto from 'crypto';
import { parseCookies, CSRF } from '../services/session.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const hostOf = (u) => { try { return new URL(u).host; } catch { return null; } };
const same = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

/**
 * Cookie-based sessions need CSRF protection. Two independent checks on every state-changing /api request:
 *  1. Origin: when a browser sends Origin it must be this site (or an origin listed in CORS_ORIGIN / PUBLIC_URL).
 *  2. Double-submit token: if the request carries a session cookie (and no Bearer header) it must echo the ta_csrf cookie in X-CSRF-Token.
 * Cookies are also SameSite=Strict. Bearer-header requests are not CSRF-able (browsers never attach that header on their own).
 */
export function csrfGuard(req, res, next) {
  if (SAFE.has(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && origin !== 'null') {
    const allowed = new Set([...(process.env.CORS_ORIGIN || '').split(',').map((s) => hostOf(s.trim())), hostOf(process.env.PUBLIC_URL || ''), req.headers['x-forwarded-host'], req.headers.host].filter(Boolean));
    if (!allowed.has(hostOf(origin))) return res.status(403).json({ error: 'Request blocked (origin not allowed).' });
  } else if (origin === 'null') return res.status(403).json({ error: 'Request blocked (origin not allowed).' });
  // Sign-in / sign-up style calls never use an existing session, so they need the Origin check above but not the token (a stale cookie must not lock people out of logging in).
  if (/\/(login|register|otp\/verify|otp\/resend|forgot|reset)$/.test(req.path)) return next();
  const hasBearer = (req.headers.authorization || '').startsWith('Bearer ');
  const c = parseCookies(req);
  const hasSession = Object.keys(c).some((k) => k.startsWith('ta_at_') || k.startsWith('ta_rt_'));
  if (hasSession && !hasBearer) {
    const sent = req.headers['x-csrf-token'];
    if (!c[CSRF] || !sent || !same(sent, c[CSRF])) return res.status(403).json({ error: 'Security check failed. Refresh the page and try again.', code: 'CSRF' });
  }
  next();
}
