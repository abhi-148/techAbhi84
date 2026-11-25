import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../App';
import { setSession, clearSession } from '../lib/api';

export const job = { id: 1, title: 'MERN Intern', company: 'Acme', category: 'Software', location: 'Ahmedabad', work_mode: 'hybrid', employment_type: 'internship', experience: 'Fresher', salary: '₹4-6 LPA', salary_min: 400000, salary_max: 600000, openings: 2, education: 'B.Tech', description: 'Build user interfaces', responsibilities: ['Build UI', 'Write tests'], requirements: ['React'], eligibility: '2026 batch', benefits: ['Mentorship'], skills: ['React', 'Node.js'], application_url: 'https://acme.example/apply', application_email: 'hr@acme.example', application_instructions: null, published_at: '2026-10-01T00:00:00Z', expires_at: null, status: 'published', accepts_applications: false, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' };
export const list = (jobs = [job]) => ({ jobs, total: jobs.length, page: 1, pages: 1 });
export const TOKENS = { admin: 'techabhi_admin_token', candidate: 'techabhi_candidate_token', recruiter: 'techabhi_recruiter_token' };

/** routes: { 'GET /api/jobs': body | (url, body, headers) => body | {status, body} }  (query strings ignored, :id → regex via *) */
export function setup(path, { as, routes = {}, storage = {} } = {}) {
  localStorage.clear(); sessionStorage.clear();
  for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
  for (const r of ['admin', 'candidate', 'recruiter']) clearSession(r);   // sessions are HttpOnly cookies now; the app only keeps an in-memory flag
  if (as) setSession(as, { email: as + '@example.com', full_name: 'Test ' + as });
  const calls = []; const unmocked = [];
  const table = Object.entries({ 'GET /api/jobs/meta': { categories: [], locations: [], education: [], skills: [] }, 'GET /api/jobs/companies': { companies: [], total: 0, page: 1, pages: 1 }, 'GET /api/auth/capabilities': { password_reset: false }, 'GET /api/site': { announcements: [], home: {}, contact: {}, featured: [] }, 'GET /api/locations/states': { states: [] }, 'GET /api/locations/cities': { cities: [] }, 'GET /api/jobs/suggest': { titles: [], companies: [], skills: [], cities: [] }, 'GET /api/candidate/saved/ids': { ids: [] }, 'POST /api/jobs/*/event': { ok: true }, ...routes })
    .map(([k, v]) => { const [m, p] = k.split(' '); return [m, new RegExp('^' + p.replace(/\*/g, '[^/]+') + '$'), v]; });
  global.fetch = vi.fn(async (url, opts = {}) => {
    const method = (opts.method || 'GET').toUpperCase(); const p = String(url).split('?')[0];
    const body = opts.body && typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
    calls.push({ method, url: String(url), path: p, body, auth: opts.headers?.Authorization, credentials: opts.credentials });
    const hit = table.find(([m, re]) => m === method && re.test(p));
    if (!hit) { unmocked.push(`${method} ${p}`); return new Response(JSON.stringify({ error: 'not mocked' }), { status: 404 }); }
    let out = typeof hit[2] === 'function' ? hit[2](String(url), body, opts.headers) : hit[2];
    const status = out && out.__status ? out.__status : 200; if (out && out.__status) out = out.body;
    return new Response(JSON.stringify(out), { status, headers: { 'Content-Type': 'application/json' } });
  });
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
  return { calls, unmocked };
}
export const status = (n, body) => ({ __status: n, body });
