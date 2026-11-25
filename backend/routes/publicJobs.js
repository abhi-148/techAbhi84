import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { serialize, J, driveStatus } from '../utils/job.js';
import { canonicalState, istToday, INDIA_REGIONS, CATEGORIES, REMOTE_REGIONS, REGION_LABEL } from '../utils/geo.js';
import { LOGO_DIR, safeLogoName, logoMime } from '../services/logo.js';
import { authenticate } from '../services/session.js';

const r = Router();
export const LIVE = "status='published' AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())";
// Government listings are only shown once an admin has verified them against an official source.
export const PUB = `${LIVE} AND (employer_type IS NULL OR employer_type <> 'government' OR verification_status='verified')`;
const COLS = `id,title,company,category,location,work_mode,employment_type,experience,education,salary,salary_min,salary_max,salary_currency,salary_period,openings,skills,published_at,expires_at,
job_kind,sector,employer_type,country,state,city,remote_region,remote_country,timezone_requirement,work_authorization_required,fresher_eligible,experience_min_years,experience_max_years,
verification_status,featured,drive_date,drive_end_date,reporting_time,interview_time,venue,venue_address,maps_url,documents_required,logo_file,SUBSTRING(description,1,260) AS description_preview`.replace(/\n/g, '');
const esc = (s) => String(s).slice(0, 100).replace(/[%_\\]/g, '\\$&');
// Strict numeric id: "12abc" or "12\u0000" is not job 12.
const idOf = (v) => (/^\d{1,10}$/.test(String(v)) ? parseInt(v, 10) : 0);
const csv = (v, max = 8) => String(v ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, max);
const ANNUAL = "(salary_max * CASE salary_period WHEN 'month' THEN 12 WHEN 'hour' THEN 2080 ELSE 1 END)";
const FRESHER = "(fresher_eligible=1 OR (fresher_eligible IS NULL AND (experience_min_years=0 OR (experience_min_years IS NULL AND (experience LIKE '%fresher%' OR experience LIKE '%0-1%' OR experience LIKE '%0 year%' OR experience LIKE '%no experience%')))))";

/** Every public list/filter goes through here: parameterised, whitelisted, against real rows. */
export function buildFilters(qs, { kind } = {}) {
  const where = [PUB, "(job_kind<>'walk_in' OR drive_date IS NULL OR COALESCE(drive_end_date, drive_date) >= ?)"]; const p = [istToday()];
  const add = (sql, ...vals) => { where.push(sql); p.push(...vals); };
  const today = istToday();
  const k = kind || qs.kind;
  if (k === 'walk_in') add("job_kind='walk_in'");
  else if (k === 'remote') add("work_mode='remote'");   // an office or hybrid job is never listed as remote
  else if (k === 'standard') add("job_kind='standard'");

  if (qs.q) { const l = `%${esc(qs.q)}%`; add('(title LIKE ? OR company LIKE ? OR CAST(skills AS CHAR) LIKE ? OR category LIKE ? OR location LIKE ?)', l, l, l, l, l); }
  if (qs.company) add('LOWER(company)=LOWER(?)', String(qs.company).slice(0, 255));
  if (qs.category) add('category=?', String(qs.category).slice(0, 100));
  if (qs.education) add('education LIKE ?', `%${esc(qs.education)}%`);

  // location: structured fields first; rows that only have the old free-text `location` still match by text
  const loc = []; const lp = [];
  if (qs.location) { const l = `%${esc(qs.location)}%`; loc.push('(location LIKE ? OR city LIKE ? OR state LIKE ?)'); lp.push(l, l, l); }
  const state = qs.state ? canonicalState(qs.state) || String(qs.state).trim() : null;
  if (state) { loc.push("(state = ? OR (state IS NULL AND (work_mode IS NULL OR work_mode<>'remote') AND location LIKE ?))"); lp.push(state, `%${esc(state)}%`); }
  if (qs.city) { loc.push("(city = ? OR (city IS NULL AND (work_mode IS NULL OR work_mode<>'remote') AND location LIKE ?))"); lp.push(String(qs.city).slice(0, 100), `%${esc(qs.city)}%`); }
  if (loc.length) {
    let sql = loc.join(' AND '); const vals = [...lp];
    if (qs.include_remote === 'india') sql = `(${sql}) OR (work_mode='remote' AND (remote_region='india' OR (remote_region='worldwide' AND work_authorization_required=0)))`;
    add(`(${sql})`, ...vals);
  }
  if (qs.country) {
    const c = String(qs.country).trim();
    if (/^(india|in)$/i.test(c)) add("((country='India' OR country IS NULL) AND (work_mode IS NULL OR work_mode<>'remote' OR remote_region='india'))");
    else add('country = ?', c.slice(0, 100));
  }
  if (qs.scope === 'india') add("((country='India' OR country IS NULL) AND (work_mode IS NULL OR work_mode<>'remote' OR remote_region='india'))");

  const modes = csv(qs.work_mode).filter((x) => ['onsite', 'remote', 'hybrid'].includes(x)); if (modes.length) add(`work_mode IN (${modes.map(() => '?').join(',')})`, ...modes);
  const types = csv(qs.employment_type).filter((x) => ['full-time', 'part-time', 'internship', 'contract', 'freelance'].includes(x)); if (types.length) add(`employment_type IN (${types.map(() => '?').join(',')})`, ...types);
  const sectors = csv(qs.sector).filter((x) => ['it', 'non_it', 'semi_it'].includes(x)); if (sectors.length) add(`sector IN (${sectors.map(() => '?').join(',')})`, ...sectors);
  const emp = csv(qs.employer_type).filter((x) => ['private', 'mnc', 'startup', 'government', 'other'].includes(x)); if (emp.length) add(`employer_type IN (${emp.map(() => '?').join(',')})`, ...emp);

  if (qs.experience) add('experience LIKE ?', `%${esc(qs.experience)}%`);
  if (qs.fresher === '1' || qs.experience_level === 'fresher') add(FRESHER);
  else if (qs.experience_level === 'experienced') add('(experience_min_years >= 1)');
  else if (qs.experience_level === '0-2') add('(experience_min_years IS NOT NULL AND experience_min_years <= 2)');
  else if (qs.experience_level === '2-5') add('(experience_min_years BETWEEN 2 AND 5)');
  else if (qs.experience_level === '5-plus') add('(experience_min_years >= 5)');
  if (parseInt(qs.min_salary, 10) > 0) add(`salary_currency='INR' AND ${ANNUAL} >= ?`, parseInt(qs.min_salary, 10));
  if ([1, 3, 7, 14, 30].includes(parseInt(qs.posted_within, 10))) add('published_at >= (UTC_TIMESTAMP() - INTERVAL ? DAY)', parseInt(qs.posted_within, 10));
  if (qs.skills) {   // a job matches if it lists ANY of them (whole skill, so "Java" never matches "JavaScript")
    const list = String(qs.skills).split(',').map((x) => x.trim().replace(/["\\%_]/g, '')).filter(Boolean).slice(0, 8);
    if (list.length) add('(' + list.map(() => 'CAST(skills AS CHAR) LIKE ?').join(' OR ') + ')', ...list.map((sk) => `%"${sk.slice(0, 60)}"%`));
  }

  // remote eligibility
  const regions = csv(qs.remote_region).filter((x) => REMOTE_REGIONS.includes(x)); if (regions.length) add(`remote_region IN (${regions.map(() => '?').join(',')})`, ...regions);
  if (qs.eligibility === 'india') add("(remote_region='india' OR (remote_region='worldwide' AND work_authorization_required=0))");
  else if (qs.eligibility === 'worldwide') add("remote_region='worldwide'");
  if (qs.work_auth === '1') add('work_authorization_required=1'); else if (qs.work_auth === '0') add('work_authorization_required=0');
  if (qs.timezone) add('timezone_requirement LIKE ?', `%${esc(qs.timezone)}%`);

  // trust
  if (qs.verified === '1') add("verification_status='verified'");
  if (qs.featured === '1') add('featured=1');

  // walk-in dates (Indian local dates). "today" means a drive taking place today, including multi-day drives already under way.
  const onDay = (d) => { add('(drive_date <= ? AND COALESCE(drive_end_date, drive_date) >= ?)', d, d); };
  if (qs.drive === 'today') onDay(today);
  else if (qs.drive === 'upcoming') add('drive_date > ?', today);
  else if (qs.drive === 'recent') add('published_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)');
  if (/^\d{4}-\d{2}-\d{2}$/.test(qs.drive_date || '')) onDay(qs.drive_date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(qs.drive_from || '')) add('COALESCE(drive_end_date, drive_date) >= ?', qs.drive_from);
  if (/^\d{4}-\d{2}-\d{2}$/.test(qs.drive_to || '')) add('drive_date <= ?', qs.drive_to);
  return { where: where.join(' AND '), p };
}
const ORDER = {
  salary: `salary_max IS NULL, ${ANNUAL} DESC, published_at DESC`,
  deadline: 'expires_at IS NULL, expires_at ASC, published_at DESC',
  drive_date: 'drive_date IS NULL, drive_date ASC, reporting_time ASC',
  featured: 'featured DESC, published_at DESC, id DESC',
  latest: 'published_at DESC, id DESC',
};

r.get('/meta', async (req, res) => {
  const [cats] = await pool.query(`SELECT category name, COUNT(*) n FROM jobs WHERE ${PUB} AND category IS NOT NULL GROUP BY category ORDER BY n DESC LIMIT 12`);
  const [locs] = await pool.query(`SELECT location name, COUNT(*) n FROM jobs WHERE ${PUB} AND location IS NOT NULL GROUP BY location ORDER BY n DESC LIMIT 12`);
  const [edu] = await pool.query(`SELECT education name, COUNT(*) n FROM jobs WHERE ${PUB} AND education IS NOT NULL GROUP BY education ORDER BY n DESC LIMIT 10`);
  const [states] = await pool.query(`SELECT state name, COUNT(*) n FROM jobs WHERE ${PUB} AND state IS NOT NULL GROUP BY state ORDER BY n DESC`);
  const [regions] = await pool.query(`SELECT remote_region name, COUNT(*) n FROM jobs WHERE ${PUB} AND work_mode='remote' AND remote_region IS NOT NULL GROUP BY remote_region ORDER BY n DESC`);
  const [[kinds]] = await pool.query(`SELECT COALESCE(SUM(job_kind='walk_in'),0) walk_in, COALESCE(SUM(work_mode='remote'),0) remote, COUNT(*) total FROM jobs WHERE ${PUB}`);
  // Skills live in a JSON column; count them in JS so this works on MySQL 5.7/8 and MariaDB alike.
  const [skillRows] = await pool.query(`SELECT skills FROM jobs WHERE ${PUB} AND skills IS NOT NULL ORDER BY published_at DESC LIMIT 500`);
  const tally = new Map();
  for (const row of skillRows) for (const sk of J(row.skills)) { const k = String(sk).trim(); if (k) tally.set(k, (tally.get(k) || 0) + 1); }
  const skills = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, n]) => ({ name, n }));
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ categories: cats, locations: locs, education: edu, skills, states, remote_regions: regions.map((x) => ({ ...x, label: REGION_LABEL[x.name] })), kinds: { walk_in: Number(kinds.walk_in), remote: Number(kinds.remote), total: Number(kinds.total) },
    category_options: CATEGORIES, regions: INDIA_REGIONS.map((s) => s.name) });
});

r.get('/suggest', rateLimit({ windowMs: 60 * 1000, max: 90 }), async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q.length < 2) return res.json({ titles: [], companies: [], skills: [], cities: [] });
  const l = `%${esc(q)}%`; const pre = `${esc(q)}%`;
  const [titles] = await pool.query(`SELECT title, COUNT(*) n FROM jobs WHERE ${PUB} AND title LIKE ? GROUP BY title ORDER BY n DESC LIMIT 5`, [l]);
  const [companies] = await pool.query(`SELECT company, COUNT(*) n FROM jobs WHERE ${PUB} AND company LIKE ? GROUP BY company ORDER BY n DESC LIMIT 5`, [l]);
  const [cities] = await pool.query(`SELECT city, state, COUNT(*) n FROM jobs WHERE ${PUB} AND city LIKE ? GROUP BY city, state ORDER BY n DESC LIMIT 5`, [pre]);
  const [rows] = await pool.query(`SELECT skills FROM jobs WHERE ${PUB} AND CAST(skills AS CHAR) LIKE ? ORDER BY published_at DESC LIMIT 200`, [l]);
  const tally = new Map();
  for (const row of rows) for (const sk of J(row.skills)) if (String(sk).toLowerCase().includes(q.toLowerCase())) tally.set(sk, (tally.get(sk) || 0) + 1);
  res.set('Cache-Control', 'public, max-age=30');
  res.json({ titles: titles.map((t) => t.title), companies: companies.map((c) => c.company), cities: cities.map((c) => ({ city: c.city, state: c.state })), skills: [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s) });
});

// Counts for the walk-in page tabs (Indian dates).
r.get('/walk-ins/summary', async (req, res) => {
  const out = {};
  for (const [name, qs] of [['today', { drive: 'today' }], ['upcoming', { drive: 'upcoming' }], ['recent', { drive: 'recent' }], ['total', {}]]) {
    const { where, p } = buildFilters(qs, { kind: 'walk_in' });
    const [[{ n }]] = await pool.query(`SELECT COUNT(*) n FROM jobs WHERE ${where}`, p); out[name] = Number(n);
  }
  res.set('Cache-Control', 'public, max-age=30').json({ ...out, today_date: istToday() });
});

// Company directory: built only from companies that currently have live jobs. Nothing is invented.
r.get('/companies', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 60);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const where = [PUB, "company IS NOT NULL", "company <> ''"]; const p = [];
  if (req.query.q) { where.push('company LIKE ?'); p.push(`%${esc(req.query.q)}%`); }
  const w = where.join(' AND ');
  const [[{ total }]] = await pool.query(`SELECT COUNT(DISTINCT company) total FROM jobs WHERE ${w}`, p);
  const [rows] = await pool.query(
    `SELECT company name, COUNT(*) open_jobs, MAX(published_at) latest, GROUP_CONCAT(DISTINCT location SEPARATOR '||') locs, GROUP_CONCAT(DISTINCT category SEPARATOR '||') cats,
       MAX(CASE WHEN logo_file IS NOT NULL THEN id END) logo_job
     FROM jobs WHERE ${w} GROUP BY company ORDER BY open_jobs DESC, latest DESC, name ASC LIMIT ? OFFSET ?`, [...p, limit, (page - 1) * limit]);
  const split = (v) => (v ? String(v).split('||').filter(Boolean).slice(0, 3) : []);
  res.json({
    companies: rows.map((c) => ({ name: c.name, open_jobs: Number(c.open_jobs), latest_published_at: c.latest, locations: split(c.locs), categories: split(c.cats), logo_url: c.logo_job ? `/api/jobs/${c.logo_job}/logo` : null })),
    total: Number(total), page, pages: Math.max(Math.ceil(total / limit), 1),
  });
});

// One company: its live-job count, plus the profile an APPROVED recruiter wrote for it (if any).
export async function companyProfile(name) {
  const [[agg]] = await pool.query(`SELECT COUNT(*) open_jobs, MAX(CASE WHEN logo_file IS NOT NULL THEN id END) logo_job, MAX(NULLIF(company_website,'')) site FROM jobs WHERE ${PUB} AND LOWER(company)=LOWER(?)`, [name]);
  if (!agg.open_jobs) return null;
  const [[rec]] = await pool.query("SELECT company_name, company_website, company_description FROM recruiters WHERE status='approved' AND LOWER(company_name)=LOWER(?) LIMIT 1", [name]);
  const pick = (u) => (u && /^https?:\/\//i.test(u) ? u : null);
  return { name: rec?.company_name || name, open_jobs: Number(agg.open_jobs), website: pick(rec?.company_website) || pick(agg.site), description: rec?.company_description || null, logo_url: agg.logo_job ? `/api/jobs/${agg.logo_job}/logo` : null, verified_recruiter: !!rec };
}
r.get('/companies/:name', async (req, res) => {
  const c = await companyProfile(String(req.params.name).slice(0, 255));
  if (!c) return res.status(404).json({ error: 'Company not found or has no open jobs' });
  res.json({ company: c });
});

r.get('/', async (req, res) => {
  const { where, p } = buildFilters(req.query);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const order = ORDER[req.query.sort] || ORDER.latest;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM jobs WHERE ${where}`, p);
  const [rows] = await pool.query(`SELECT ${COLS} FROM jobs WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...p, limit, (page - 1) * limit]);
  res.json({ jobs: rows.map(serialize), total: Number(total), page, pages: Math.max(Math.ceil(total / limit), 1) });
});

export async function getPublicJob(id) {
  const [[row]] = await pool.query('SELECT * FROM jobs WHERE id=?', [id]);
  if (!row || row.status === 'draft') return { state: 'missing' };            // drafts are never revealed
  if (row.employer_type === 'government' && row.verification_status !== 'verified') return { state: 'missing' };
  const expired = row.expires_at && new Date(row.expires_at) <= new Date();
  const driveOver = row.job_kind === 'walk_in' && row.drive_date && driveStatus(row) === 'expired';
  if (row.status === 'closed' || expired || driveOver) return { state: 'closed' };
  return { state: 'ok', job: serialize(row) };
}

r.get('/:id', async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return res.status(404).json({ error: 'Job not found' });
  const { state, job } = await getPublicJob(id);
  if (state === 'missing') return res.status(404).json({ error: 'Job not found' });
  if (state === 'closed') return res.status(410).json({ error: 'This job is no longer accepting applications.' });
  job.accepts_applications = job.recruiter_id != null;   // never expose the recruiter's id
  delete job.recruiter_id; delete job.verified_by;
  const company = job.company ? await companyProfile(job.company) : null;
  const [related] = await pool.query(`SELECT ${COLS} FROM jobs WHERE ${PUB} AND id<>? AND (category <=> ? OR employment_type <=> ?) ORDER BY published_at DESC LIMIT 4`, [id, job.category, job.employment_type]);
  res.json({ job, related: related.map(serialize), company });
});

r.get('/:id/logo', async (req, res) => {
  const id = idOf(req.params.id);
  const [[row]] = await pool.query('SELECT logo_file, status FROM jobs WHERE id=?', [id]);
  if (!row?.logo_file || !safeLogoName(row.logo_file)) return res.status(404).end();
  if (row.status === 'draft' && !(await authenticate(req, 'admin')) && !(await authenticate(req, 'recruiter'))) return res.status(404).end();
  const file = path.join(LOGO_DIR, row.logo_file);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.set({ 'Content-Type': logoMime(row.logo_file), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=86400', 'Content-Security-Policy': "default-src 'none'", 'Cross-Origin-Resource-Policy': 'same-origin' });
  fs.createReadStream(file).pipe(res);
});

r.post('/:id/event', rateLimit({ windowMs: 60 * 1000, max: 60 }), async (req, res) => {
  const id = idOf(req.params.id);
  const type = req.body?.type;
  if (!['view', 'apply_click', 'share'].includes(type)) return res.status(400).json({ error: 'Invalid event' });
  const { state } = await getPublicJob(id);
  if (state === 'ok') await pool.query('INSERT INTO job_events (job_id,event_type) VALUES (?,?)', [id, type]);
  res.json({ ok: true });
});

// Anyone can report a suspicious or wrong listing (once per job per person). Several independent reports flag it for review.
const REASONS = ['fake_or_scam', 'asks_for_money', 'expired', 'duplicate', 'wrong_details', 'other'];
r.post('/:id/report', rateLimit({ windowMs: 60 * 60 * 1000, max: 12 }), async (req, res) => {
  const id = idOf(req.params.id);
  const reason = req.body?.reason;
  if (!REASONS.includes(reason)) return res.status(400).json({ error: 'Choose a reason for the report.' });
  const details = String(req.body?.details || '').trim().slice(0, 1000) || null;
  const { state } = await getPublicJob(id);
  if (state !== 'ok') return res.status(404).json({ error: 'Job not found' });
  const key = crypto.createHmac('sha256', process.env.JWT_SECRET).update('report:' + req.ip).digest('hex');
  try { await pool.query('INSERT INTO job_reports (job_id, reason, details, reporter_key, created_at) VALUES (?,?,?,?, UTC_TIMESTAMP())', [id, reason, details, key]); }
  catch (e) { if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'You have already reported this job. Our team will review it.' }); throw e; }
  const threshold = Math.max(parseInt(process.env.REPORT_FLAG_THRESHOLD, 10) || 3, 1);
  const [[{ n }]] = await pool.query("SELECT COUNT(*) n FROM job_reports WHERE job_id=? AND status='open'", [id]);
  if (n >= threshold) await pool.query("UPDATE jobs SET verification_status='reported' WHERE id=? AND verification_status<>'reported'", [id]);
  res.status(201).json({ ok: true, message: 'Thanks. Our team will review this listing.' });
});

export default r;
