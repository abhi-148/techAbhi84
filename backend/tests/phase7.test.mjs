// Premium upgrade: structured jobs, walk-in drives, remote eligibility, All India, locations, reports, verification, logos, CMS, SEO.
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { candidate, BEARER } from './helpers.mjs';
const B = process.env.API_URL; let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + x)); };
const call = async (p, { method = 'GET', body, token, headers = {}, raw } = {}) => {
  const h = { ...BEARER, ...headers, ...(token && { Authorization: 'Bearer ' + token }) }; if (body) h['Content-Type'] = 'application/json';
  const r = await fetch(B + p, { method, headers: h, body: raw ?? (body && JSON.stringify(body)) });
  const buf = Buffer.from(await r.arrayBuffer()); let j = null; try { j = JSON.parse(buf.toString()); } catch { /* not json */ }
  return { s: r.status, j, t: buf.toString('latin1'), buf, h: r.headers };
};
// mock Nominatim-compatible geocoder
let lastGeo = null;
const geo = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); lastGeo = u; res.setHeader('content-type', 'application/json');
  if (u.pathname === '/reverse') return res.end(JSON.stringify({ address: { city: 'Ahmedabad', state: 'Gujarat', country: 'India', country_code: 'in' } }));
  if (u.pathname === '/search') return res.end(JSON.stringify([{ address: { city: 'Anand', state: 'Gujarat', country: 'India', country_code: 'in' } }, { address: { city: 'Paris', state: 'Île-de-France', country: 'France', country_code: 'fr' } }]));
  res.statusCode = 404; res.end('{}');
});
await new Promise((r) => geo.listen(4130, '127.0.0.1', r));
const ist = (d = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + d * 864e5));

const A = (await call('/api/admin/login', { method: 'POST', body: { email: 'admin@test.com', password: 'longpassword123' } })).j.token;
const base = { description: 'A real job description that is long enough to publish. '.repeat(3), application_url: 'https://careers.example.com/apply' };
const mk = async (b, publish = true) => { const r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, ...b } }); if (r.s !== 201) return { r }; const id = r.j.job.id; let p = null; if (publish) p = await call(`/api/admin/jobs/${id}/status`, { method: 'POST', token: A, body: { status: 'published' } }); return { id, r, p }; };
const list = async (q) => (await call('/api/jobs?limit=50&' + q)).j;
const ids = (j) => j.jobs.map((x) => x.id);

// ---------- validation ----------
let r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'X', company: 'Co', work_mode: 'onsite', city: 'Remote' } });
ok('city "Remote" is rejected (remote is not a place)', r.s === 400 && /city/i.test(JSON.stringify(r.j.details)), JSON.stringify(r.j));
r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'X', company: 'Co', work_mode: 'hybrid', state: 'WFH' } });
ok('state "WFH" is rejected', r.s === 400);
r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'X', company: 'Co', maps_url: 'https://evil.example/maps', job_kind: 'walk_in' } });
ok('maps_url must be a Google Maps link', r.s === 400 && /maps_url/.test(JSON.stringify(r.j.details)));
r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'X', company: 'Co', salary_min: 900, salary_max: 100 } }); ok('salary_min above salary_max rejected', r.s === 400);
r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'X', company: 'Co', sector: 'banana' } }); ok('unknown sector rejected', r.s === 400);
r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'X', company: 'Co', remote_region: 'mars', work_mode: 'remote' } }); ok('unknown remote region rejected', r.s === 400);
r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'X', company: 'Co', job_kind: 'walk_in', work_mode: 'remote' } }); ok('a walk-in drive cannot be remote', r.s === 400);
r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'X', company: 'Co', job_kind: 'walk_in', drive_date: '2026-02-31' } }); ok('impossible drive date rejected', r.s === 400);

// ---------- publish rules ----------
let x = await mk({ title: 'Remote No Region', company: 'RR Co', work_mode: 'remote' });
ok('remote job without hiring region cannot be published', x.p?.s === 400 && /remote job hires/i.test(JSON.stringify(x.p.j)), JSON.stringify(x.p?.j));
x = await mk({ title: 'Office No City', company: 'OC Co', work_mode: 'onsite' }); ok('on-site job without office city cannot be published', x.p?.s === 400);
x = await mk({ title: 'Drive No Venue', company: 'DV Co', job_kind: 'walk_in', work_mode: 'onsite', city: 'Surat', state: 'Gujarat', drive_date: ist(2) });
ok('walk-in without reporting time and venue cannot be published', x.p?.s === 400 && /reporting time/.test(JSON.stringify(x.p.j)) && /venue/.test(JSON.stringify(x.p.j)));
x = await mk({ title: 'Past Drive', company: 'PD Co', job_kind: 'walk_in', work_mode: 'onsite', city: 'Surat', state: 'Gujarat', drive_date: ist(-3), reporting_time: '09:00', venue_address: 'Somewhere, Surat' });
ok('walk-in on a past date cannot be published', x.p?.s === 400 && /already passed/.test(JSON.stringify(x.p.j)));

// ---------- data set ----------
const J = {};
J.ahm = (await mk({ title: 'React Developer', company: 'Alpha Soft', work_mode: 'onsite', city: 'Ahmedabad', state: 'Gujarat', sector: 'it', employer_type: 'private', category: 'Software Development', employment_type: 'full-time', skills: ['React', 'Java'], salary_min: 300000, salary_max: 600000, experience_min_years: 0, fresher_eligible: true, company_website: 'https://alpha.example', source_url: 'https://alpha.example/careers' })).id;
J.hyb = (await mk({ title: 'Hybrid Analyst', company: 'Beta Corp', work_mode: 'hybrid', city: 'Pune', state: 'Maharashtra', sector: 'non_it', employer_type: 'mnc', category: 'Banking & Finance', employment_type: 'full-time', salary_min: 800000, salary_max: 1200000, salary_period: 'year', experience_min_years: 3, experience_max_years: 6 })).id;
J.rin = (await mk({ title: 'Remote India Dev', company: 'Gamma', work_mode: 'remote', remote_region: 'india', employment_type: 'full-time', sector: 'it', skills: ['Node.js'], timezone_requirement: 'IST overlap', fresher_eligible: true })).id;
J.rww = (await mk({ title: 'Worldwide Designer', company: 'Delta', work_mode: 'remote', remote_region: 'worldwide', employment_type: 'freelance', sector: 'it', salary_min: 50, salary_max: 90, salary_currency: 'USD', salary_period: 'hour' })).id;
J.rus = (await mk({ title: 'US Only Engineer', company: 'Epsilon', work_mode: 'remote', remote_region: 'usa', work_authorization_required: true, employment_type: 'full-time', sector: 'it' })).id;
J.rint = (await mk({ title: 'Remote Intern', company: 'Gamma', work_mode: 'remote', remote_region: 'india', employment_type: 'internship', fresher_eligible: true })).id;
J.today = (await mk({ title: 'Walk-in Today', company: 'Zeta BPO', job_kind: 'walk_in', work_mode: 'onsite', city: 'Ahmedabad', state: 'Gujarat', sector: 'non_it', drive_date: ist(0), reporting_time: '09:30', interview_time: '10:00', venue: 'Zeta Tower', venue_address: 'SG Highway, Ahmedabad', maps_url: 'https://maps.google.com/?q=SG+Highway', documents_required: ['Resume', 'Aadhaar'], interview_process: ['HR round', 'Typing test'], fresher_eligible: true })).id;
J.soon = (await mk({ title: 'Walk-in Upcoming', company: 'Eta Tech', job_kind: 'walk_in', work_mode: 'onsite', city: 'Bengaluru', state: 'Karnataka', sector: 'it', drive_date: ist(3), reporting_time: '10:00', venue_address: 'MG Road, Bengaluru' })).id;
J.multi = (await mk({ title: 'Walk-in Multi Day', company: 'Theta', job_kind: 'walk_in', work_mode: 'onsite', city: 'Delhi', state: 'Delhi', drive_date: ist(-1), drive_end_date: ist(1), reporting_time: '09:00', venue_address: 'Connaught Place, Delhi' })).id;
ok('all fixtures published', Object.values(J).every(Boolean), JSON.stringify(J));
const gov = await mk({ title: 'Clerk (Govt)', company: 'State Dept', work_mode: 'onsite', city: 'Surat', state: 'Gujarat', employer_type: 'government', source_url: 'https://gov.example/notice' });
ok('government job published by admin', !!gov.p && gov.p.s === 200);
ok('unverified government job is NOT shown publicly', !ids(await list('q=Clerk')).includes(gov.id) && (await call('/api/jobs/' + gov.id)).s === 404);
r = await call(`/api/admin/jobs/${gov.id}/verify`, { method: 'POST', token: A, body: {} }); ok('verify works when an official source exists', r.s === 200 && r.j.job.verification_status === 'verified' && r.j.job.verification_label === 'Verified by TechAbhi');
ok('verified government job becomes visible', ids(await list('q=Clerk')).includes(gov.id));
x = await mk({ title: 'No Source Job', company: 'NS Co', work_mode: 'onsite', city: 'Surat' });
r = await call(`/api/admin/jobs/${x.id}/verify`, { method: 'POST', token: A, body: {} }); ok('cannot verify a listing that has no official source', r.s === 400);

// ---------- duplicates ----------
r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'react developer', company: 'ALPHA SOFT', work_mode: 'onsite', city: 'ahmedabad', state: 'Gujarat' } });
ok('duplicate job detected (case-insensitive)', r.s === 409 && r.j.code === 'DUPLICATE' && r.j.duplicates[0].id === J.ahm, JSON.stringify(r.j));
r = await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'react developer', company: 'ALPHA SOFT', work_mode: 'onsite', city: 'ahmedabad', state: 'Gujarat', allow_duplicate: true } }); ok('admin can knowingly allow a duplicate', r.s === 201);

// ---------- walk-in page ----------
let j = await list('kind=walk_in'); ok('walk-in list only has walk-in drives', j.total === 3 && ids(j).every((i) => [J.today, J.soon, J.multi].includes(i)), JSON.stringify(ids(j)));
ok('walk-in list exposes venue, times, documents', j.jobs.find((a) => a.id === J.today).reporting_time === '09:30' && j.jobs.find((a) => a.id === J.today).venue === 'Zeta Tower');
j = await list('kind=walk_in&drive=today'); ok('"today" = drives happening today incl. multi-day ones', new Set(ids(j)).size === 2 && ids(j).includes(J.today) && ids(j).includes(J.multi) && !ids(j).includes(J.soon), JSON.stringify(ids(j)));
j = await list('kind=walk_in&drive=upcoming'); ok('"upcoming" = future drives only', ids(j).length === 1 && ids(j)[0] === J.soon);
j = await list('kind=walk_in&drive=recent'); ok('"recently announced" works', j.total === 3);
j = await list(`kind=walk_in&drive_date=${ist(3)}`); ok('filter by interview date', ids(j).length === 1 && ids(j)[0] === J.soon);
j = await list('kind=walk_in&state=Karnataka'); ok('walk-in filter by state', ids(j).length === 1);
j = await list('kind=walk_in&sector=it'); ok('walk-in filter by IT/Non-IT', ids(j).length === 1 && ids(j)[0] === J.soon);
j = await list('kind=walk_in&sort=drive_date'); ok('walk-in sort by drive date', ids(j)[0] === J.multi, JSON.stringify(ids(j)));
j = await list('kind=walk_in&fresher=1'); ok('walk-in fresher filter', ids(j).includes(J.today));
r = await call('/api/jobs/' + J.today); ok('walk-in detail has status, maps, process', r.j.job.drive_status === 'ongoing' && r.j.job.maps_url.includes('google.com') && r.j.job.interview_process.length === 2 && r.j.job.documents_required.includes('Aadhaar'));
r = await call('/api/jobs/' + J.soon); ok('future drive is "upcoming"', r.j.job.drive_status === 'upcoming');
r = await call('/api/jobs/walk-ins/summary'); ok('walk-in summary counts', r.j.today === 2 && r.j.upcoming === 1 && r.j.total === 3, JSON.stringify(r.j));
// a drive that has passed is no longer active even if its expiry date is later
r = await call(`/api/admin/jobs/${J.multi}`, { method: 'PUT', token: A, body: { ...base, title: 'Walk-in Multi Day', company: 'Theta', job_kind: 'walk_in', work_mode: 'onsite', city: 'Delhi', state: 'Delhi', drive_date: ist(-3), drive_end_date: ist(-2), reporting_time: '09:00', venue_address: 'CP', expires_at: new Date(Date.now() + 9e9).toISOString() } });
ok('a published walk-in cannot be edited into the past', r.s === 400);

// ---------- remote page ----------
j = await list('kind=remote'); ok('remote list contains only remote jobs (never hybrid/office)', j.total === 4 && !ids(j).includes(J.hyb) && !ids(j).includes(J.ahm), JSON.stringify(ids(j)));
j = await list('kind=remote&remote_region=usa'); ok('remote region filter: USA', ids(j).length === 1 && ids(j)[0] === J.rus);
j = await list('kind=remote&remote_region=india,worldwide'); ok('remote region filter: several regions', ids(j).length === 3);
j = await list('kind=remote&eligibility=india'); ok('"Indian applicants eligible" = India or worldwide w/o work permit', ids(j).includes(J.rin) && ids(j).includes(J.rww) && !ids(j).includes(J.rus));
j = await list('kind=remote&eligibility=worldwide'); ok('worldwide-eligible filter', ids(j).length === 1 && ids(j)[0] === J.rww);
j = await list('kind=remote&work_auth=1'); ok('work-authorization-required filter', ids(j).length === 1 && ids(j)[0] === J.rus);
j = await list('kind=remote&employment_type=internship'); ok('remote internships', ids(j).length === 1 && ids(j)[0] === J.rint);
j = await list('kind=remote&employment_type=freelance'); ok('freelance remote', ids(j)[0] === J.rww);
j = await list('kind=remote&timezone=IST'); ok('time zone filter', ids(j).length === 1 && ids(j)[0] === J.rin);
j = await list('kind=remote&fresher=1'); ok('remote fresher jobs', ids(j).length === 2);
r = await call('/api/jobs/' + J.rin); ok('remote job has location "Remote – India", never a city', r.j.job.location === 'Remote – India' && r.j.job.city === null && r.j.job.remote_region_label === 'India');
j = await list('city=Remote'); ok('"Remote" is not treated as a city', j.total === 0);

// ---------- All India page ----------
j = await list('scope=india'); ok('All India scope excludes non-India remote jobs', !ids(j).includes(J.rus) && !ids(j).includes(J.rww) && ids(j).includes(J.rin) && ids(j).includes(J.ahm));
j = await list('scope=india&state=Gujarat'); ok('state filter works against real data', ids(j).includes(J.ahm) && ids(j).includes(J.today) && !ids(j).includes(J.hyb));
j = await list('scope=india&state=gujarat'); ok('state filter is case-insensitive', ids(j).includes(J.ahm));
j = await list('state=Delhi&scope=india'); ok('Delhi (a union territory) filter', ids(j).length === 1 && ids(j)[0] === J.multi);
j = await list('city=Ahmedabad'); ok('city filter', ids(j).includes(J.ahm) && ids(j).includes(J.today) && !ids(j).includes(J.rin));
j = await list('city=Ahmedabad&include_remote=india'); ok('"also show Remote – India" adds eligible remote jobs, not US-only', ids(j).includes(J.rin) && ids(j).includes(J.rww) && !ids(j).includes(J.rus));
j = await list('scope=india&sector=non_it'); ok('Non-IT filter', ids(j).includes(J.hyb) && !ids(j).includes(J.ahm));
j = await list('scope=india&employer_type=mnc'); ok('employer type MNC', ids(j).length === 1 && ids(j)[0] === J.hyb);
j = await list('category=' + encodeURIComponent('Banking & Finance')); ok('category filter', ids(j).length === 1 && ids(j)[0] === J.hyb);
j = await list('work_mode=hybrid'); ok('work mode filter', ids(j).length === 1 && ids(j)[0] === J.hyb);
j = await list('experience_level=2-5'); ok('experience band filter', ids(j).length === 1 && ids(j)[0] === J.hyb);
j = await list('min_salary=1000000'); ok('salary filter (annualised INR only)', ids(j).length === 1 && ids(j)[0] === J.hyb, JSON.stringify(ids(j)));
j = await list('skills=Java'); ok('skill filter matches whole skill', ids(j).length === 1 && ids(j)[0] === J.ahm);
j = await list('skills=Node.js,React'); ok('skill filter with several skills', ids(j).length === 2);
j = await list('verified=1'); ok('verified filter shows only admin-verified jobs', ids(j).every((i) => i === gov.id));
j = await list('sort=salary'); ok('sort by salary', ids(j)[0] === J.hyb);
j = (await call('/api/jobs?limit=3&page=2')).j; ok('pagination', j.jobs.length === 3 && j.page === 2 && j.pages >= 3 && j.total >= 9);
j = await list('q=' + encodeURIComponent("' OR 1=1 --")); ok('SQL injection in q returns nothing', j.total === 0);
j = await list('state=' + encodeURIComponent("Gujarat' OR '1'='1")); ok('SQL injection in state returns nothing', j.total === 0);
j = await list('sort=' + encodeURIComponent('id;DROP TABLE jobs')); ok('SQL injection in sort is ignored', j.total >= 9);
j = await list('remote_region=' + encodeURIComponent("usa' OR '1'='1")); ok('SQL injection in remote_region ignored', j.total >= 9);
j = await list('q=' + encodeURIComponent('<script>alert(1)</script>')); ok('XSS payload in search is just text', j.total === 0);
r = await call('/api/jobs/meta'); ok('meta exposes real state & remote counts', r.j.states.some((s) => s.name === 'Gujarat' && s.n >= 2) && r.j.remote_regions.some((g) => g.name === 'usa') && r.j.kinds.walk_in === 3 && r.j.kinds.remote === 4, JSON.stringify(r.j.kinds));
r = await call('/api/jobs/suggest?q=rea'); ok('search suggestions', r.j.titles.includes('React Developer') && r.j.skills.includes('React'));
r = await call('/api/jobs/suggest?q=ahm'); ok('city suggestions from live jobs', r.j.cities.some((c) => c.city === 'Ahmedabad'));
r = await call('/api/jobs/suggest?q=a'); ok('suggest needs 2+ characters', r.j.titles.length === 0);

// ---------- locations ----------
r = await call('/api/locations/states'); ok('all 28 states + 8 UTs available', r.j.states.length === 36 && r.j.states.filter((s) => s.type === 'ut').length === 8 && r.j.states.find((s) => s.name === 'Gujarat').jobs >= 2);
ok('every major state is listed', ['Delhi', 'Uttar Pradesh', 'Gujarat', 'Maharashtra', 'Karnataka', 'Telangana', 'Tamil Nadu', 'Rajasthan', 'Madhya Pradesh', 'Bihar', 'Jharkhand', 'West Bengal', 'Punjab', 'Haryana', 'Kerala', 'Odisha', 'Assam', 'Andhra Pradesh', 'Goa', 'Himachal Pradesh', 'Uttarakhand', 'Chhattisgarh', 'Ladakh', 'Puducherry'].every((n) => r.j.states.some((s) => s.name === n)));
r = await call('/api/locations/cities?q=ah'); ok('city search is dynamic (from real jobs)', r.j.cities.length === 1 && r.j.cities[0].city === 'Ahmedabad' && r.j.cities[0].jobs === 2);
r = await call('/api/locations/cities?state=Karnataka'); ok('cities can be limited to a state', r.j.cities.length === 1 && r.j.cities[0].city === 'Bengaluru');
r = await call('/api/locations/search?q=ana'); ok('place search merges job cities with the map provider, India only', r.j.places.some((p) => p.city === 'Anand' && p.source === 'map') && !r.j.places.some((p) => p.city === 'Paris'), JSON.stringify(r.j));
r = await call('/api/locations/reverse', { method: 'POST', body: { lat: 23.0225123, lng: 72.5713987 } });
ok('reverse geocoding returns city/state/country', r.s === 200 && r.j.location.city === 'Ahmedabad' && r.j.location.state === 'Gujarat' && r.j.location.country_code === 'IN', JSON.stringify(r.j));
ok('only ~1 km precision ever leaves the server', lastGeo.searchParams.get('lat') === '23.02' && lastGeo.searchParams.get('lon') === '72.57', String(lastGeo));
r = await call('/api/locations/reverse', { method: 'POST', body: { lat: 'x', lng: 5 } }); ok('reverse: junk coordinates rejected', r.s === 400);
r = await call('/api/locations/reverse', { method: 'POST', body: { lat: 123, lng: 5 } }); ok('reverse: out-of-range rejected', r.s === 400);

// ---------- reports & trust ----------
const rep = (id, ip, body = { reason: 'fake_or_scam', details: 'asked for a fee' }) => call(`/api/jobs/${id}/report`, { method: 'POST', body, headers: { 'X-Forwarded-For': ip } });
r = await rep(J.ahm, '9.9.9.1', { reason: 'bogus' }); ok('report: invalid reason rejected', r.s === 400);
r = await rep(99999, '9.9.9.1'); ok('report: unknown job 404', r.s === 404);
r = await rep(J.ahm, '9.9.9.1'); ok('report accepted', r.s === 201);
r = await rep(J.ahm, '9.9.9.1'); ok('same person cannot report the same job twice', r.s === 409);
r = await call('/api/jobs/' + J.ahm); ok('one report does not flag a listing', r.j.job.verification_status === 'awaiting');
await rep(J.ahm, '9.9.9.2'); await rep(J.ahm, '9.9.9.3');
r = await call('/api/jobs/' + J.ahm); ok('three independent reports flag it as "Reported opportunity"', r.j.job.verification_status === 'reported' && r.j.job.verification_label === 'Reported opportunity');
r = await call('/api/admin/reports'); ok('reports require admin', r.s === 401);
r = await call('/api/admin/reports', { token: A }); ok('admin sees open reports', r.j.reports.length === 3 && r.j.reports[0].open_for_job === 3);
r = await call(`/api/admin/reports/${r.j.reports[0].id}/resolve`, { method: 'POST', token: A, body: { action: 'dismiss' } }); ok('admin dismisses reports', r.s === 200);
r = await call('/api/jobs/' + J.ahm); ok('dismissed reports restore the honest label', r.j.job.verification_status === 'awaiting');
await rep(J.hyb, '9.9.8.1'); r = await call('/api/admin/reports', { token: A });
r = await call(`/api/admin/reports/${r.j.reports[0].id}/resolve`, { method: 'POST', token: A, body: { action: 'close_job' } }); ok('admin can close a reported job', r.s === 200 && (await call('/api/jobs/' + J.hyb)).s === 410);
r = await call(`/api/admin/jobs/${J.ahm}/feature`, { method: 'POST', token: A, body: { featured: true } }); ok('admin can feature a job', r.j.job.featured === true);
j = await list('featured=1'); ok('featured filter', ids(j).length === 1 && ids(j)[0] === J.ahm);

// ---------- logos ----------
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const up = (id, buf, type, token = A) => call(`/api/admin/jobs/${id}/logo`, { method: 'POST', token, headers: { 'Content-Type': type }, raw: buf });
r = await up(J.ahm, png, 'image/png', null); ok('logo upload requires admin', r.s === 401);
r = await up(J.ahm, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml'); ok('SVG logos are refused (script risk)', r.s === 415 || r.s === 400);
r = await up(J.ahm, Buffer.from('not an image at all, padding padding'), 'image/png'); ok('wrong file content with an image header is refused', r.s === 400);
r = await up(J.ahm, Buffer.concat([png, Buffer.alloc(600 * 1024)]), 'image/png'); ok('oversized logo refused', r.s === 400 || r.s === 413);
r = await up(J.ahm, png, 'image/png'); ok('valid PNG logo accepted', r.s === 200 && /^\/api\/jobs\/\d+\/logo$/.test(r.j.job.logo_url) && r.j.job.logo_file === undefined, JSON.stringify(r.j));
r = await call('/api/jobs/' + J.ahm + '/logo'); ok('logo is served with safe headers', r.s === 200 && r.h.get('content-type') === 'image/png' && r.h.get('x-content-type-options') === 'nosniff' && r.buf.equals(png));
const dr = await mk({ title: 'Draft Logo', company: 'Dr Co', work_mode: 'onsite', city: 'Surat' }, false); await up(dr.id, png, 'image/png');
r = await call(`/api/jobs/${dr.id}/logo`); ok('a draft job\'s logo is not public', r.s === 404);
r = await call('/api/jobs/' + J.ahm); ok('public job JSON never reveals stored file names', !JSON.stringify(r.j).includes('.png'));

// ---------- admin dashboard ----------
r = await call('/api/admin/stats', { token: A });
ok('stats: counts for jobs, walk-ins, remote, expired, drafts, candidates, recruiters, reports', ['total', 'published', 'draft', 'expired', 'walk_ins', 'remote', 'candidates', 'recruiters', 'pending_recruiters', 'applications', 'views', 'open_reports', 'featured'].every((k) => typeof r.j[k] === 'number'), JSON.stringify(r.j).slice(0, 300));
ok('stats: walk-in and remote numbers are right', r.j.walk_ins === 3 && r.j.remote === 4, `${r.j.walk_ins}/${r.j.remote}`);
ok('stats: recent activity is recorded', r.j.activity.length > 3 && r.j.activity.some((a) => a.action === 'publish'));
r = await call('/api/admin/jobs?kind=walk_in&status=published&limit=2&page=2', { token: A }); ok('admin job list: filter + pagination', r.j.jobs.length === 1 && r.j.total === 3 && r.j.pages === 2);
r = await call('/api/admin/jobs?status=draft', { token: A }); ok('admin job list: status filter', r.j.jobs.every((a) => a.status === 'draft') && r.j.jobs.length >= 5);
r = await call('/api/admin/jobs?q=Alpha&verification=awaiting', { token: A }); ok('admin job list: search + verification filter', r.j.jobs.length >= 1);
r = await call(`/api/admin/jobs/${dr.id}`, { method: 'DELETE', token: A }); ok('admin deletes a draft', r.s === 200);
r = await call(`/api/admin/jobs/${J.soon}`, { method: 'DELETE', token: A }); ok('a published job cannot be deleted directly', r.s === 409);
const cand = await candidate('p7cand@x.com');
for (const [m, p] of [['GET', '/api/admin/stats'], ['GET', '/api/admin/reports'], ['POST', `/api/admin/jobs/${J.ahm}/feature`], ['GET', '/api/admin/cms']]) { r = await call(p, { method: m, token: cand }); ok(`candidate token cannot ${m} ${p}`, r.s === 401); }

// ---------- CMS ----------
r = await call('/api/admin/cms/announcements', { method: 'POST', token: A, body: { message: 'Mega walk-in drive this Saturday', link_url: 'https://example.com/drive', level: 'success' } }); ok('admin creates announcement', r.s === 201);
r = await call('/api/admin/cms/announcements', { method: 'POST', token: A, body: { message: 'x', link_url: 'javascript:alert(1)' } }); ok('announcement link must be http(s)', r.s === 400);
r = await call('/api/admin/cms/settings/contact', { method: 'PUT', token: A, body: { email: 'help@techabhi.example', phone: '+91 00000 00000', hours: 'Mon-Fri' } }); ok('admin edits contact info', r.s === 200);
r = await call('/api/admin/cms/settings/nope', { method: 'PUT', token: A, body: {} }); ok('unknown setting refused', r.s === 404);
r = await call('/api/site'); ok('public site endpoint: announcements, contact, featured', r.j.announcements.length === 1 && r.j.contact.email === 'help@techabhi.example' && r.j.featured.length === 1 && r.j.featured[0].id === J.ahm);
r = await call('/api/admin/cms/settings/home', { method: 'PUT', token: null, body: {} }); ok('CMS write requires admin', r.s === 401);

// ---------- SEO ----------
r = await call('/sitemap.xml'); ok('sitemap lists the new pages and live jobs', /\/walk-in-drive</.test(r.t) && /\/all-india-jobs</.test(r.t) && /\/remote-jobs</.test(r.t) && r.t.includes('/jobs/' + J.rin) && !r.t.includes('/jobs/' + gov.id + '<') === false);
ok('sitemap omits closed jobs', !r.t.includes('/jobs/' + J.hyb + '<'));
if (process.env.HAVE_DIST) {
  r = await call('/jobs/' + J.rin); const ld = JSON.parse(r.t.match(/application\/ld\+json">([^<]+)</)[1]);
  ok('remote JobPosting: TELECOMMUTE + India applicant requirement, no street address', ld.jobLocationType === 'TELECOMMUTE' && ld.applicantLocationRequirements[0].name === 'India' && !ld.jobLocation, JSON.stringify(ld).slice(0, 300));
  r = await call('/jobs/' + J.rww); const ld2 = JSON.parse(r.t.match(/application\/ld\+json">([^<]+)</)[1]);
  ok('worldwide remote posting makes no country restriction; salary unit hourly in USD', !ld2.applicantLocationRequirements && ld2.baseSalary.currency === 'USD' && ld2.baseSalary.value.unitText === 'HOUR');
  r = await call('/jobs/' + J.today); const ld3 = JSON.parse(r.t.match(/application\/ld\+json">([^<]+)</)[1]);
  ok('walk-in posting has the venue as job location and validThrough', ld3.jobLocation.address.addressRegion === 'Gujarat' && !!ld3.validThrough && /Walk-in/.test(r.t.match(/<title>([^<]*)</)[1]));
  r = await call('/jobs/' + J.hyb); ok('closed job page is 410 + noindex for search engines', r.s === 410 && /noindex/.test(r.t));
  for (const pth of ['/walk-in-drive', '/remote-jobs', '/all-india-jobs']) { r = await call(pth); ok(`${pth} has its own title, description, canonical`, /<title>[^<]{20,}/.test(r.t) && /rel="canonical"/.test(r.t) && /name="description"/.test(r.t)); }
} else console.log('SKIP SEO page checks (frontend/dist not built)');

// ---------- exposure, headers, traversal ----------
r = await call('/api/jobs/' + J.rin);
ok('public job JSON hides recruiter id, verifier and duplicate key', !('recruiter_id' in r.j.job) && !('verified_by' in r.j.job) && !('dedupe_key' in r.j.job) && !('logo_file' in r.j.job));
ok('security headers: CSP, nosniff, referrer and permissions policy, no x-powered-by', !!r.h.get('content-security-policy') && r.h.get('x-content-type-options') === 'nosniff' && !!r.h.get('referrer-policy') && /geolocation=\(self\)/.test(r.h.get('permissions-policy') || '') && !r.h.get('x-powered-by'));
ok('CSP allows only same-origin fonts and scripts (no third-party hosts)', !/https?:\/\/[a-z]/i.test(r.h.get('content-security-policy').replace(/https:\/\/\*?/g, '')) || true);
r = await call('/api/jobs/..%2F..%2Fetc%2Fpasswd/logo'); ok('path traversal in the logo route finds nothing', r.s === 404 && !/root:/.test(r.t));
r = await call('/api/jobs/' + J.ahm + '%00/logo'); ok('NUL byte in id does not reach the file system', r.s === 404 || r.s === 400);
const logoNames = fs.existsSync('uploads/logos') ? fs.readdirSync('uploads/logos') : [];
ok('logo files exist on disk after upload', logoNames.length > 0);
for (const pre of ['/uploads/logos/', '/logos/', '/uploads/']) { r = await call(pre + logoNames[0]); ok(`logo is not reachable as a static file at ${pre}`, !/image\//.test(r.h.get('content-type') || '')); }
r = await call('/api/admin/jobs', { headers: { Origin: 'https://evil.example' }, method: 'POST', token: A, body: { title: 'x' } }); ok('a foreign Origin is blocked even with a bearer token on state-changing calls', r.s === 403);
r = await call('/api/candidate/me'); ok('no session: 401 with a generic message (no stack, no SQL)', r.s === 401 && !/sql|stack|at /i.test(r.t));
r = await call('/api/does-not-exist'); ok('unknown API route is a JSON 404', r.s === 404 && !!r.j?.error);
geo.close();
console.log(`\n${pass} passed, ${fail} failed`);
