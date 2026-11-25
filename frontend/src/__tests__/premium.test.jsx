import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setup, job, list, status } from './harness';
import { driveState, fmtTime, directionsUrl, istToday } from '../lib/format';
import { locationFilters, locationLabel } from '../lib/location';
import { passwordProblems } from '../components/PasswordExtras';

const find = (t) => screen.findByText(t, { exact: false });
const today = istToday();
const walk = { ...job, id: 11, title: 'BPO Walk-in', company: 'Zeta BPO', job_kind: 'walk_in', drive_date: today, reporting_time: '09:30', interview_time: '10:00', venue: 'Zeta Tower', venue_address: 'SG Highway, Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', documents_required: ['Resume', 'Aadhaar'], fresher_eligible: true, verification_status: 'verified', work_mode: 'onsite', employment_type: 'full-time' };
const remote = { ...job, id: 12, title: 'Remote Node Dev', company: 'Gamma', work_mode: 'remote', remote_region: 'india', location: 'Remote – India', timezone_requirement: 'IST overlap', verification_status: 'awaiting', employment_type: 'full-time' };
const urls = (calls) => calls.filter((c) => c.url.includes('/api/jobs?')).map((c) => c.url);

describe('pure helpers', () => {
  it('drive state uses Indian dates', () => {
    expect(driveState({ drive_date: today })).toBe('today');
    expect(driveState({ drive_date: '2999-01-01' })).toBe('upcoming');
    expect(driveState({ drive_date: '2000-01-01' })).toBe('expired');
    expect(driveState({ drive_date: '2000-01-01', drive_end_date: '2999-01-01' })).toBe('ongoing');
    expect(driveState({})).toBeNull();
  });
  it('formats times and builds a directions link without inventing data', () => {
    expect(fmtTime('09:30')).toBe('9:30 AM'); expect(fmtTime('13:05')).toBe('1:05 PM'); expect(fmtTime(null)).toBe('');
    expect(directionsUrl({ venue_address: 'MG Road, Pune' })).toContain('google.com/maps/dir/?api=1&destination=MG%20Road%2C%20Pune');
    expect(directionsUrl({ maps_url: 'https://maps.google.com/?q=x' })).toBe('https://maps.google.com/?q=x');
    expect(directionsUrl({})).toBeNull();
  });
  it('saved location becomes filters only where it makes sense', () => {
    const city = { mode: 'city', city: 'Pune', state: 'Maharashtra' };
    expect(locationFilters(city, 'all')).toEqual({ city: 'Pune', state: 'Maharashtra' });
    expect(locationFilters(city, 'remote')).toEqual({});               // a city never filters remote jobs
    expect(locationFilters({ mode: 'remote-india' }, 'remote')).toEqual({ eligibility: 'india' });
    expect(locationFilters({ mode: 'remote-worldwide' }, 'remote')).toEqual({ eligibility: 'worldwide' });
    expect(locationFilters({ mode: 'all-india' }, 'all')).toEqual({});
    expect(locationFilters(null, 'all')).toEqual({});
    expect(locationLabel({ mode: 'remote-india' })).toBe('Remote – India');
  });
  it('password rules mirror the server', () => {
    expect(passwordProblems('abc')).toHaveLength(2); expect(passwordProblems('abcdefgh')).toHaveLength(1); expect(passwordProblems('Tech-Abhi-2026x')).toEqual([]);
    expect(passwordProblems('maria.santos99', 'maria.santos@x.com').length).toBe(1);
  });
});

describe('typography and tokens', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const files = []; const walkDir = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (f.name !== '__tests__') walkDir(p); } else if (/\.(jsx|js|css)$/.test(f.name)) files.push(p); } }; walkDir(root);
  it('no text smaller than 13px anywhere in the UI', () => {
    const bad = [];
    for (const f of files) { const t = fs.readFileSync(f, 'utf8'); for (const m of t.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) if (parseFloat(m[1]) < 13) bad.push(`${path.basename(f)}: ${m[0]}`); for (const m of t.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) if (parseFloat(m[1]) < 13) bad.push(`${path.basename(f)}: ${m[0]}`); }
    expect(bad).toEqual([]);
  });
  it('auth tokens are never written to browser storage', () => {
    for (const f of files) { const t = fs.readFileSync(f, 'utf8'); expect(/localStorage\.(set|get)Item\([^)]*(token|TOKEN)/.test(t), f).toBe(false); }
  });
});

describe('walk-in drive page', () => {
  it('lists drives with date, timing, venue, documents, trust label and directions', async () => {
    const { calls, unmocked } = setup('/walk-in-drive', { routes: { 'GET /api/jobs': list([walk]), 'GET /api/jobs/walk-ins/summary': { today: 1, upcoming: 2, recent: 3, total: 3 } } });
    expect(await find('BPO Walk-in')).toBeTruthy();
    expect(screen.getAllByText(/Verified by TechAbhi/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Report 9:30 AM/)).toBeTruthy(); expect(screen.getByText(/Bring:/)).toBeTruthy();
    const dir = screen.getByRole('link', { name: /Get directions/ }); expect(dir.getAttribute('href')).toContain('google.com/maps'); expect(dir.getAttribute('rel')).toMatch(/noopener/);
    expect(urls(calls)[0]).toContain('kind=walk_in'); expect(urls(calls)[0]).toContain('sort=drive_date');
    expect(unmocked).toEqual([]);
  });
  it('tabs ask the API for today / upcoming / recent drives and show counts', async () => {
    const { calls } = setup('/walk-in-drive', { routes: { 'GET /api/jobs': list([walk]), 'GET /api/jobs/walk-ins/summary': { today: 1, upcoming: 2, recent: 3, total: 3 } } });
    await find('BPO Walk-in');
    for (const [name, v] of [['Today', 'today'], ['Upcoming', 'upcoming'], ['Recently announced', 'recent']]) {
      fireEvent.click(screen.getByRole('tab', { name: new RegExp(name) })); await waitFor(() => expect(urls(calls).at(-1)).toContain(`drive=${v}`));
    }
    expect(screen.getByRole('tab', { name: /Upcoming/ }).textContent).toContain('2');
  });
  it('shows a helpful empty state and clears filters', async () => {
    const { calls } = setup('/walk-in-drive?state=Goa&sector=it', { routes: { 'GET /api/jobs': list([]) } });
    expect(await find('No walk-in drives match')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /State \/ UT: Goa/ }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: /Clear all/ })[0]);
    await waitFor(() => expect(urls(calls).at(-1)).not.toContain('state=Goa'));
  });
  it('explains a failed request and retries', async () => {
    let n = 0; const { calls } = setup('/walk-in-drive', { routes: { 'GET /api/jobs': () => (++n === 1 ? status(500, { error: 'db down' }) : list([walk])) } });
    expect(await find('db down')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: /Try again/ })); expect(await find('BPO Walk-in')).toBeTruthy();
  });
});

describe('remote jobs page', () => {
  it('only asks for remote jobs; cards show "Remote", hiring region and time zone - never a city', async () => {
    const { calls } = setup('/remote-jobs', { routes: { 'GET /api/jobs': list([remote]) } });
    expect(await find('Remote Node Dev')).toBeTruthy(); expect(urls(calls)[0]).toContain('kind=remote');
    expect(screen.getAllByText(/Remote – India/).length).toBeGreaterThan(0); expect(screen.getByText('IST overlap')).toBeTruthy();
    expect(screen.queryByText('Ahmedabad')).toBeNull();
  });
  it('region and eligibility controls change the query', async () => {
    const { calls } = setup('/remote-jobs', { routes: { 'GET /api/jobs': list([remote]) } });
    await find('Remote Node Dev');
    fireEvent.click(screen.getByRole('button', { name: 'USA' })); await waitFor(() => expect(urls(calls).at(-1)).toContain('remote_region=usa'));
    fireEvent.click(screen.getAllByRole('radio', { name: 'Indian applicants' })[0]); await waitFor(() => expect(urls(calls).at(-1)).toContain('eligibility=india'));
    fireEvent.click(screen.getByRole('button', { name: 'Freelance' })); await waitFor(() => expect(urls(calls).at(-1)).toContain('employment_type=freelance'));
  });
  it('flags work-authorization requirements', async () => {
    setup('/remote-jobs', { routes: { 'GET /api/jobs': list([{ ...remote, remote_region: 'usa', work_authorization_required: true }]) } });
    expect(await find('Work authorization required')).toBeTruthy();
  });
});

describe('all India page', () => {
  it('uses the india scope, lists states from real data and filters by state via the URL', async () => {
    const { calls } = setup('/all-india-jobs', { routes: { 'GET /api/jobs': list([job]), 'GET /api/jobs/meta': { categories: [], locations: [], education: [], skills: [], states: [{ name: 'Gujarat', n: 5 }], category_options: ['Design'] }, 'GET /api/locations/states': { states: [{ name: 'Gujarat', type: 'state', jobs: 5 }, { name: 'Delhi', type: 'ut', jobs: 0 }] } } });
    await find('MERN Intern'); expect(urls(calls)[0]).toContain('scope=india');
    fireEvent.click(await screen.findByRole('button', { name: /Gujarat \(5\)/ })); await waitFor(() => expect(urls(calls).at(-1)).toContain('state=Gujarat'));
    expect(screen.getAllByRole('button', { name: /State \/ UT: Gujarat/ }).length).toBeGreaterThan(0);
  });
  it('page number and sort live in the URL-driven query', async () => {
    const many = { jobs: [job], total: 40, page: 2, pages: 4 };
    const { calls } = setup('/all-india-jobs?page=2&sort=salary', { routes: { 'GET /api/jobs': many } });
    await find('MERN Intern'); expect(urls(calls)[0]).toContain('page=2'); expect(urls(calls)[0]).toContain('sort=salary');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' })); await waitFor(() => expect(urls(calls).at(-1)).toContain('page=3'));
  });
});

describe('location picker', () => {
  const geo = (impl) => Object.defineProperty(global.navigator, 'geolocation', { value: { getCurrentPosition: vi.fn(impl) }, configurable: true });
  beforeEach(() => { localStorage.clear(); });
  it('does not ask for permission until the person presses the button', async () => {
    geo(() => {}); setup('/jobs', { routes: { 'GET /api/jobs': list([]) } }); await find('Find your next job');
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });
  it('granted: coordinates go to the server once, the city is saved, coordinates are not stored', async () => {
    geo((ok) => ok({ coords: { latitude: 23.0225, longitude: 72.5714 } }));
    const { calls } = setup('/jobs', { routes: { 'GET /api/jobs': list([]), 'POST /api/locations/reverse': { location: { city: 'Ahmedabad', state: 'Gujarat', country: 'India', country_code: 'IN' } } } });
    await find('Find your next job'); fireEvent.click(screen.getAllByRole('button', { name: /Set location/ })[0]);
    fireEvent.click(await screen.findByRole('button', { name: /Use my current location/ }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Ahmedabad, Gujarat/ }).length).toBeGreaterThan(0));
    expect(calls.find((c) => c.path === '/api/locations/reverse').body).toEqual({ lat: 23.0225, lng: 72.5714 });
    const stored = localStorage.getItem('techabhi_location'); expect(stored).toContain('Ahmedabad'); expect(stored).not.toMatch(/23\.0|72\.5|lat|lng/);
    await waitFor(() => expect(urls(calls).at(-1)).toContain('state=Gujarat'));
  });
  it('denied: explains, does not force anything, and manual choices still work', async () => {
    geo((ok, err) => err({ code: 1 }));
    setup('/jobs', { routes: { 'GET /api/jobs': list([]) } }); await find('Find your next job');
    fireEvent.click(screen.getAllByRole('button', { name: /Set location/ })[0]);
    fireEvent.click(await screen.findByRole('button', { name: /Use my current location/ }));
    expect(await find('permission was declined')).toBeTruthy(); expect(localStorage.getItem('techabhi_location')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All India' })); await waitFor(() => expect(JSON.parse(localStorage.getItem('techabhi_location')).mode).toBe('all-india'));
  });
  it('can be reset', async () => {
    setup('/jobs', { storage: { techabhi_location: JSON.stringify({ mode: 'remote-india' }) }, routes: { 'GET /api/jobs': list([]) } }); await find('Find your next job');
    fireEvent.click(screen.getAllByRole('button', { name: /Remote – India/ })[0]);
    fireEvent.click(await screen.findByRole('button', { name: /Reset location/ })); await waitFor(() => expect(localStorage.getItem('techabhi_location')).toBeNull());
  });
  it('a chosen city is shown as a removable chip and can be switched off without losing the preference', async () => {
    const { calls } = setup('/all-india-jobs', { storage: { techabhi_location: JSON.stringify({ mode: 'city', city: 'Pune', state: 'Maharashtra' }) }, routes: { 'GET /api/jobs': list([job]) } }); await find('MERN Intern');
    expect(urls(calls)[0]).toContain('city=Pune');
    fireEvent.click(screen.getByRole('button', { name: /Location: Pune, Maharashtra/ })); await waitFor(() => expect(urls(calls).at(-1)).not.toContain('city=Pune'));
    expect(localStorage.getItem('techabhi_location')).toContain('Pune');
  });
});

describe('job details extras', () => {
  it('walk-in details: date, times, venue, documents, directions, registration link, status', async () => {
    setup('/jobs/11', { routes: { 'GET /api/jobs/11': { job: { ...walk, application_url: 'https://reg.example/x', interview_process: ['HR round'], maps_url: null }, related: [] } } });
    expect(await find('Walk-in drive details')).toBeTruthy();
    for (const t of ['SG Highway, Ahmedabad', 'Aadhaar', 'HR round', '9:30 AM', '10:00 AM']) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Get directions/ })[0].getAttribute('href')).toContain('google.com/maps');
    expect(screen.getByRole('link', { name: /Official registration link/ }).getAttribute('rel')).toMatch(/nofollow/);
  });
  it('remote details show work location, hiring region and no city', async () => {
    setup('/jobs/12', { routes: { 'GET /api/jobs/12': { job: remote, related: [] } } });
    expect(await find('Remote work details')).toBeTruthy(); expect(screen.getByText('Applicants based in India')).toBeTruthy();
  });
  it('shows the honest verification state, and never "Verified" for unverified jobs', async () => {
    setup('/jobs/12', { routes: { 'GET /api/jobs/12': { job: remote, related: [] } } });
    expect((await screen.findAllByText('Awaiting verification')).length).toBeGreaterThan(0); expect(screen.queryByText('Verified by TechAbhi')).toBeNull();
  });
  it('report flow posts the reason and confirms', async () => {
    const { calls } = setup('/jobs/12', { routes: { 'GET /api/jobs/12': { job: remote, related: [] }, 'POST /api/jobs/12/report': status(201, { ok: true }) } });
    fireEvent.click(await screen.findByRole('button', { name: /Report this job/ }));
    fireEvent.change(await screen.findByLabelText('What is wrong?'), { target: { value: 'asks_for_money' } }); fireEvent.change(screen.getByLabelText(/Details/), { target: { value: 'wanted a fee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send report' })); expect(await find('Our team will review')).toBeTruthy();
    expect(calls.find((c) => c.path === '/api/jobs/12/report').body).toEqual({ reason: 'asks_for_money', details: 'wanted a fee' });
  });
});

describe('email OTP sign-up', () => {
  const fill = async (re, v) => fireEvent.change(await screen.findByLabelText(re), { target: { value: v } });
  it('register -> OTP screen -> verify; no token is stored; session is in memory only', async () => {
    const { calls } = setup('/candidate/register', { routes: { 'POST /api/candidate/register': status(201, { needs_verification: true, email: 'new@x.com', resend_after: 60 }), 'POST /api/auth/otp/verify': { ok: true, role: 'candidate', full_name: 'New User' }, 'GET /api/candidate/me': { candidate: { full_name: 'New User' } } } });
    await fill(/^Full name/i, 'New User'); await fill(/Email address/i, 'new@x.com'); await fill(/^Password/i, 'Tech-Abhi-2026x'); await fill(/Confirm password/i, 'Tech-Abhi-2026x');
    fireEvent.click(screen.getByRole('button', { name: /create|register|sign up/i }));
    expect(await find('Verify your email')).toBeTruthy(); expect(screen.getByText('new@x.com')).toBeTruthy();
    const body = calls.find((c) => c.path === '/api/candidate/register').body; expect(body.email).toBe('new@x.com');
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '12ab34' } }); expect(screen.getByLabelText('Verification code').value).toBe('1234');
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify and continue/ }));
    await waitFor(() => expect(calls.find((c) => c.path === '/api/auth/otp/verify')).toBeTruthy());
    expect(calls.find((c) => c.path === '/api/auth/otp/verify').body).toEqual({ type: 'candidate', email: 'new@x.com', code: '123456' });
    expect(Object.keys(localStorage).filter((k) => /token/i.test(k))).toEqual([]);
  });
  it('wrong code shows remaining attempts; resend is disabled during the cooldown', async () => {
    setup('/candidate/register', { routes: { 'POST /api/candidate/register': status(201, { needs_verification: true, email: 'new@x.com', resend_after: 60 }), 'POST /api/auth/otp/verify': status(400, { error: 'That code is invalid or has expired.', code: 'OTP_INVALID', attempts_left: 3 }) } });
    await fill(/^Full name/i, 'N U'); await fill(/Email address/i, 'new@x.com'); await fill(/^Password/i, 'Tech-Abhi-2026x'); await fill(/Confirm password/i, 'Tech-Abhi-2026x');
    fireEvent.click(screen.getByRole('button', { name: /create|register|sign up/i })); await find('Verify your email');
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '111111' } }); fireEvent.click(screen.getByRole('button', { name: /Verify and continue/ }));
    expect(await find('3 tries left')).toBeTruthy(); expect(screen.getByRole('button', { name: /Resend code in/ }).disabled).toBe(true);
  });
  it('mismatching passwords are blocked before any request', async () => {
    const { calls } = setup('/candidate/register');
    await fill(/^Full name/i, 'N U'); await fill(/Email address/i, 'new@x.com'); await fill(/^Password/i, 'Tech-Abhi-2026x'); await fill(/Confirm password/i, 'Different-2026x');
    fireEvent.click(screen.getByRole('button', { name: /create|register|sign up/i }));
    expect((await screen.findAllByText(/do not match/i)).length).toBeGreaterThan(0); expect(calls.some((c) => c.path === '/api/candidate/register')).toBe(false);
  });
  it('login for an unverified account goes to the OTP step', async () => {
    setup('/candidate/login', { routes: { 'POST /api/candidate/login': status(403, { error: 'Verify your email', code: 'EMAIL_NOT_VERIFIED', needs_verification: true, email: 'old@x.com' }) } });
    await fill(/Email address/i, 'old@x.com'); await fill(/^Password/i, 'Tech-Abhi-2026x'); fireEvent.click(screen.getAllByRole('button', { name: /log in|login|sign in/i }).find((b) => b.type === 'submit'));
    expect(await find('Verify your email')).toBeTruthy();
  });
  it('shows the SMTP setup problem instead of pretending', async () => {
    setup('/candidate/register', { routes: { 'POST /api/candidate/register': status(503, { error: 'Email verification is not set up on this server yet.', code: 'EMAIL_NOT_CONFIGURED' }) } });
    await fill(/^Full name/i, 'N U'); await fill(/Email address/i, 'new@x.com'); await fill(/^Password/i, 'Tech-Abhi-2026x'); await fill(/Confirm password/i, 'Tech-Abhi-2026x');
    fireEvent.click(screen.getByRole('button', { name: /create|register|sign up/i })); expect(await find('not set up')).toBeTruthy(); expect(screen.queryByText('Verify your email')).toBeNull();
  });
});

describe('navigation and announcements', () => {
  it('header links to the three new pages; announcements come from the CMS', async () => {
    setup('/', { routes: { 'GET /api/site': { announcements: [{ id: 1, message: 'Mega drive Saturday', level: 'info', link_url: 'https://x.example' }], home: {}, contact: {}, featured: [] } } });
    expect(await find('Mega drive Saturday')).toBeTruthy();
    for (const [n, h] of [['Walk-in Drives', '/walk-in-drive'], ['Remote Jobs', '/remote-jobs'], ['All India', '/all-india-jobs']]) expect(screen.getAllByRole('link', { name: n })[0].getAttribute('href')).toBe(h);
  });
  it('home shows the walk-in section when drives exist', async () => {
    setup('/', { routes: { 'GET /api/jobs': (url) => (url.includes('kind=walk_in') ? list([walk]) : list([job])) } });
    expect((await screen.findAllByText('Walk-in drives')).length).toBeGreaterThan(1); expect((await screen.findAllByText('BPO Walk-in')).length).toBe(1);
  });
  it('contact page shows only the details an admin actually published', async () => {
    setup('/contact', { routes: { 'GET /api/site': { announcements: [], home: {}, contact: { email: 'help@techabhi.example', phone: '+91 99999 00000', hours: 'Mon-Fri' }, featured: [] } } });
    expect(await find('Mon-Fri')).toBeTruthy(); expect(screen.getAllByText('help@techabhi.example').length).toBeGreaterThan(0);
  });
});

describe('admin additions', () => {
  const adm = { 'GET /api/admin/me': { ok: true } };
  it('dashboard shows drafts, expired, walk-ins, remote, reports and recent activity', async () => {
    setup('/admin/dashboard', { as: 'admin', routes: { ...adm, 'GET /api/admin/stats': { total: 10, published: 5, draft: 3, closed: 1, expired: 1, walk_ins: 2, remote: 3, featured: 1, awaiting_verification: 4, candidates: 9, recruiters: 2, pending_recruiters: 1, applications: 7, views: 120, open_reports: 2, latest: [], activity: [{ id: 1, action: 'publish', entity: 'job', detail: 'React Dev', admin_email: 'a@x.com', created_at: new Date().toISOString() }] } } });
    expect(await find('Live walk-in drives')).toBeTruthy(); for (const t of ['Draft jobs', 'Expired jobs', 'Live remote jobs', 'Open reports', 'Job views']) expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    expect(screen.getByText(/published job/)).toBeTruthy();
  });
  it('manage jobs filters + pagination query the API; delete asks for confirmation', async () => {
    const { calls } = setup('/admin/jobs?status=draft&kind=walk_in&page=2', { as: 'admin', routes: { ...adm, 'GET /api/admin/jobs': { jobs: [{ ...walk, status: 'draft' }], total: 41, page: 2, pages: 3 }, 'DELETE /api/admin/jobs/11': { ok: true } } });
    await find('BPO Walk-in'); const u = calls.find((c) => c.url.includes('/api/admin/jobs?')).url; for (const p of ['status=draft', 'kind=walk_in', 'page=2']) expect(u).toContain(p);
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ })); expect(await screen.findByRole('alertdialog')).toBeTruthy(); expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete job' })); await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  });
  it('reports queue: dismiss and close actions call the API', async () => {
    const { calls } = setup('/admin/reports', { as: 'admin', routes: { ...adm, 'GET /api/admin/reports': { reports: [{ id: 5, job_id: 12, reason: 'fake_or_scam', details: 'asked money', title: 'Remote Node Dev', company: 'Gamma', job_status: 'published', open_for_job: 3, created_at: new Date().toISOString() }] }, 'POST /api/admin/reports/5/resolve': { ok: true } } });
    expect(await find('asked money')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Dismiss reports' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/api/admin/reports/5/resolve').body).toEqual({ action: 'dismiss' }));
  });
  it('job form shows walk-in and remote sections only when relevant', async () => {
    setup('/admin/jobs/new', { as: 'admin', routes: adm });
    await find('Type, place and classification'); expect(screen.queryByText('Walk-in drive details')).toBeNull(); expect(screen.queryByText('Remote eligibility')).toBeNull();
    fireEvent.change(screen.getByLabelText('Listing type'), { target: { value: 'walk_in' } }); expect(await screen.findByText('Walk-in drive details')).toBeTruthy();
    expect(screen.getByLabelText(/Drive date/)).toBeTruthy(); expect(screen.getByLabelText(/Reporting time/)).toBeTruthy();
  });
});
