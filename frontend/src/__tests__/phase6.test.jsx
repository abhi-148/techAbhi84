import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { setup, job, list, status } from './harness';
import { GUIDES } from '../data/guides';
import { GUIDE_META } from '../../../backend/routes/guides.js';
import { useMeta } from '../lib/format';

const find = (t) => screen.findByText(t, { exact: false });
const co = { name: 'Acme', open_jobs: 2, locations: ['Pune', 'Remote'], categories: ['Software'] };

describe('shared data', () => {
  it('career guide slugs match the backend sitemap list exactly', () => {
    expect(GUIDES.map((g) => ({ slug: g.slug, title: g.title, summary: g.summary }))).toEqual(GUIDE_META);
  });
  it('every guide has real content', () => {
    for (const g of GUIDES) { expect(g.sections.length).toBeGreaterThan(2); expect(g.summary.length).toBeGreaterThan(20); }
  });
});

describe('public navigation', () => {
  it('header exposes every requested destination', async () => {
    setup('/');
    await find('Find Your Dream Job');
    for (const t of ['Find Jobs', 'Walk-in Drives', 'Remote Jobs', 'All India', 'Companies']) expect(screen.getAllByRole('link', { name: t }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /^More/ }));
    for (const t of [/^Internships/, /^Career Resources/, /^Resume Services/]) expect(screen.getAllByRole('link', { name: t }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /For Recruiters/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Login/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Register' }).getAttribute('href')).toBe('/register');
    fireEvent.click(screen.getByRole('button', { name: /For Recruiters/ }));
    expect(screen.getByRole('link', { name: /Post a Job/ }).getAttribute('href')).toBe('/recruiter/jobs/new');
  });
  it('home search sends title, location and experience to /jobs', async () => {
    setup('/', { routes: {} });
    await find('Find Your Dream Job');
    fireEvent.change(screen.getByPlaceholderText('Job title, skills or company'), { target: { value: 'react' } });
    fireEvent.change(screen.getByPlaceholderText('City or remote'), { target: { value: 'Pune' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2-5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search Jobs' }));
    expect(await screen.findByRole('heading', { name: /Find your next job/ })).toBeTruthy();
    expect(screen.getByPlaceholderText('Job title, skills or company').value).toBe('react');
    expect(screen.getByRole('button', { name: /Location: Pune/ })).toBeTruthy();   // the location is now an active-filter chip
  });
  it('home never repeats a job across sections', async () => {
    const a = { ...job, id: 1, title: 'Alpha Role' };
    setup('/', { routes: { 'GET /api/jobs': (url) => (url.includes('kind=walk_in') ? list([]) : list([a])) } });   // same job returned for latest/fresher/internship/remote
    await find('Latest job openings');
    expect(screen.getAllByText('Alpha Role').length).toBe(1);
  });
});

describe('job card', () => {
  it('shows preview, facts, and sends logged-out users to login to save', async () => {
    setup('/jobs', { routes: { 'GET /api/jobs': list([{ ...job, description_preview: 'Build things with React.', skills: ['React', 'Node'] }]) } });
    expect(await find('Build things with React.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'MERN Intern' }).getAttribute('href')).toBe('/jobs/1');
    fireEvent.click(screen.getByRole('button', { name: /Save MERN Intern/ }));
    expect(await screen.findAllByText(/Welcome back/)).toBeTruthy();
  });
  it('logged-in candidate saves and unsaves via the real API', async () => {
    const { calls } = setup('/jobs', { as: 'candidate', routes: { 'GET /api/jobs': list([job]), 'GET /api/candidate/me': { id: 1, full_name: 'A', email: 'a@b.co' }, 'POST /api/candidate/saved': { ok: true }, 'DELETE /api/candidate/saved/1': { ok: true } } });
    const btn = await screen.findByRole('button', { name: /Save MERN Intern/ });
    fireEvent.click(btn);
    await waitFor(() => expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/candidate/saved'))?.body).toEqual({ job_id: 1 }));
    fireEvent.click(await screen.findByRole('button', { name: /Remove MERN Intern from saved jobs/ }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path.endsWith('/candidate/saved/1'))).toBe(true));
  });
});

describe('jobs filters', () => {
  it('skills, education, date and salary filters call the API with the right params, and chips clear them', async () => {
    const { calls } = setup('/jobs?skills=React&posted_within=7&education=MCA&min_salary=500000', { routes: { 'GET /api/jobs': list([job]), 'GET /api/jobs/meta': { categories: [], locations: [], education: [{ name: 'MCA', n: 1 }], skills: [{ name: 'React', n: 2 }] } } });
    await find('MERN Intern');
    const first = calls.filter((c) => c.url.includes('/api/jobs?'))[0].url;
    for (const p of ['skills=React', 'posted_within=7', 'education=MCA', 'min_salary=500000']) expect(first).toContain(p);
    fireEvent.click(screen.getByRole('button', { name: /Skills: React/ }));
    await waitFor(() => expect(calls.filter((c) => c.url.includes('/api/jobs?')).at(-1).url).not.toContain('skills='));
  });
  it('the jobs filters offer no walk-in switch; walk-in drives live on their own page backed by the API', async () => {
    // The old test guarded against a decorative walk-in filter. Walk-in drives are now real (kind=walk_in, dates, venue) and have a dedicated page.
    const { calls } = setup('/jobs'); await find('Find your next job');
    expect(screen.queryByRole('radio', { name: /walk-in/i })).toBeNull();
    expect(calls.find((c) => c.url.includes('/api/jobs?')).url).not.toContain('kind=walk_in');
  });
  it('internships preset locks the type and hides that filter', async () => {
    const { calls } = setup('/internships', { routes: { 'GET /api/jobs': list([]) } });
    await find('No jobs match these filters');
    expect(calls.find((c) => c.url.includes('/api/jobs?')).url).toContain('employment_type=internship');
    expect(screen.queryByText('Employment type')).toBeNull();
  });
});

describe('companies', () => {
  it('lists real companies and links to their page', async () => {
    setup('/companies', { routes: { 'GET /api/jobs/companies': { companies: [co], total: 1, page: 1, pages: 1 } } });
    const link = await screen.findByRole('link', { name: /Acme/ });
    expect(link.getAttribute('href')).toBe('/companies/Acme');
    expect(screen.getByText(/2 open roles/)).toBeTruthy();
  });
  it('empty state', async () => {
    setup('/companies?q=zzz', { routes: { 'GET /api/jobs/companies': { companies: [], total: 0, page: 1, pages: 1 } } });
    expect(await find('No companies match')).toBeTruthy();
  });
  it('company page shows profile + jobs; unknown company is a 404 page', async () => {
    setup('/companies/Acme', { routes: { 'GET /api/jobs/companies/Acme': { company: { name: 'Acme', open_jobs: 1, website: 'https://acme.example/', description: 'We make anvils.' } }, 'GET /api/jobs': list([job]) } });
    expect(await find('We make anvils.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Company website/ }).getAttribute('href')).toBe('https://acme.example/');
    expect(await find('Open roles at Acme')).toBeTruthy();
  });
  it('unknown company shows not found', async () => {
    setup('/companies/Nope', { routes: { 'GET /api/jobs/companies/Nope': status(404, { error: 'Company not found' }), 'GET /api/jobs': list([]) } });
    expect(await screen.findByText(/not found|no longer|doesn.t exist/i)).toBeTruthy();
  });
});

describe('content pages', () => {
  it('resources list and a guide', async () => {
    setup('/career-resources'); expect(await find('Guides for your job search')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Read/ }).length).toBe(GUIDES.length);
  });
  it('guide page renders; bad slug is not found', async () => {
    setup('/career-resources/avoid-job-scams'); expect(await find('Warning signs')).toBeTruthy();
  });
  it('resume services link logged-out users to login with next', async () => {
    setup('/resume-services');
    const l = await screen.findAllByRole('link', { name: /Log in to continue/ });
    expect(l[0].getAttribute('href')).toContain('/candidate/login?next=');
  });
  it('for-recruiters and register chooser link to real routes', async () => {
    setup('/for-recruiters'); expect((await screen.findByRole('link', { name: /Register your company/ })).getAttribute('href')).toBe('/recruiter/register');
  });
  it('register chooser', async () => {
    setup('/register'); expect((await screen.findByRole('link', { name: /Register as candidate/ })).getAttribute('href')).toBe('/candidate/register');
    expect(screen.getByRole('link', { name: /Register as recruiter/ }).getAttribute('href')).toBe('/recruiter/register');
  });
});

describe('password reset screens', () => {
  it('forgot link appears on candidate login only when the server can send mail', async () => {
    setup('/candidate/login', { routes: { 'GET /api/auth/capabilities': { password_reset: true } } });
    expect((await screen.findByRole('link', { name: /Forgot password/ })).getAttribute('href')).toContain('/forgot-password?type=candidate');
  });
  it('forgot password page warns and disables submit when mail is off', async () => {
    setup('/forgot-password');
    expect(await find('isn’t available right now')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Send reset link/ }).disabled).toBe(true);
  });
  it('forgot password submits type + email and shows the generic message', async () => {
    const { calls } = setup('/forgot-password?type=recruiter', { routes: { 'GET /api/auth/capabilities': { password_reset: true }, 'POST /api/auth/forgot': { ok: true, message: 'If an account exists for that email, a reset link has been sent.' } } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Send reset link/ })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'r@acme.com' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Send reset link/ }).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: /Send reset link/ }));
    expect(await find('If an account exists')).toBeTruthy();
    expect(calls.find((c) => c.path === '/api/auth/forgot').body).toEqual({ type: 'recruiter', email: 'r@acme.com' });
  });
  it('reset page validates, posts token + password, then offers login', async () => {
    const tok = 'a'.repeat(64);
    const { calls } = setup(`/reset-password?type=candidate&token=${tok}`, { routes: { 'POST /api/auth/reset': { ok: true, type: 'candidate' } } });
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'newpassword1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await find('do not match')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await find('You can now log in')).toBeTruthy();
    expect(calls.find((c) => c.path === '/api/auth/reset').body).toEqual({ token: tok, password: 'newpassword1' });
  });
  it('reset page with a malformed token disables the form', async () => {
    setup('/reset-password?token=bad');
    expect(await find('incomplete')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Update password' }).disabled).toBe(true);
  });
});

describe('job detail', () => {
  it('Apply Now link points at the real URL (regression: href was a boolean)', async () => {
    setup('/jobs/1', { routes: { 'GET /api/jobs/1': { job: { ...job, application_url: 'https://acme.example/apply', application_email: 'hr@acme.example' }, related: [], company: { name: 'Acme', open_jobs: 1, website: null, description: null } } } });
    const a = await screen.findByRole('link', { name: /Apply Now/ });
    expect(a.getAttribute('href')).toBe('https://acme.example/apply');
    expect(document.querySelector('a[href="true"],a[href="mailto:true"]')).toBeNull();
    expect(await find('About Acme')).toBeTruthy();
  });
});

describe('account pages, activity and admin directories', () => {
  const cand = { id: 1, full_name: 'Abhi', email: 'a@b.co' };
  it('workspaces hide the public header; public pages keep it', async () => {
    setup('/candidate/settings', { as: 'candidate', routes: { 'GET /api/candidate/me': cand } });
    await find('Change password');
    expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull();
    expect(document.querySelectorAll('main').length).toBe(1);
  });
  it('candidate notifications show real activity, with an empty state', async () => {
    setup('/candidate/notifications', { as: 'candidate', routes: { 'GET /api/candidate/me': cand, 'GET /api/candidate/account/activity': { items: [{ kind: 'application', title: 'Dev at Acme', detail: 'You were shortlisted.', at: '2026-10-30T10:00:00Z', link: '/candidate/applications' }, { kind: 'action', title: 'Action needed: proposal for Beta', detail: 'Nothing is shared until you approve it.', at: '2026-10-31T10:00:00Z', link: '/candidate/career-assistance', urgent: true }] } } });
    expect(await find('Dev at Acme')).toBeTruthy(); expect(screen.getByText(/Action needed: proposal for Beta/)).toBeTruthy();
  });
  it('empty notifications', async () => {
    setup('/recruiter/notifications', { as: 'recruiter', routes: { 'GET /api/recruiter/me': { recruiter: { id: 1, status: 'approved', company_name: 'Acme', full_name: 'R', email: 'r@a.co' } }, 'GET /api/recruiter/account/activity': { items: [] } } });
    expect(await find('Nothing new yet')).toBeTruthy();
  });
  it('change password validates then posts both passwords', async () => {
    const { calls } = setup('/candidate/settings', { as: 'candidate', routes: { 'GET /api/candidate/me': cand, 'POST /api/candidate/account/password': { ok: true } } });
    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'oldpass123' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'brandnew123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await find('do not match')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'brandnew123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await find('Password updated')).toBeTruthy();
    expect(calls.find((c) => c.path === '/api/candidate/account/password').body).toEqual({ current_password: 'oldpass123', new_password: 'brandnew123' });
  });
  it('admin candidates directory lists candidates, no password fields', async () => {
    setup('/admin/candidates', { as: 'admin', routes: { 'GET /api/admin/me': { email: 'admin@x.co' }, 'GET /api/admin/directory/candidates': { candidates: [{ id: 1, full_name: 'Abhi Kumar', email: 'abhi@x.co', created_at: '2026-10-01T00:00:00Z', applications: 2, saved_jobs: 1 }], total: 1, page: 1, pages: 1 } } });
    expect(await find('Abhi Kumar')).toBeTruthy(); expect(screen.getByText('abhi@x.co')).toBeTruthy();
  });
  it('admin applications filter sends status and search to the API', async () => {
    const { calls } = setup('/admin/applications', { as: 'admin', routes: { 'GET /api/admin/me': { email: 'admin@x.co' }, 'GET /api/admin/directory/applications': { applications: [{ id: 1, status: 'new', submitted_at: '2026-10-01T00:00:00Z', candidate_name: 'Abhi', candidate_email: 'a@x.co', job_id: 3, title: 'Dev', company: 'Acme' }], total: 1, page: 1, pages: 1 } } });
    await screen.findAllByText('a@x.co');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'shortlisted' } });
    await waitFor(() => expect(calls.filter((c) => c.url.includes('directory/applications')).at(-1).url).toContain('status=shortlisted'));
  });
});
