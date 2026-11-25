import { useEffect } from 'react';
export const TYPE_LABEL = { 'full-time': 'Full-time', 'part-time': 'Part-time', internship: 'Internship', contract: 'Contract', freelance: 'Freelance' };
export const MODE_LABEL = { onsite: 'On-site', remote: 'Remote', hybrid: 'Hybrid' };
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const publicUrl = (job) => `${window.location.origin}/jobs/${job.id}`;
export function shareMessage(job, url) {
  const lines = ['🚨 NEW JOB OPPORTUNITY', ''];
  if (job.company) lines.push(`Company: ${job.company}`);
  lines.push(`Role: ${job.title}`);
  if (job.location) lines.push(`Location: ${job.location}`);
  if (job.experience) lines.push(`Experience: ${job.experience}`);
  if (job.salary) lines.push(`Salary: ${job.salary}`);
  lines.push('', 'Check job details and application instructions:', url, '', "Apply through the employer's original application page.");
  return lines.join('\n');
}
function setHead(sel, make, attr, value) {
  let el = document.head.querySelector(sel);
  if (!el) { el = make(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}
// Sets the document title, description, canonical URL and Open Graph tags for the current page.
// Pass { noindex: true } on private/utility pages (login, dashboards).
export function useMeta(title, description, opts = {}) {
  const { noindex = false } = opts;
  useEffect(() => {
    document.title = title;
    const mk = (tag, attrs) => () => Object.assign(document.createElement(tag), attrs);
    if (description) {
      setHead('meta[name="description"]', mk('meta', { name: 'description' }), 'content', description);
      setHead('meta[property="og:description"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:description'); return m; }, 'content', description);
    }
    const url = window.location.origin + window.location.pathname.replace(/(.)\/+$/, '$1');
    setHead('link[rel="canonical"]', mk('link', { rel: 'canonical' }), 'href', url);
    for (const [prop, val] of [['og:title', title], ['og:url', url], ['og:type', 'website'], ['og:site_name', 'TechAbhi']]) {
      setHead(`meta[property="${prop}"]`, () => { const m = document.createElement('meta'); m.setAttribute('property', prop); return m; }, 'content', val);
    }
    let robots = document.head.querySelector('meta[name="robots"]');
    if (noindex) { if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); } robots.content = 'noindex,nofollow'; }
    else if (robots && robots.content.startsWith('noindex')) robots.remove();
  }, [title, description, noindex]);
}
// Short initials + a stable colour for a company, so jobs without logos still look consistent (we never fake logos).
export const initials = (name = '') => (String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
const AVATAR_TONES = ['bg-indigo-50 text-indigo-700', 'bg-emerald-50 text-emerald-700', 'bg-sky-50 text-sky-700', 'bg-amber-50 text-amber-700', 'bg-rose-50 text-rose-700', 'bg-violet-50 text-violet-700', 'bg-teal-50 text-teal-700'];
export const avatarTone = (name = '') => AVATAR_TONES[[...String(name)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR_TONES.length];
export function timeAgo(d) {
  if (!d) return '';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return fmtDate(d);
}
export const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600';
export const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
export const btnPrimary = btn + ' bg-brand-600 text-white hover:bg-brand-700';
export const btnGhost = btn + ' border border-slate-300 bg-white text-slate-700 hover:bg-slate-100';

// Accept only in-app paths from ?next=. Rejects //host, /\host, absolute URLs and control characters.
export const safeNext = (n, fallback) => (typeof n === 'string' && /^\/(?![\/\\])[^\x00-\x1f\\]*$/.test(n) ? n : fallback);
export const safeHttp = (u) => /^https?:\/\//i.test(u || '');
export const emailLike = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

// ---- walk-in drive / remote helpers ----
export const istToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function ymdParts(ymd) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || ''); return m ? { y: +m[1], m: MONTHS[+m[2] - 1], d: +m[3] } : null; }
export const fmtDrive = (ymd) => { const p = ymdParts(ymd); return p ? `${p.d} ${p.m} ${p.y}` : ''; };
export const fmtTime = (hhmm) => { const m = /^(\d{2}):(\d{2})/.exec(hhmm || ''); if (!m) return ''; const h = +m[1]; return `${((h + 11) % 12) + 1}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`; };
/** upcoming | today | ongoing | expired, from the drive dates (Indian local date). */
export function driveState(job) {
  if (!job?.drive_date) return null;
  const t = istToday(); const end = job.drive_end_date || job.drive_date;
  if (t < job.drive_date) return 'upcoming';
  if (t > end) return 'expired';
  return job.drive_end_date && job.drive_end_date !== job.drive_date && t !== job.drive_date ? 'ongoing' : t === job.drive_date ? 'today' : 'ongoing';
}
export const DRIVE_LABEL = { upcoming: 'Upcoming', today: 'Today', ongoing: 'Ongoing', expired: 'Expired' };
export const directionsUrl = (job) => job.maps_url || (job.venue_address || job.venue ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([job.venue, job.venue_address].filter(Boolean).join(', '))}` : null);
export const REGION_LABEL = { india: 'India', worldwide: 'Worldwide', usa: 'USA', uk: 'UK', germany: 'Germany', canada: 'Canada', australia: 'Australia', europe: 'Europe', other: 'Other countries' };
export const SECTOR_LABEL = { it: 'IT', non_it: 'Non-IT', semi_it: 'Semi-IT' };
