import { pool } from '../db.js';
import { authenticate } from '../services/session.js';

// Identity comes only from a verified, unexpired, unrevoked session. Role is checked against the token AND the session row.
export async function requireAdmin(req, res, next) {
  const a = await authenticate(req, 'admin');
  if (!a) return res.status(401).json({ error: 'Invalid or expired token' });
  req.admin = { sub: a.id, role: 'admin', sid: a.sid };
  next();
}

export async function requireCandidate(req, res, next) {
  const a = await authenticate(req, 'candidate');
  if (!a) return res.status(401).json({ error: 'Session expired. Please log in again.' });
  req.user = { id: a.id, sid: a.sid };
  next();
}

// Recruiter status is re-read from the DB on every request, so an admin suspending someone takes effect immediately.
export async function requireRecruiter(req, res, next) {
  const a = await authenticate(req, 'recruiter');
  if (!a) return res.status(401).json({ error: 'Session expired. Please log in again.' });
  const [[rec]] = await pool.query('SELECT id,email,full_name,phone,company_name,company_website,company_description,status,status_reason FROM recruiters WHERE id=?', [a.id]);
  if (!rec) return res.status(401).json({ error: 'Account not found' });
  req.recruiter = rec; req.sid = a.sid;
  next();
}
export function requireApproved(req, res, next) {
  if (req.recruiter.status !== 'approved') return res.status(403).json({ error: `Your recruiter account is ${req.recruiter.status}.`, status: req.recruiter.status });
  next();
}
