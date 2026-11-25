import { pool } from '../db.js';
import { GUIDE_META } from './guides.js';
import { PUB } from './publicJobs.js';

export const baseUrl = () => (process.env.PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPE_MAP = { 'full-time': 'FULL_TIME', 'part-time': 'PART_TIME', internship: 'INTERN', contract: 'CONTRACTOR', freelance: 'CONTRACTOR' };

const REGION_COUNTRIES = { india: ['India'], usa: ['United States'], uk: ['United Kingdom'], germany: ['Germany'], canada: ['Canada'], australia: ['Australia'], europe: ['Europe'] };
const PERIOD = { year: 'YEAR', month: 'MONTH', hour: 'HOUR' };

export function jobHead(job) {
  const url = `${baseUrl()}/jobs/${job.id}`;
  const where = job.work_mode === 'remote' ? `Remote${job.remote_region_label ? ' – ' + job.remote_region_label : ''}` : job.location;
  const prefix = job.job_kind === 'walk_in' ? 'Walk-in: ' : '';
  const title = `${prefix}${job.title}${job.company ? ' at ' + job.company : ''}${where ? ' – ' + where : ''} | TechAbhi`;
  const desc = (job.description || `${job.title} job opening${job.company ? ' at ' + job.company : ''}. View details and apply on TechAbhi.`).replace(/\s+/g, ' ').slice(0, 155);
  const li = (a) => (a.length ? `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const drive = job.job_kind === 'walk_in' && job.drive_date ? `<p>Walk-in interview on ${esc(job.drive_date)}${job.reporting_time ? ', reporting time ' + esc(job.reporting_time) : ''}${job.venue_address ? ' at ' + esc(job.venue_address) : ''}.</p>` : '';
  const html = [drive, job.description && `<p>${esc(job.description)}</p>`, job.responsibilities.length && `<h3>Responsibilities</h3>${li(job.responsibilities)}`, job.requirements.length && `<h3>Requirements</h3>${li(job.requirements)}`, job.benefits.length && `<h3>Benefits</h3>${li(job.benefits)}`].filter(Boolean).join('');
  const country = job.country === 'India' || !job.country ? (process.env.DEFAULT_COUNTRY || 'IN') : job.country;
  const ld = {
    '@context': 'https://schema.org', '@type': 'JobPosting', title: job.title, description: html || esc(job.title),
    datePosted: new Date(job.published_at || job.created_at).toISOString().slice(0, 10), url, identifier: { '@type': 'PropertyValue', name: 'TechAbhi', value: String(job.id) },
    ...(job.expires_at && { validThrough: new Date(job.expires_at).toISOString() }),
    ...(job.employment_type && TYPE_MAP[job.employment_type] && { employmentType: TYPE_MAP[job.employment_type] }),
    ...(job.company && { hiringOrganization: { '@type': 'Organization', name: job.company, ...(job.company_website && { sameAs: job.company_website }), ...(job.logo_url && { logo: baseUrl() + job.logo_url }) } }),
    ...(job.education && { educationRequirements: job.education }),
    ...(job.openings && { totalJobOpenings: job.openings }),
    directApply: false,
  };
  if (job.work_mode === 'remote') {
    ld.jobLocationType = 'TELECOMMUTE';
    const regions = REGION_COUNTRIES[job.remote_region];
    if (job.remote_region === 'other' && job.remote_country) ld.applicantLocationRequirements = { '@type': 'Country', name: job.remote_country };
    else if (regions) ld.applicantLocationRequirements = regions.map((name) => ({ '@type': 'Country', name }));
    // "worldwide" / unspecified: no applicantLocationRequirements, so the posting does not claim a country restriction it does not have
  } else if (job.city || job.location) {
    ld.jobLocation = { '@type': 'Place', address: { '@type': 'PostalAddress', ...(job.address && { streetAddress: job.address }), addressLocality: job.city || job.location, ...(job.state && { addressRegion: job.state }), addressCountry: country } };
  }
  if (job.salary_min && job.salary_max) ld.baseSalary = { '@type': 'MonetaryAmount', currency: job.salary_currency || 'INR', value: { '@type': 'QuantitativeValue', minValue: job.salary_min, maxValue: job.salary_max, unitText: PERIOD[job.salary_period] || 'YEAR' } };
  const jsonld = JSON.stringify(ld).replace(/</g, '\\u003c');
  return `<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="TechAbhi"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><script type="application/ld+json">${jsonld}</script>`;
}

// Server-rendered <head> for public pages that are not job posts, so crawlers see unique titles/descriptions without running JS.
const PAGES = {
  '/': ['TechAbhi – Find Jobs, Internships and Fresher Openings in India', 'Search job openings, internships, fresher and remote roles. Read the details on TechAbhi and apply through the employer.'],
  '/jobs': ['Browse Jobs | TechAbhi', 'Search and filter current job openings by title, skill, company, location, experience, salary and work mode.'],
  '/internships': ['Internships | TechAbhi', 'Browse internship opportunities for students and freshers, with stipend, location and skills listed up front.'],
  '/remote-jobs': ['Remote Jobs – Work From Home, India and Worldwide | TechAbhi', 'Find genuinely remote and work-from-home jobs and internships. See whether a role hires in India, worldwide or a specific country before you apply.'],
  '/walk-in-drive': ['Walk-in Drives – Interview Dates, Venues and Documents | TechAbhi', 'Upcoming and today’s walk-in interview drives with venue, reporting time, documents required and the official registration link. Expired drives are removed.'],
  '/all-india-jobs': ['All India Jobs – Search by State and City | TechAbhi', 'Browse private-sector, MNC, IT and non-IT jobs across every Indian state and union territory, for freshers and experienced candidates.'],
  '/fresher-jobs': ['Fresher Jobs | TechAbhi', 'Entry-level and fresher job openings for recent graduates.'],
  '/companies': ['Companies Hiring Now | TechAbhi', 'See which companies currently have open roles on TechAbhi and browse their jobs.'],
  '/career-resources': ['Career Resources | TechAbhi', 'Practical guides on resumes, ATS, interviews, job-search scams and starting your career.'],
  '/resume-services': ['Resume and Career Support | TechAbhi', 'Check your resume against a job, build your profile from your resume, and request career assistance from the TechAbhi team.'],
  '/for-recruiters': ['For Recruiters – Post Jobs on TechAbhi', 'Register your company, post jobs and review applications from candidates who consent to share their profile.'],
  '/about': ['About TechAbhi', 'What TechAbhi is, how it works and how it treats candidate data.'],
  '/contact': ['Contact TechAbhi', 'Get in touch with the TechAbhi team.'],
  '/privacy': ['Privacy Policy | TechAbhi', 'How TechAbhi handles personal data.'],
  '/terms': ['Terms of Use | TechAbhi', 'The terms for using TechAbhi.'],
};
const PRIVATE = /^\/(admin|candidate|recruiter|login|register|forgot-password|reset-password)(\/|$)/;
export const isPrivatePath = (p) => PRIVATE.test(p);
export function pageHead(path) {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  if (isPrivatePath(clean)) return '<meta name="robots" content="noindex,nofollow">';
  const g = clean.startsWith('/career-resources/') ? GUIDE_META.find((x) => `/career-resources/${x.slug}` === clean) : null;
  const guide = g ? [`${g.title} | TechAbhi`, g.summary] : null;
  let coName = null;
  if (clean.startsWith('/companies/')) { try { coName = decodeURIComponent(clean.slice('/companies/'.length)).slice(0, 120); } catch { coName = null; } }
  const co = coName ? [`Jobs at ${coName} | TechAbhi`, `Open roles at ${coName} on TechAbhi. Read the details and apply through the employer.`] : null;
  const m = PAGES[clean] || guide || co;
  if (!m) return '';
  const url = `${baseUrl()}${clean === '/' ? '' : clean}`;
  const [title, desc] = m.map(esc);
  return `<title>${title}</title><meta name="description" content="${desc}"><link rel="canonical" href="${url}">\n<meta property="og:type" content="website"><meta property="og:site_name" content="TechAbhi"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="summary">`;
}

export async function sitemap(req, res) {
  const b = baseUrl();
  const [jobs] = await pool.query(`SELECT id, updated_at FROM jobs WHERE ${PUB} ORDER BY published_at DESC LIMIT 5000`);
  const fixed = ['', '/jobs', '/internships', '/remote-jobs', '/walk-in-drive', '/all-india-jobs', '/fresher-jobs', '/companies', '/career-resources', '/resume-services', '/for-recruiters', '/about', '/contact', '/privacy', '/terms'];
  const [cos] = await pool.query(`SELECT DISTINCT company FROM jobs WHERE ${PUB} AND company IS NOT NULL AND company <> '' LIMIT 2000`);
  const guides = GUIDE_META.map((g) => g.slug).map((g) => `/career-resources/${g}`);
  const urls = [...[...fixed, ...guides].map((p) => `<url><loc>${b}${p}</loc></url>`), ...cos.map((c) => `<url><loc>${b}/companies/${encodeURIComponent(c.company)}</loc></url>`), ...jobs.map((j) => `<url><loc>${b}/jobs/${j.id}</loc><lastmod>${new Date(j.updated_at).toISOString()}</lastmod></url>`)];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
}
export const robots = (req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /candidate\nDisallow: /recruiter\nDisallow: /api/\nAllow: /\nSitemap: ${baseUrl()}/sitemap.xml\n`);
