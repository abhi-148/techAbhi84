import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { checkPassword } from '../utils/auth.js';
import { revokeAll } from '../services/session.js';
import { passwordIssues } from '../utils/validate.js';

// Account settings + activity feeds for candidates and recruiters, and read-only directories for admins.
// Passwords are bcrypt-hashed (cost 12). sessions are server-side, so a password change signs out the other devices.

async function changePassword(table, role, id, sid, body, res) {
  const cur = String(body?.current_password || ''); const next = String(body?.new_password || '');
  const [[who]] = await pool.query(`SELECT email FROM ${table} WHERE id=?`, [id]);
  const issues = passwordIssues(next, { email: who?.email });
  if (issues.length) return res.status(400).json({ error: issues[0], details: issues });
  if (next === cur) return res.status(400).json({ error: 'Choose a password different from your current one.' });
  const [[row]] = await pool.query(`SELECT password_hash FROM ${table} WHERE id=?`, [id]);
  if (!row || !(await checkPassword(cur, row.password_hash))) return res.status(400).json({ error: 'Your current password is incorrect.' });
  await pool.query(`UPDATE ${table} SET password_hash=? WHERE id=?`, [await bcrypt.hash(next, 12), id]);
  await revokeAll(role, id, sid);   // every OTHER device is signed out; this one stays
  res.json({ ok: true });
}

const APP_TEXT = {
  new: 'Submitted. The recruiter has not reviewed it yet.', in_review: 'The recruiter is reviewing your application.', shortlisted: 'You were shortlisted.',
  interview: 'The recruiter moved you to the interview stage.', rejected: 'The recruiter closed this application.', hired: 'The recruiter marked you as hired.', withdrawn: 'You withdrew this application.',
};
const REQ_TEXT = { submitted: 'Your request was received.', in_review: 'The TechAbhi team is reviewing your request.', in_progress: 'Your request is in progress.', on_hold: 'Your request is on hold.', closed: 'Your request was closed.' };

export const candidateAccount = Router();
candidateAccount.post('/password', (req, res) => changePassword('candidates', 'candidate', req.user.id, req.user.sid, req.body, res));
candidateAccount.get('/activity', async (req, res) => {
  const id = req.user.id; const items = [];
  const [apps] = await pool.query(
    `SELECT s.id, s.status, s.updated_at, j.title, j.company FROM job_submissions s JOIN jobs j ON j.id=s.job_id WHERE s.candidate_id=? ORDER BY s.updated_at DESC LIMIT 20`, [id]);
  for (const a of apps) items.push({ kind: 'application', title: `${a.title}${a.company ? ` at ${a.company}` : ''}`, detail: APP_TEXT[a.status] || a.status, at: a.updated_at, link: '/candidate/applications' });
  const [reqs] = await pool.query('SELECT id, status, updated_at FROM assistance_requests WHERE candidate_id=? ORDER BY updated_at DESC LIMIT 5', [id]);
  for (const q of reqs) items.push({ kind: 'assistance', title: 'Career assistance', detail: REQ_TEXT[q.status] || q.status, at: q.updated_at, link: '/candidate/career-assistance' });
  const [props] = await pool.query(
    `SELECT o.company_name, o.updated_at FROM assistance_outreach o JOIN assistance_requests r ON r.id=o.request_id WHERE r.candidate_id=? AND o.status='proposed' ORDER BY o.updated_at DESC LIMIT 10`, [id]);
  for (const p of props) items.push({ kind: 'action', title: `Action needed: proposal for ${p.company_name}`, detail: 'Nothing is shared until you approve it.', at: p.updated_at, link: '/candidate/career-assistance', urgent: true });
  items.sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ items: items.slice(0, 30) });
});

export const recruiterAccount = Router();
recruiterAccount.post('/password', (req, res) => changePassword('recruiters', 'recruiter', req.recruiter.id, req.sid, req.body, res));
recruiterAccount.get('/activity', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.status, s.candidate_name, s.submitted_at, s.updated_at, s.viewed_at, j.title FROM job_submissions s JOIN jobs j ON j.id=s.job_id
     WHERE j.recruiter_id=? ORDER BY s.submitted_at DESC LIMIT 30`, [req.recruiter.id]);
  const items = rows.map((r) => ({
    kind: 'application', urgent: r.status === 'new' && !r.viewed_at, link: '/recruiter/applications', at: r.submitted_at,
    title: r.status === 'withdrawn' ? `An application for ${r.title} was withdrawn` : `New application for ${r.title}`,
    detail: r.status === 'withdrawn' ? 'The candidate withdrew it and their details were removed.' : `${r.candidate_name || 'A candidate'} applied${r.viewed_at ? '' : '. Not reviewed yet'}.`,
  }));
  res.json({ items });
});

// ---- admin directories (read-only) ----
export const adminDirectory = Router();
const pageOf = (req) => ({ limit: 20, page: Math.max(parseInt(req.query.page, 10) || 1, 1) });
const like = (s) => `%${String(s).replace(/[\\%_]/g, '\\$&').slice(0, 100)}%`;
adminDirectory.get('/candidates', async (req, res) => {
  const { limit, page } = pageOf(req); const where = ['1=1']; const p = [];
  if (req.query.q) { where.push('(c.full_name LIKE ? OR c.email LIKE ?)'); p.push(like(req.query.q), like(req.query.q)); }
  const w = where.join(' AND ');
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM candidates c WHERE ${w}`, p);
  const [rows] = await pool.query(
    `SELECT c.id, c.full_name, c.email, c.created_at,
       (SELECT COUNT(*) FROM job_submissions s WHERE s.candidate_id=c.id) applications,
       (SELECT COUNT(*) FROM saved_jobs v WHERE v.candidate_id=c.id) saved_jobs
     FROM candidates c WHERE ${w} ORDER BY c.created_at DESC, c.id DESC LIMIT ? OFFSET ?`, [...p, limit, (page - 1) * limit]);
  res.json({ candidates: rows, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});
adminDirectory.get('/applications', async (req, res) => {
  const { limit, page } = pageOf(req); const where = ['1=1']; const p = [];
  if (req.query.status && ['new', 'in_review', 'shortlisted', 'interview', 'rejected', 'hired', 'withdrawn'].includes(req.query.status)) { where.push('s.status=?'); p.push(req.query.status); }
  if (req.query.q) { where.push('(s.candidate_name LIKE ? OR s.candidate_email LIKE ? OR j.title LIKE ? OR j.company LIKE ?)'); const l = like(req.query.q); p.push(l, l, l, l); }
  const w = where.join(' AND ');
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM job_submissions s JOIN jobs j ON j.id=s.job_id WHERE ${w}`, p);
  const [rows] = await pool.query(
    `SELECT s.id, s.status, s.submitted_at, s.updated_at, s.candidate_name, s.candidate_email, j.id job_id, j.title, j.company
     FROM job_submissions s JOIN jobs j ON j.id=s.job_id WHERE ${w} ORDER BY s.submitted_at DESC, s.id DESC LIMIT ? OFFSET ?`, [...p, limit, (page - 1) * limit]);
  res.json({ applications: rows, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});
