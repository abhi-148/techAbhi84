import express, { Router } from 'express';
import { checkPassword } from '../utils/auth.js';
import { startSession } from '../services/session.js';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { sanitizeJob, publishErrors, serialize } from '../utils/job.js';
import { parseJobText } from '../services/gemini.js';
import { saveLogo, removeLogo, MAX_LOGO_BYTES } from '../services/logo.js';
import { logActivity } from '../services/activity.js';

const r = Router();
export const COLS = ['title','company','category','location','work_mode','employment_type','experience','salary','salary_min','salary_max','openings','education','description','responsibilities','requirements','eligibility','benefits','skills','application_url','application_email','application_instructions','expires_at',
  'job_kind','sector','employer_type','country','state','city','address','remote_region','remote_country','timezone_requirement','work_authorization_required','fresher_eligible','experience_min_years','experience_max_years','salary_currency','salary_period',
  'company_website','source_url','drive_date','drive_end_date','reporting_time','interview_time','venue','venue_address','maps_url','interview_process','documents_required','dedupe_key'];
const JSONCOLS = new Set(['responsibilities', 'requirements', 'benefits', 'skills', 'interview_process', 'documents_required']);
export const dbVal = (c, v) => (JSONCOLS.has(c) ? JSON.stringify(v ?? []) : v ?? null);
const EXPIRED = "(status='published' AND expires_at IS NOT NULL AND expires_at <= UTC_TIMESTAMP())";
const LIVE = "(status='published' AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP()))";
const esc = (s) => String(s).slice(0, 100).replace(/[%_\\]/g, '\\$&');
export const logoBody = express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: MAX_LOGO_BYTES + 1024 });

/** Jobs that look like the one being saved (same title + company + place/date). */
export async function findDuplicates(dedupeKey, excludeId = 0) {
  const [rows] = await pool.query("SELECT id, title, company, status FROM jobs WHERE dedupe_key=? AND id<>? AND status<>'closed' LIMIT 5", [dedupeKey, excludeId]);
  return rows;
}
/** Shared by admin and recruiter routes: store an uploaded logo for a job. */
export async function setJobLogo(id, buf) {
  const saved = saveLogo(buf);
  if (saved.error) return { error: saved.error };
  const [[old]] = await pool.query('SELECT logo_file FROM jobs WHERE id=?', [id]);
  await pool.query('UPDATE jobs SET logo_file=? WHERE id=?', [saved.name, id]);
  if (old?.logo_file) removeLogo(old.logo_file);
  return { ok: true };
}

r.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const [[admin]] = await pool.query('SELECT id,email,password_hash FROM admin_users WHERE email=?', [email]);
  const ok = await checkPassword(password, admin?.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
  await logActivity(admin.id, 'login', 'admin', admin.id);
  res.json({ email: admin.email, ...(await startSession(req, res, 'admin', admin.id)) });
});

r.use(requireAdmin);

r.get('/me', (req, res) => res.json({ ok: true }));

r.get('/stats', async (req, res) => {
  const [[s]] = await pool.query(`SELECT COUNT(*) total,
    COALESCE(SUM(${LIVE}),0) published,
    COALESCE(SUM(status='draft'),0) draft, COALESCE(SUM(status='closed'),0) closed,
    COALESCE(SUM(${EXPIRED}),0) expired,
    COALESCE(SUM(${LIVE} AND job_kind='walk_in'),0) walk_ins,
    COALESCE(SUM(${LIVE} AND work_mode='remote'),0) remote,
    COALESCE(SUM(${LIVE} AND featured=1),0) featured,
    COALESCE(SUM(${LIVE} AND verification_status='verified'),0) verified,
    COALESCE(SUM(${LIVE} AND verification_status IN ('awaiting','recruiter_submitted')),0) awaiting_verification FROM jobs`);
  const [ev] = await pool.query('SELECT event_type, COUNT(*) c FROM job_events GROUP BY event_type');
  const e = Object.fromEntries(ev.map((x) => [x.event_type, Number(x.c)]));
  const [[cc]] = await pool.query('SELECT COUNT(*) n FROM candidates');
  const [[rc]] = await pool.query('SELECT COUNT(*) n FROM recruiters');
  const [[ta]] = await pool.query('SELECT COUNT(*) n FROM job_applications');
  const [[sa]] = await pool.query("SELECT COUNT(*) n FROM job_submissions WHERE status<>'withdrawn'");
  const [[pr]] = await pool.query("SELECT COUNT(*) n FROM recruiters WHERE status='pending' AND email_verified_at IS NOT NULL");
  const [[oa]] = await pool.query("SELECT COUNT(*) n FROM assistance_requests WHERE status='submitted'");
  const [[rep]] = await pool.query("SELECT COUNT(*) n FROM job_reports WHERE status='open'");
  const [latest] = await pool.query("SELECT id,title,company,published_at FROM jobs WHERE status='published' ORDER BY published_at DESC LIMIT 5");
  const [activity] = await pool.query('SELECT a.id, a.action, a.entity, a.entity_id, a.detail, a.created_at, u.email admin_email FROM admin_activity a LEFT JOIN admin_users u ON u.id=a.admin_id ORDER BY a.id DESC LIMIT 12');
  res.json({
    total: Number(s.total), published: Number(s.published), draft: Number(s.draft), closed: Number(s.closed), expired: Number(s.expired),
    walk_ins: Number(s.walk_ins), remote: Number(s.remote), featured: Number(s.featured), verified: Number(s.verified), awaiting_verification: Number(s.awaiting_verification),
    candidates: Number(cc.n), recruiters: Number(rc.n), pending_recruiters: Number(pr.n), new_assistance_requests: Number(oa.n), open_reports: Number(rep.n),
    tracked_applications: Number(ta.n), applications: Number(sa.n) + Number(ta.n), views: e.view || 0, apply_clicks: e.apply_click || 0, shares: e.share || 0, latest, activity,
  });
});

r.get('/jobs', async (req, res) => {
  const where = []; const p = [];
  const { status, q, kind, work_mode, verification, featured, category } = req.query;
  if (status === 'expired') where.push(EXPIRED);
  else if (['draft', 'published', 'closed'].includes(status)) { where.push('status=?'); p.push(status); }
  if (['walk_in', 'standard'].includes(kind)) { where.push('job_kind=?'); p.push(kind); }
  if (['onsite', 'remote', 'hybrid'].includes(work_mode)) { where.push('work_mode=?'); p.push(work_mode); }
  if (['awaiting', 'recruiter_submitted', 'verified', 'reported'].includes(verification)) { where.push('verification_status=?'); p.push(verification); }
  if (featured === '1') where.push('featured=1');
  if (category) { where.push('category=?'); p.push(String(category).slice(0, 100)); }
  if (q) { const l = `%${esc(q)}%`; where.push('(title LIKE ? OR company LIKE ?)'); p.push(l, l); }
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM jobs ${w}`, p);
  const [rows] = await pool.query(`SELECT * FROM jobs ${w} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`, [...p, limit, (page - 1) * limit]);
  res.json({ jobs: rows.map(serialize), total: Number(total), page, pages: Math.max(Math.ceil(total / limit), 1) });
});

r.post('/jobs/parse', rateLimit({ windowMs: 60 * 1000, max: 10 }), async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (text.length < 30) return res.status(400).json({ error: 'Paste the full job description (at least 30 characters).' });
  if (text.length > 30000) return res.status(400).json({ error: 'Text too long (max 30,000 characters).' });
  try { res.json(await parseJobText(text)); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

r.get('/jobs/:id', async (req, res) => {
  const [[row]] = await pool.query('SELECT * FROM jobs WHERE id=?', [parseInt(req.params.id, 10) || 0]);
  if (!row) return res.status(404).json({ error: 'Job not found' });
  res.json({ job: serialize(row) });
});

// Always creates a DRAFT. Publishing is a separate, explicit action.
r.post('/jobs', async (req, res) => {
  const { value, errors } = sanitizeJob(req.body);
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
  if (!req.body?.allow_duplicate) {
    const dups = await findDuplicates(value.dedupe_key);
    if (dups.length) return res.status(409).json({ error: 'This looks like a job that already exists.', code: 'DUPLICATE', duplicates: dups });
  }
  const [out] = await pool.query(`INSERT INTO jobs (${COLS.join(',')},status) VALUES (${COLS.map(() => '?').join(',')},'draft')`, COLS.map((c) => dbVal(c, value[c])));
  const [[row]] = await pool.query('SELECT * FROM jobs WHERE id=?', [out.insertId]);
  await logActivity(req.admin.sub, 'create', 'job', out.insertId, value.title);
  res.status(201).json({ job: serialize(row) });
});

r.put('/jobs/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const { value, errors } = sanitizeJob(req.body);
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
  const [[cur]] = await pool.query('SELECT status, recruiter_id FROM jobs WHERE id=?', [id]);
  if (!cur) return res.status(404).json({ error: 'Job not found' });
  if (cur.status === 'published') {
    const pe = publishErrors(value, { internal: !!cur.recruiter_id });
    if (pe.length) return res.status(400).json({ error: 'A published job must stay complete', details: pe });
  }
  if (!req.body?.allow_duplicate) {
    const dups = await findDuplicates(value.dedupe_key, id);
    if (dups.length) return res.status(409).json({ error: 'This looks like a job that already exists.', code: 'DUPLICATE', duplicates: dups });
  }
  await pool.query(`UPDATE jobs SET ${COLS.map((c) => c + '=?').join(',')} WHERE id=?`, [...COLS.map((c) => dbVal(c, value[c])), id]);
  const [[row]] = await pool.query('SELECT * FROM jobs WHERE id=?', [id]);
  await logActivity(req.admin.sub, 'update', 'job', id, value.title);
  res.json({ job: serialize(row) });
});

r.post('/jobs/:id/status', async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const status = req.body?.status;
  if (!['draft', 'published', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const [[row]] = await pool.query('SELECT * FROM jobs WHERE id=?', [id]);
  if (!row) return res.status(404).json({ error: 'Job not found' });
  const job = serialize(row);
  if (status === 'published') {
    const pe = publishErrors(job, { internal: !!job.recruiter_id });
    if (pe.length) return res.status(400).json({ error: 'Cannot publish yet', details: pe });
    if (job.expires_at && new Date(job.expires_at) <= new Date()) return res.status(400).json({ error: 'Expiry date has passed. Edit or clear it before publishing/reopening.' });
  }
  await pool.query("UPDATE jobs SET status=?, published_at = CASE WHEN ?='published' AND published_at IS NULL THEN UTC_TIMESTAMP() ELSE published_at END WHERE id=?", [status, status, id]);
  const [[out]] = await pool.query('SELECT * FROM jobs WHERE id=?', [id]);
  await logActivity(req.admin.sub, status === 'published' ? 'publish' : status === 'closed' ? 'close' : 'unpublish', 'job', id, row.title);
  res.json({ job: serialize(out) });
});

// A badge is only shown after an admin actually verifies the listing.
r.post('/jobs/:id/verify', async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const [[row]] = await pool.query('SELECT recruiter_id, title, source_url, company_website FROM jobs WHERE id=?', [id]);
  if (!row) return res.status(404).json({ error: 'Job not found' });
  if (req.body?.verified === false) {
    await pool.query("UPDATE jobs SET verification_status=?, verified_at=NULL, verified_by=NULL WHERE id=?", [row.recruiter_id ? 'recruiter_submitted' : 'awaiting', id]);
  } else {
    if (!row.source_url && !row.company_website) return res.status(400).json({ error: 'Add the official source URL or company website before verifying, so the badge means something.' });
    await pool.query("UPDATE jobs SET verification_status='verified', verified_at=UTC_TIMESTAMP(), verified_by=? WHERE id=?", [req.admin.sub, id]);
  }
  const [[out]] = await pool.query('SELECT * FROM jobs WHERE id=?', [id]);
  await logActivity(req.admin.sub, req.body?.verified === false ? 'unverify' : 'verify', 'job', id, row.title);
  res.json({ job: serialize(out) });
});

r.post('/jobs/:id/feature', async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const on = req.body?.featured === true || req.body?.featured === 1;
  const [u] = await pool.query('UPDATE jobs SET featured=?, featured_at=? WHERE id=?', [on ? 1 : 0, on ? new Date() : null, id]);
  if (!u.affectedRows) return res.status(404).json({ error: 'Job not found' });
  const [[out]] = await pool.query('SELECT * FROM jobs WHERE id=?', [id]);
  await logActivity(req.admin.sub, on ? 'feature' : 'unfeature', 'job', id, out.title);
  res.json({ job: serialize(out) });
});

r.post('/jobs/:id/logo', logoBody, async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const [[row]] = await pool.query('SELECT id FROM jobs WHERE id=?', [id]);
  if (!row) return res.status(404).json({ error: 'Job not found' });
  const out = await setJobLogo(id, req.body);
  if (out.error) return res.status(400).json({ error: out.error });
  const [[job]] = await pool.query('SELECT * FROM jobs WHERE id=?', [id]);
  res.json({ job: serialize(job) });
});
r.delete('/jobs/:id/logo', async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const [[row]] = await pool.query('SELECT logo_file FROM jobs WHERE id=?', [id]);
  if (!row) return res.status(404).json({ error: 'Job not found' });
  await pool.query('UPDATE jobs SET logo_file=NULL WHERE id=?', [id]); removeLogo(row.logo_file);
  res.json({ ok: true });
});

r.delete('/jobs/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const [[row]] = await pool.query('SELECT status, title, logo_file FROM jobs WHERE id=?', [id]);
  if (!row) return res.status(404).json({ error: 'Job not found' });
  if (row.status === 'published') return res.status(409).json({ error: 'Unpublish or close the job before deleting it.' });
  try { await pool.query('DELETE FROM jobs WHERE id=?', [id]); }
  catch (e) { if (e.errno === 1451) return res.status(409).json({ error: 'This job has candidate applications. Close it instead of deleting.' }); throw e; }
  removeLogo(row.logo_file);
  await logActivity(req.admin.sub, 'delete', 'job', id, row.title);
  res.json({ ok: true });
});

// ---- reports from the public ----
r.get('/reports', async (req, res) => {
  const status = ['open', 'dismissed', 'actioned'].includes(req.query.status) ? req.query.status : 'open';
  const [rows] = await pool.query(
    `SELECT rp.id, rp.job_id, rp.reason, rp.details, rp.status, rp.created_at, j.title, j.company, j.status job_status, j.verification_status,
       (SELECT COUNT(*) FROM job_reports x WHERE x.job_id=rp.job_id AND x.status='open') open_for_job
     FROM job_reports rp JOIN jobs j ON j.id=rp.job_id WHERE rp.status=? ORDER BY rp.created_at DESC LIMIT 100`, [status]);
  res.json({ reports: rows });
});
r.post('/reports/:id/resolve', async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const action = req.body?.action;   // dismiss = report was wrong, close_job = listing taken down
  if (!['dismiss', 'close_job'].includes(action)) return res.status(400).json({ error: 'Choose dismiss or close_job.' });
  const [[rep]] = await pool.query('SELECT id, job_id FROM job_reports WHERE id=?', [id]);
  if (!rep) return res.status(404).json({ error: 'Report not found' });
  await pool.query('UPDATE job_reports SET status=?, handled_at=UTC_TIMESTAMP(), handled_by=? WHERE job_id=? AND status=\'open\'', [action === 'dismiss' ? 'dismissed' : 'actioned', req.admin.sub, rep.job_id]);
  if (action === 'close_job') await pool.query("UPDATE jobs SET status='closed' WHERE id=?", [rep.job_id]);
  // when no open reports remain, a dismissed job goes back to the label it deserves
  const [[left]] = await pool.query("SELECT COUNT(*) n FROM job_reports WHERE job_id=? AND status='open'", [rep.job_id]);
  if (!left.n) await pool.query("UPDATE jobs SET verification_status = CASE WHEN verified_at IS NOT NULL THEN 'verified' WHEN recruiter_id IS NOT NULL THEN 'recruiter_submitted' ELSE 'awaiting' END WHERE id=? AND verification_status='reported'", [rep.job_id]);
  await logActivity(req.admin.sub, action === 'dismiss' ? 'dismiss_report' : 'close_reported_job', 'job', rep.job_id);
  res.json({ ok: true });
});

r.get('/activity', async (req, res) => {
  const [rows] = await pool.query('SELECT a.id, a.action, a.entity, a.entity_id, a.detail, a.created_at, u.email admin_email FROM admin_activity a LEFT JOIN admin_users u ON u.id=a.admin_id ORDER BY a.id DESC LIMIT 100');
  res.json({ activity: rows });
});

export default r;
