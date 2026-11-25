import { Router } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { safeUrl, serialize } from '../utils/job.js';
import { PUB } from './publicJobs.js';
import { logActivity } from '../services/activity.js';

// Simple content management: announcements, homepage text, contact details. Featured jobs are toggled on each job.
export const publicSite = Router();
export const adminCms = Router();
const t = (v, n) => { const s = String(v ?? '').trim(); return s ? s.slice(0, n) : ''; };
const SETTINGS = {
  home: (b) => ({ hero_title: t(b.hero_title, 120), hero_subtitle: t(b.hero_subtitle, 300), show_walk_ins: b.show_walk_ins !== false, show_remote: b.show_remote !== false, show_featured: b.show_featured !== false, show_internships: b.show_internships !== false }),
  contact: (b) => ({ email: t(b.email, 255), phone: t(b.phone, 40), address: t(b.address, 300), hours: t(b.hours, 120), security_email: t(b.security_email, 255) }),
};
const DEFAULTS = { home: { hero_title: '', hero_subtitle: '', show_walk_ins: true, show_remote: true, show_featured: true, show_internships: true }, contact: { email: '', phone: '', address: '', hours: '', security_email: '' } };
async function settings() {
  const [rows] = await pool.query('SELECT k, v FROM site_settings');
  const out = { ...DEFAULTS };
  for (const { k, v } of rows) if (SETTINGS[k]) { try { out[k] = { ...DEFAULTS[k], ...JSON.parse(v) }; } catch { /* keep defaults */ } }
  return out;
}
const COLS = 'id,title,company,location,work_mode,employment_type,experience,salary,skills,published_at,job_kind,remote_region,city,state,drive_date,drive_end_date,reporting_time,verification_status,featured,logo_file';

publicSite.get('/', async (req, res) => {
  const [announcements] = await pool.query('SELECT id, message, link_url, level FROM announcements WHERE active=1 AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP()) AND (ends_at IS NULL OR ends_at > UTC_TIMESTAMP()) ORDER BY id DESC LIMIT 3');
  const [featured] = await pool.query(`SELECT ${COLS} FROM jobs WHERE ${PUB} AND featured=1 ORDER BY featured_at DESC, id DESC LIMIT 6`);
  res.set('Cache-Control', 'public, max-age=30').json({ announcements, ...(await settings()), featured: featured.map(serialize) });
});

adminCms.use(requireAdmin);
adminCms.get('/', async (req, res) => {
  const [announcements] = await pool.query('SELECT * FROM announcements ORDER BY id DESC LIMIT 50');
  res.json({ announcements, ...(await settings()) });
});
adminCms.put('/settings/:key', async (req, res) => {
  const f = SETTINGS[req.params.key];
  if (!f) return res.status(404).json({ error: 'Unknown setting' });
  const v = f(req.body || {});
  await pool.query('INSERT INTO site_settings (k, v, updated_at) VALUES (?,?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE v=VALUES(v), updated_at=UTC_TIMESTAMP()', [req.params.key, JSON.stringify(v)]);
  await logActivity(req.admin.sub, 'update', 'settings', null, req.params.key);
  res.json({ [req.params.key]: v });
});
const when = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? undefined : d; };
function announcement(b) {
  const message = t(b.message, 300); if (!message) return { error: 'Write the announcement text.' };
  const link = safeUrl(b.link_url); if (link === undefined) return { error: 'Link must be a valid http(s) URL.' };
  const level = ['info', 'success', 'warning'].includes(b.level) ? b.level : 'info';
  const s = when(b.starts_at); const e = when(b.ends_at); if (s === undefined || e === undefined) return { error: 'Start/end must be valid dates.' };
  if (s && e && e <= s) return { error: 'The end date must be after the start date.' };
  return { value: [message, link, level, b.active === false ? 0 : 1, s, e] };
}
adminCms.post('/announcements', async (req, res) => {
  const a = announcement(req.body || {}); if (a.error) return res.status(400).json({ error: a.error });
  const [out] = await pool.query('INSERT INTO announcements (message, link_url, level, active, starts_at, ends_at, created_at) VALUES (?,?,?,?,?,?, UTC_TIMESTAMP())', a.value);
  await logActivity(req.admin.sub, 'create', 'announcement', out.insertId);
  res.status(201).json({ id: out.insertId });
});
adminCms.put('/announcements/:id', async (req, res) => {
  const a = announcement(req.body || {}); if (a.error) return res.status(400).json({ error: a.error });
  const [u] = await pool.query('UPDATE announcements SET message=?, link_url=?, level=?, active=?, starts_at=?, ends_at=? WHERE id=?', [...a.value, parseInt(req.params.id, 10) || 0]);
  if (!u.affectedRows) return res.status(404).json({ error: 'Announcement not found' });
  res.json({ ok: true });
});
adminCms.delete('/announcements/:id', async (req, res) => {
  const [d] = await pool.query('DELETE FROM announcements WHERE id=?', [parseInt(req.params.id, 10) || 0]);
  if (!d.affectedRows) return res.status(404).json({ error: 'Announcement not found' });
  await logActivity(req.admin.sub, 'delete', 'announcement', parseInt(req.params.id, 10) || null);
  res.json({ ok: true });
});
