// Shared input rules for accounts.
export const emailOk = (v) => typeof v === 'string' && v.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const COMMON = new Set(['password', 'password1', 'password123', 'password1234', '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop',
  'iloveyou1', 'admin123', 'admin1234', 'welcome1', 'welcome123', 'abc12345', 'letmein123', 'passw0rd', 'p@ssw0rd', 'techabhi', 'techabhi123', 'india123', 'india@123']);

/** Returns a list of human-readable problems (empty = acceptable). bcrypt only reads 72 bytes, so longer is rejected. */
export function passwordIssues(pw, { email = '' } = {}) {
  const p = String(pw ?? ''); const out = [];
  if (p.length < 8) out.push('Use at least 8 characters.');
  if (Buffer.byteLength(p) > 72) out.push('Use at most 72 characters.');
  if (!/[A-Za-z]/.test(p) || !/[^A-Za-z]/.test(p)) out.push('Mix letters with numbers or symbols.');
  if (COMMON.has(p.toLowerCase())) out.push('That password is too common.');
  if (/^(.)\1+$/.test(p)) out.push('Do not repeat a single character.');
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && p.toLowerCase().includes(local)) out.push('Do not include your email name in the password.');
  return out;
}

const FREE_MAIL = new Set(['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.in', 'yahoo.co.in', 'ymail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'aol.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'rediffmail.com', 'mail.com', 'gmx.com', 'zoho.com', 'yandex.com']);
export const isFreeMail = (email) => FREE_MAIL.has(String(email).split('@')[1]?.toLowerCase());
// Recruiters must use a business address unless the operator explicitly allows free mail.
export const blockFreeMail = () => String(process.env.RECRUITER_ALLOW_FREE_EMAIL || '').toLowerCase() !== 'true';
