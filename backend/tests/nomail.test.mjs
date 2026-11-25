// With no SMTP configured the site must say so, never pretend that a code was sent or that an email is verified.
import { BEARER } from './helpers.mjs';
const B = process.env.API_URL; let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + x)); };
const api = async (p, body) => { const r = await fetch(B + p, { method: body ? 'POST' : 'GET', headers: { ...BEARER, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch { /* none */ } return { s: r.status, j }; };
let r = await api('/api/auth/capabilities'); ok('capabilities: email OTP off', r.j.email_otp === false && r.j.phone_otp === false);
r = await api('/api/candidate/register', { email: 'nomail@x.com', full_name: 'N', password: 'Tech-Abhi-2026x' }); ok('candidate sign-up: clear setup error (503), no account pretending to be verified', r.s === 503 && r.j.code === 'EMAIL_NOT_CONFIGURED' && !r.j.token);
r = await api('/api/recruiter/register', { email: 'hr@nomail.com', full_name: 'N', password: 'Tech-Abhi-2026x', company_name: 'NoMail' }); ok('recruiter sign-up: same setup error', r.s === 503 && r.j.code === 'EMAIL_NOT_CONFIGURED');
r = await api('/api/auth/otp/resend', { type: 'candidate', email: 'nomail@x.com' }); ok('resend: setup error', r.s === 503);
r = await api('/api/auth/forgot', { type: 'candidate', email: 'nomail@x.com' }); ok('password reset: setup error', r.s === 503);
r = await api('/api/auth/otp/verify', { type: 'candidate', email: 'nomail@x.com', code: '123456' }); ok('verify with no pending code fails', r.s === 400);
r = await api('/api/jobs'); ok('public job browsing needs no email service', r.s === 200);
console.log(`\n${pass} passed, ${fail} failed`);
