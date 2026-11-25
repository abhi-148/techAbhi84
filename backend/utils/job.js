import crypto from 'crypto';
import { canonicalState, NOT_A_PLACE, REMOTE_REGIONS, REGION_LABEL, istToday, istEndOfDay } from './geo.js';

export const WORK_MODES = ['onsite', 'remote', 'hybrid'];
export const TYPES = ['full-time', 'part-time', 'internship', 'contract', 'freelance'];
export const JOB_KINDS = ['standard', 'walk_in'];
export const SECTORS = ['it', 'non_it', 'semi_it'];
export const EMPLOYER_TYPES = ['private', 'mnc', 'startup', 'government', 'other'];
export const SALARY_PERIODS = ['year', 'month', 'hour'];
export const VERIFICATION = ['awaiting', 'recruiter_submitted', 'verified', 'reported'];
export const VERIFICATION_LABEL = { verified: 'Verified by TechAbhi', recruiter_submitted: 'Recruiter submitted', awaiting: 'Awaiting verification', reported: 'Reported opportunity' };

const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase().replace(/[\s_]+/g, '-') : '');
const str = (v, max) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};
const int = (v, max) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};
const list = (v, split, n = 30, len = 500) => {
  let a = v;
  if (typeof a === 'string') a = a.split(split);
  if (!Array.isArray(a)) return [];
  return a.map((x) => str(x, len)).filter(Boolean).slice(0, n);
};
const bool = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : v === false || v === 0 || v === '0' || v === 'false' ? 0 : null);
// returns URL string, null (empty) or undefined (invalid)
export function safeUrl(v) {
  const s = str(v, 1000);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined;
  } catch { return undefined; }
}
const MAPS_HOST = /(^|\.)(google\.[a-z.]+|goo\.gl|g\.page)$/i;
function mapsUrl(v) {
  const u = safeUrl(v);
  if (!u) return u;
  const h = new URL(u).hostname;
  return MAPS_HOST.test(h) || h === 'maps.app.goo.gl' ? u : undefined;
}
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function dateVal(v) {
  if (!v) return null;
  const s = String(v);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T23:59:59Z' : s);
  return isNaN(d) ? undefined : d;
}
const ymd = (v) => { if (v === null || v === undefined || v === '') return null; const s = String(v).slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined; const d = new Date(s + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s ? s : undefined; };
const hm = (v) => { if (v === null || v === undefined || v === '') return null; const m = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(String(v).trim()); return m ? `${m[1]}:${m[2]}:00` : undefined; };
const mapMode = (x) => { const n = norm(x); return n === 'on-site' || n === 'office' || n === 'work-from-office' ? 'onsite' : n === 'wfh' || n === 'work-from-home' ? 'remote' : n; };
const mapType = (x) => { const n = norm(x); return n === 'fulltime' ? 'full-time' : n === 'parttime' ? 'part-time' : n === 'intern' ? 'internship' : n; };
const enumOf = (v, allowed) => { const n = norm(v).replace(/-/g, '_'); return allowed.includes(n) ? n : null; };

/** Stable key used to spot the same opportunity posted twice. */
export function dedupeKey(j) {
  const f = (x) => String(x ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const where = j.job_kind === 'walk_in' ? `${f(j.city || j.location)}|${j.drive_date || ''}` : f(j.work_mode === 'remote' ? 'remote ' + (j.remote_region || '') : j.city || j.location);
  return crypto.createHash('sha256').update(`${f(j.title)}|${f(j.company)}|${where}`).digest('hex');
}

/** Validates & normalises job input. lenient=true (AI output): bad values become null instead of errors. */
export function sanitizeJob(b = {}, { lenient = false } = {}) {
  const errors = [];
  const bad = (msg) => { if (!lenient) errors.push(msg); };
  const v = {
    title: str(b.title, 255), company: str(b.company, 255), category: str(b.category, 100),
    location: str(b.location, 255), experience: str(b.experience, 100), salary: str(b.salary, 150),
    education: str(b.education, 255), description: str(b.description, 20000),
    eligibility: str(b.eligibility, 5000), application_instructions: str(b.application_instructions, 5000),
    responsibilities: list(b.responsibilities, /\r?\n/), requirements: list(b.requirements, /\r?\n/),
    benefits: list(b.benefits, /\r?\n/), skills: list(b.skills, /\r?\n|,/, 40, 60),
    openings: int(b.openings, 100000), salary_min: int(b.salary_min, 1e9), salary_max: int(b.salary_max, 1e9),
    address: str(b.address, 500), timezone_requirement: str(b.timezone_requirement, 100), remote_country: str(b.remote_country, 100),
    venue: str(b.venue, 255), venue_address: str(b.venue_address, 500),
    interview_process: list(b.interview_process, /\r?\n/, 15, 300), documents_required: list(b.documents_required, /\r?\n|,/, 20, 120),
    work_authorization_required: bool(b.work_authorization_required) ?? 0, fresher_eligible: bool(b.fresher_eligible),
    experience_min_years: int(b.experience_min_years, 60), experience_max_years: int(b.experience_max_years, 60),
  };
  const mode = b.work_mode ? mapMode(b.work_mode) : null;
  if (mode && !WORK_MODES.includes(mode)) { bad('work_mode must be onsite, remote or hybrid'); v.work_mode = null; } else v.work_mode = mode || null;
  const type = b.employment_type ? mapType(b.employment_type) : null;
  if (type && !TYPES.includes(type)) { bad('employment_type must be one of ' + TYPES.join(', ')); v.employment_type = null; } else v.employment_type = type || null;

  const kind = b.job_kind ? enumOf(b.job_kind, JOB_KINDS) : 'standard';
  if (!kind) { bad('job_kind must be standard or walk_in'); v.job_kind = 'standard'; } else v.job_kind = kind;
  for (const [field, allowed, label] of [['sector', SECTORS, 'sector must be it, non_it or semi_it'], ['employer_type', EMPLOYER_TYPES, 'employer_type must be one of ' + EMPLOYER_TYPES.join(', ')]]) {
    const raw = b[field]; const e = raw ? enumOf(raw, allowed) : null;
    if (raw && !e) bad(label); v[field] = e;
  }
  const per = b.salary_period ? enumOf(b.salary_period, SALARY_PERIODS) : 'year';
  if (!per) { bad('salary_period must be year, month or hour'); v.salary_period = 'year'; } else v.salary_period = per;
  const cur = String(b.salary_currency || 'INR').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(cur)) { bad('salary_currency must be a 3-letter code such as INR or USD'); v.salary_currency = 'INR'; } else v.salary_currency = cur;

  // ---- where the job is ----
  v.city = str(b.city, 100); v.state = str(b.state, 100); v.country = str(b.country, 100);
  for (const f of ['city', 'state', 'country']) if (v[f] && NOT_A_PLACE.test(v[f])) { bad(`${f} cannot be "${v[f]}". Set the work mode to Remote and choose the hiring region instead.`); v[f] = null; }
  if (v.state) { const c = canonicalState(v.state); if (c) { v.state = c; if (!v.country) v.country = 'India'; } }
  if (v.location && NOT_A_PLACE.test(v.location) && v.work_mode && v.work_mode !== 'remote') bad(`location cannot be "${v.location}" for a ${v.work_mode} job. Enter the office city.`);
  const rr = b.remote_region ? enumOf(b.remote_region, REMOTE_REGIONS) : null;
  if (b.remote_region && !rr) bad('remote_region must be one of ' + REMOTE_REGIONS.join(', '));
  v.remote_region = v.work_mode === 'remote' ? rr : null;   // never keep a hiring region on an office/hybrid job
  if (v.work_mode === 'remote') { v.city = null; v.state = null; v.address = null; if (!v.location || NOT_A_PLACE.test(v.location)) v.location = null; }
  if (v.remote_region !== 'other') v.remote_country = null;
  if (!v.location) v.location = v.work_mode === 'remote' ? (v.remote_region ? `Remote – ${REGION_LABEL[v.remote_region]}` : 'Remote') : [v.city, v.state].filter(Boolean).join(', ') || null;

  for (const f of ['application_url', 'company_website', 'source_url']) {
    const u = safeUrl(b[f]);
    if (u === undefined) { bad(`${f} must be a valid http(s) URL`); v[f] = null; } else v[f] = u;
  }
  const maps = mapsUrl(b.maps_url);
  if (maps === undefined) { bad('maps_url must be a Google Maps link'); v.maps_url = null; } else v.maps_url = maps;
  const email = str(b.application_email, 255);
  if (email && !emailOk(email)) { bad('application_email is not a valid email'); v.application_email = null; } else v.application_email = email;
  const exp = dateVal(b.expires_at);
  if (exp === undefined) { bad('expires_at is not a valid date'); v.expires_at = null; } else v.expires_at = exp;
  if (v.salary_min !== null && v.salary_max !== null && v.salary_min > v.salary_max) bad('salary_min cannot exceed salary_max');
  if (v.experience_min_years !== null && v.experience_max_years !== null && v.experience_min_years > v.experience_max_years) bad('experience_min_years cannot exceed experience_max_years');

  // ---- walk-in drives ----
  const dd = ymd(b.drive_date); const de = ymd(b.drive_end_date);
  if (dd === undefined) { bad('drive_date must be a valid date (YYYY-MM-DD)'); v.drive_date = null; } else v.drive_date = dd;
  if (de === undefined) { bad('drive_end_date must be a valid date (YYYY-MM-DD)'); v.drive_end_date = null; } else v.drive_end_date = de;
  if (v.drive_date && v.drive_end_date && v.drive_end_date < v.drive_date) { bad('drive_end_date cannot be before drive_date'); v.drive_end_date = null; }
  for (const f of ['reporting_time', 'interview_time']) { const t = hm(b[f]); if (t === undefined) { bad(`${f} must be a time like 09:30`); v[f] = null; } else v[f] = t; }
  if (v.job_kind === 'walk_in') {
    if (v.work_mode === 'remote') bad('A walk-in drive happens at a venue, so it cannot be a remote job');
    if (!v.expires_at && v.drive_date) v.expires_at = istEndOfDay(v.drive_end_date || v.drive_date);   // a drive expires at the end of its last day (IST)
  } else { v.drive_date = null; v.drive_end_date = null; v.reporting_time = null; v.interview_time = null; v.venue = null; v.venue_address = null; v.maps_url = null; v.interview_process = []; v.documents_required = []; }

  if (!lenient && !v.title) errors.push('title is required');
  v.dedupe_key = dedupeKey(v);
  return { value: v, errors };
}

export function publishErrors(j, { internal = false } = {}) {
  const e = [];
  if (!j.title) e.push('title is required');
  if (!j.company) e.push('company is required to publish');
  if (!j.description) e.push('description is required to publish');
  if (!internal && !j.application_url && !j.application_email && !j.application_instructions)
    e.push('add an application URL, email or instructions before publishing');
  if (j.work_mode === 'remote' && !j.remote_region) e.push('choose who a remote job hires (India, Worldwide, a country or Europe)');
  if ((j.work_mode === 'onsite' || j.work_mode === 'hybrid') && !(j.city || j.location)) e.push('add the office city for an on-site or hybrid job');
  if (j.job_kind === 'walk_in') {
    if (!j.drive_date) e.push('a walk-in drive needs a drive date');
    else if ((j.drive_end_date || j.drive_date) < istToday()) e.push('the drive date has already passed');
    if (!j.reporting_time) e.push('a walk-in drive needs a reporting time');
    if (!j.venue_address && !j.venue) e.push('a walk-in drive needs a venue address');
  }
  if (j.employer_type === 'government' && !j.source_url) e.push('a government job needs the official source URL');
  return e;
}

export const J = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};
const LISTS = ['responsibilities', 'requirements', 'benefits', 'skills', 'interview_process', 'documents_required'];
const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d).slice(0, 10) : null);

export function driveStatus(row, today = istToday()) {
  if (!row.drive_date) return null;
  const start = iso(row.drive_date); const end = iso(row.drive_end_date) || start;
  return today < start ? 'upcoming' : today <= end ? 'ongoing' : 'expired';
}

export function serialize(row) {
  if (!row) return row;
  const out = { ...row };
  for (const k of LISTS) if (k in out) out[k] = J(out[k]);
  if ('drive_date' in out) {
    out.drive_date = iso(out.drive_date); out.drive_end_date = iso(out.drive_end_date);
    out.drive_status = driveStatus(out);
    for (const t of ['reporting_time', 'interview_time']) out[t] = out[t] ? String(out[t]).slice(0, 5) : null;
  }
  if ('verification_status' in out) out.verification_label = VERIFICATION_LABEL[out.verification_status] || null;
  if ('remote_region' in out && out.remote_region) out.remote_region_label = REGION_LABEL[out.remote_region] || out.remote_region;
  for (const k of ['featured', 'work_authorization_required', 'fresher_eligible']) if (k in out && out[k] !== null) out[k] = !!out[k];
  if ('logo_file' in out) { out.logo_url = out.logo_file && out.id ? `/api/jobs/${out.id}/logo` : null; delete out.logo_file; }
  delete out.dedupe_key;
  return out;
}
