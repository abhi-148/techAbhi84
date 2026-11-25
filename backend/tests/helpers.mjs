// Shared helpers for the API suites. Accounts are created exactly the way a real user does it: register, read the emailed code, verify.
const B = process.env.API_URL || 'http://localhost:4000';
const SINK = `http://127.0.0.1:${process.env.SINK_PORT || 4121}`;
export const BEARER = { 'X-Auth-Mode': 'bearer' };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function mailsTo(email) { return (await fetch(`${SINK}/mails?to=${encodeURIComponent(email)}`)).json(); }
export async function otpFor(email, { after = 0, wait = 6000 } = {}) {
  const end = Date.now() + wait;
  while (Date.now() < end) { const j = await (await fetch(`${SINK}/otp?to=${encodeURIComponent(email)}`)).json(); if (j.code && j.count > after) return j.code; await sleep(150); }
  return null;
}
export async function mailCount(email) { return (await (await fetch(`${SINK}/otp?to=${encodeURIComponent(email)}`)).json()).count; }
const post = async (p, body, headers = {}) => { const r = await fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...BEARER, ...headers }, body: JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch { /* none */ } return { s: r.status, j }; };
/** Verifies a registered account with the code that was emailed. Returns the bearer access token. */
export async function verify(type, email) {
  const code = await otpFor(email); if (!code) throw new Error('no OTP email for ' + email);
  const r = await post('/api/auth/otp/verify', { type, email, code });
  if (r.s !== 200) throw new Error(`verify failed ${r.s} ${JSON.stringify(r.j)}`);
  return r.j.token;
}
export const STRONG = 'Tech-Abhi-2026x';
export async function candidate(email, name = 'Cand ' + email[0], password = STRONG) {
  const r = await post('/api/candidate/register', { email, full_name: name, password });
  if (r.s !== 201) throw new Error('register failed ' + r.s + JSON.stringify(r.j));
  return verify('candidate', email);
}
export async function recruiter(email, company, extra = {}, password = STRONG) {
  const r = await post('/api/recruiter/register', { email, full_name: 'Rec ' + company, password, company_name: company, ...extra });
  if (r.s !== 201) throw new Error('recruiter register failed ' + r.s + JSON.stringify(r.j));
  return verify('recruiter', email);
}
