// Phase 6: company directory, new filters, password reset (with a fake SMTP server), per-page SEO.
import net from 'net';
const B = process.env.API_URL || 'http://localhost:4000'; let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + x)); };
const call = async (p, { method = 'GET', body, token } = {}) => {
  const r = await fetch(B + p, { method, headers: { 'X-Auth-Mode': 'bearer', ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* html */ } return { s: r.status, j, t };
};
import { verify, mailsTo as sinkMails } from './helpers.mjs';
// Mail is captured by the shared sink (tests/smtp-sink.mjs); only reset-link mails are counted here, OTP mails are covered in auth.test.mjs.
const mailsTo = async (a) => (await sinkMails(a)).map((m) => m.raw).filter((t) => /reset-password/.test(t));
const A = (await call('/api/admin/login', { method: 'POST', body: { email: 'admin@test.com', password: 'longpassword123' } })).j.token;
const mk = async (b) => { const r = await call('/api/admin/jobs', { method: 'POST', token: A, body: b }); await call(`/api/admin/jobs/${r.j.job.id}/status`, { method: 'POST', token: A, body: { status: 'published' } }); return r.j.job.id; };
const base = { description: 'A'.repeat(300) + ' end.', application_url: 'https://example.com/apply' };
const j1 = await mk({ ...base, title: 'JS Dev', company: 'P6 Alpha', education: 'B.Tech CSE', skills: ['JavaScript', 'React'], location: 'Surat' });
const j2 = await mk({ ...base, title: 'Java Dev', company: 'P6 Alpha', education: 'MCA', skills: ['Java', 'Spring'], location: 'Surat' });
const j3 = await mk({ ...base, title: 'Other', company: 'P6 Beta', skills: ['Go'] });
const draft = (await call('/api/admin/jobs', { method: 'POST', token: A, body: { ...base, title: 'Hidden', company: 'P6 Gamma' } })).j.job.id;

let r = await call('/api/jobs?company=p6%20alpha'); ok('company filter (case-insensitive)', r.j.total === 2, JSON.stringify(r.j.total));
ok('list rows carry a short description_preview, not the full text', r.j.jobs[0].description_preview.length <= 260 && !('description' in r.j.jobs[0]));
r = await call('/api/jobs?company=P6%20Alpha&skills=Java'); ok('skills filter is whole-skill ("Java" does not match JavaScript)', r.j.total === 1 && r.j.jobs[0].id === j2, JSON.stringify(r.j.jobs.map((x) => x.id)));
r = await call('/api/jobs?company=P6%20Alpha&skills=Java,React'); ok('skills filter matches ANY listed skill', r.j.total === 2);
r = await call('/api/jobs?company=P6%20Alpha&education=mca'); ok('education filter', r.j.total === 1 && r.j.jobs[0].id === j2);
r = await call('/api/jobs?company=P6%20Alpha&posted_within=7'); ok('posted_within keeps recent jobs', r.j.total === 2);
r = await call('/api/jobs?company=P6%20Alpha&posted_within=999'); ok('posted_within ignores invalid values', r.j.total === 2);
r = await call('/api/jobs?skills=' + encodeURIComponent("x' OR '1'='1")); ok('skills filter is SQL-injection safe', r.s === 200 && r.j.total === 0);
r = await call('/api/jobs/meta'); ok('meta exposes education + skills', Array.isArray(r.j.education) && r.j.skills.some((s) => s.name === 'JavaScript'));

r = await call('/api/jobs/companies?q=P6'); const names = r.j.companies.map((c) => c.name);
ok('company directory lists only companies with live jobs', names.includes('P6 Alpha') && names.includes('P6 Beta') && !names.includes('P6 Gamma'), names.join());
ok('company open_jobs count is correct', r.j.companies.find((c) => c.name === 'P6 Alpha').open_jobs === 2);
r = await call('/api/jobs/companies/P6%20Gamma'); ok('company with only drafts -> 404', r.s === 404);
r = await call('/api/jobs/companies/P6%20Alpha'); ok('company profile', r.s === 200 && r.j.company.open_jobs === 2 && r.j.company.website === null);
r = await call('/api/jobs/' + j1); ok('job detail includes company block', r.j.company?.name === 'P6 Alpha');

// approved recruiter profile feeds the company block; a pending one does not
let r0; const reg = await call('/api/recruiter/register', { method: 'POST', body: { email: 'p6rec@test.com', full_name: 'P6 Rec', password: 'Tech-Abhi-2026x', company_name: 'P6 Delta', company_website: 'https://delta.example', company_description: 'We build things.' } });
const recId = (await call('/api/admin/recruiters?status=pending', { token: A })).j.recruiters.find((x) => x.email === 'p6rec@test.com').id;
r0 = await call(`/api/admin/recruiters/${recId}/status`, { method: 'POST', token: A, body: { status: 'approved' } }); ok('an admin cannot approve a recruiter whose email is unverified', r0.s === 409);
await verify('recruiter','p6rec@test.com'); await call(`/api/admin/recruiters/${recId}/status`, { method: 'POST', token: A, body: { status: 'approved' } }); let RT = (await call('/api/recruiter/login', { method: 'POST', body: { email: 'p6rec@test.com', password: 'Tech-Abhi-2026x' } })).j.token;
const rj = (await call('/api/recruiter/jobs', { method: 'POST', token: RT, body: { title: 'Delta Role', description: 'Do things. '.repeat(30), skills: 'Go' } })).j.job.id;
await call(`/api/recruiter/jobs/${rj}/status`, { method: 'POST', token: RT, body: { status: 'published' } });
r = await call('/api/jobs/companies/P6%20Delta'); ok('approved recruiter profile shown on company page', r.s === 200 && r.j.company.website === 'https://delta.example/' && r.j.company.description === 'We build things.', r.t);
r = await call('/api/jobs/' + rj); ok('recruiter id still never exposed', r.j.job.recruiter_id === undefined && r.j.company?.description === 'We build things.');

// --- password reset ---
r = await call('/api/auth/capabilities'); ok('capabilities reports reset enabled when mail is configured', r.j.password_reset === true);
r = await call('/api/auth/forgot', { method: 'POST', body: { type: 'admin', email: 'a@b.co' } }); ok('forgot: unknown account type rejected', r.s === 400);
r = await call('/api/auth/forgot', { method: 'POST', body: { type: 'candidate', email: 'nope' } }); ok('forgot: invalid email rejected', r.s === 400);
const em = 'p6cand@test.com';
await call('/api/candidate/register', { method: 'POST', body: { email: em, full_name: 'P6 Cand', password: 'oldpassword1' } }); await verify('candidate', em);
r = await call('/api/auth/forgot', { method: 'POST', body: { type: 'candidate', email: 'ghost@test.com' } });
const generic = r.j?.message; ok('forgot: unknown email gets the same generic 200', r.s === 200 && !!generic);
await new Promise((x) => setTimeout(x, 400)); ok('forgot: no email sent for unknown address', (await mailsTo('ghost@test.com')).length === 0);
r = await call('/api/auth/forgot', { method: 'POST', body: { type: 'candidate', email: em } }); ok('forgot: known email gets identical response', r.s === 200 && r.j.message === generic);
for (let i = 0; i < 30 && !(await mailsTo(em)).length; i++) await new Promise((x) => setTimeout(x, 200));
const cm = (await mailsTo(em));
ok('reset email delivered', cm.length === 1, String(cm.length));
const body = (cm[0] || '').replace(/=\n/g, '').replace(/=3D/g, '=');
const m = body.match(/reset-password\?type=(candidate)&token=([a-f0-9]{64})/); ok('email contains a 64-hex token link', !!m);
const tok = m?.[2] || '0'.repeat(64);
r = await call('/api/auth/reset', { method: 'POST', body: { token: tok, password: 'short' } }); ok('reset: weak password rejected', r.s === 400);
r = await call('/api/auth/reset', { method: 'POST', body: { token: 'zzz', password: 'newpassword1' } }); ok('reset: malformed token rejected', r.s === 400);
r = await call('/api/auth/reset', { method: 'POST', body: { token: '0'.repeat(64), password: 'newpassword1' } }); ok('reset: unknown token rejected', r.s === 400);
r = await call('/api/auth/reset', { method: 'POST', body: { token: tok, password: 'newpassword1' } }); ok('reset: valid token works', r.s === 200 && r.j.type === 'candidate');
r = await call('/api/auth/reset', { method: 'POST', body: { token: tok, password: 'another-pass1' } }); ok('reset: token is single use', r.s === 400);
r = await call('/api/candidate/login', { method: 'POST', body: { email: em, password: 'oldpassword1' } }); ok('old password no longer works', r.s === 401);
r = await call('/api/candidate/login', { method: 'POST', body: { email: em, password: 'newpassword1' } }); ok('new password works', r.s === 200 && !!r.j.token);
// recruiter flow + only newest link valid
await call('/api/auth/forgot', { method: 'POST', body: { type: 'recruiter', email: 'p6rec@test.com' } });
await call('/api/auth/forgot', { method: 'POST', body: { type: 'recruiter', email: 'p6rec@test.com' } });
for (let i = 0; i < 40 && (await mailsTo('p6rec@test.com')).filter((t) => /reset-password/.test(t)).length < 2; i++) await new Promise((x) => setTimeout(x, 200));
const toks = (await mailsTo('p6rec@test.com')).filter((t) => /reset-password/.test(t)).map((t) => t.replace(/=\n/g, '').replace(/=3D/g, '=').match(/token=([a-f0-9]{64})/)?.[1]);
r = await call('/api/auth/reset', { method: 'POST', body: { token: toks[0], password: 'recpass-old1' } }); ok('older reset link is invalidated by a newer request', r.s === 400);
r = await call('/api/auth/reset', { method: 'POST', body: { token: toks[1], password: 'recpass-new1' } }); ok('recruiter reset works', r.s === 200 && r.j.type === 'recruiter');
r = await call('/api/recruiter/login', { method: 'POST', body: { email: 'p6rec@test.com', password: 'recpass-new1' } }); ok('recruiter can log in with new password', r.s === 200);


// --- account settings, activity, admin directories ---
const CT = (await call('/api/candidate/login', { method: 'POST', body: { email: em, password: 'newpassword1' } })).j.token;
r = await call('/api/candidate/account/password', { method: 'POST', body: { current_password: 'x', new_password: 'whatever123' } }); ok('change password: requires login', r.s === 401);
r = await call('/api/candidate/account/password', { method: 'POST', token: CT, body: { current_password: 'wrong-one-1', new_password: 'freshpass123' } }); ok('change password: wrong current rejected', r.s === 400 && /incorrect/i.test(r.j.error));
r = await call('/api/candidate/account/password', { method: 'POST', token: CT, body: { current_password: 'newpassword1', new_password: 'short' } }); ok('change password: weak rejected', r.s === 400);
r = await call('/api/candidate/account/password', { method: 'POST', token: CT, body: { current_password: 'newpassword1', new_password: 'newpassword1' } }); ok('change password: same password rejected', r.s === 400);
r = await call('/api/candidate/account/password', { method: 'POST', token: CT, body: { current_password: 'newpassword1', new_password: 'freshpass123' } }); ok('change password: works', r.s === 200);
r = await call('/api/candidate/login', { method: 'POST', body: { email: em, password: 'freshpass123' } }); ok('candidate logs in with changed password', r.s === 200);
r = await call('/api/recruiter/me', { token: RT }); ok('password reset signs out every existing session', r.s === 401);
RT = (await call('/api/recruiter/login', { method: 'POST', body: { email: 'p6rec@test.com', password: 'recpass-new1' } })).j.token;
r = await call('/api/recruiter/account/password', { method: 'POST', token: RT, body: { current_password: 'recpass-new1', new_password: 'recpass-three3' } }); ok('recruiter change password works', r.s === 200);
r = await call('/api/recruiter/account/password', { method: 'POST', token: CT, body: { current_password: 'a', new_password: 'recpass-four4' } }); ok('candidate token cannot use recruiter account route', r.s === 401);
const RT2 = (await call('/api/recruiter/login', { method: 'POST', body: { email: 'p6rec@test.com', password: 'recpass-three3' } })).j.token;

await call('/api/candidate/profile', { method: 'PUT', token: CT, body: { skills: ['Go'], headline: 'Dev' } });
const sub = await call('/api/candidate/applications/submit', { method: 'POST', token: CT, body: { job_id: rj, consent: true, share_resume: false } });
ok('candidate applies through TechAbhi (setup)', sub.s === 201, sub.t);
r = await call('/api/candidate/account/activity', { token: CT }); ok('candidate activity lists the application', r.s === 200 && r.j.items.some((i) => i.title.includes('Delta Role') && i.kind === 'application'), r.t.slice(0, 200));
r = await call('/api/recruiter/account/activity', { token: RT2 }); ok('recruiter activity shows new application, flagged unread', r.j.items.some((i) => i.title === 'New application for Delta Role' && i.urgent === true), r.t.slice(0, 200));
r = await call('/api/recruiter/account/activity'); ok('activity requires login', r.s === 401);

r = await call('/api/admin/directory/candidates?q=p6cand', { token: A }); ok('admin candidate directory: search', r.s === 200 && r.j.total === 1 && r.j.candidates[0].applications === 1, r.t.slice(0, 200));
ok('admin directory never exposes password hashes', !/password|hash/i.test(r.t));
r = await call('/api/admin/directory/candidates'); ok('admin candidate directory needs admin', r.s === 401);
r = await call('/api/admin/directory/candidates', { token: CT }); ok('candidate token cannot read admin directory', r.s === 401 || r.s === 403);
r = await call('/api/admin/directory/applications?status=new&q=Delta', { token: A }); ok('admin applications: filter by status + search', r.s === 200 && r.j.total >= 1 && r.j.applications[0].title === 'Delta Role');
r = await call('/api/admin/directory/applications?status=bogus&q=%25', { token: A }); ok('admin applications: bad status ignored, wildcard escaped', r.s === 200 && r.j.total <= 1);
for (const [label, path, tok] of [['candidate activity', '/api/candidate/account/activity', null], ['admin applications directory', '/api/admin/directory/applications', null], ['admin applications directory (recruiter token)', '/api/admin/directory/applications', RT2], ['admin applications directory (candidate token)', '/api/admin/directory/applications', CT], ['candidate activity (recruiter token)', '/api/candidate/account/activity', RT2], ['recruiter activity (candidate token)', '/api/recruiter/account/activity', CT]]) {
  r = await call(path, { token: tok }); ok(label + ' is protected', r.s === 401 || r.s === 403, String(r.s));
}
r = await call('/api/admin/login', { method: 'POST', body: { email: 'admin@test.com', password: 'longpassword123' } }); ok('admin login endpoint is still public', r.s === 200 && !!r.j.token);

// --- SEO ---
r = await call('/robots.txt'); ok('robots blocks private areas', /Disallow: \/candidate/.test(r.t) && /Disallow: \/recruiter/.test(r.t) && /Disallow: \/admin/.test(r.t));
r = await call('/sitemap.xml'); ok('sitemap lists static pages, guides and company pages', r.t.includes('/companies<') && r.t.includes('/career-resources/resume-basics') && r.t.includes('/companies/P6%20Alpha'));
ok('sitemap omits draft-only company', !r.t.includes('P6%20Gamma'));
if (process.env.HAVE_DIST === '1') {
  r = await call('/companies'); ok('SEO: /companies has its own single title, description and canonical', (r.t.match(/<title>/g) || []).length === 1 && r.t.includes('Companies Hiring Now') && (r.t.match(/name="description"/g) || []).length === 1 && r.t.includes('rel="canonical"'));
  r = await call('/career-resources/avoid-job-scams'); ok('SEO: guide page has its own title', r.t.includes('<title>How to spot and avoid job scams | TechAbhi</title>') && (r.t.match(/<title>/g) || []).length === 1);
  r = await call('/companies/P6%20Alpha'); ok('SEO: company page title names the company', r.t.includes('<title>Jobs at P6 Alpha | TechAbhi</title>'));
  r = await call('/companies/%3C%2Ftitle%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E'); ok('SEO: hostile company name is HTML-escaped in <head>', !r.t.includes('<script>alert(1)') && !/<\/title><script/i.test(r.t));
  r = await call('/candidate/dashboard'); ok('SEO: private area is noindex', r.t.includes('noindex'));
  r = await call('/'); ok('SEO: home has canonical + og', r.t.includes('rel="canonical"') && r.t.includes('og:title'));
}

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
