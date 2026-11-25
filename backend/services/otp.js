import crypto from 'crypto';
import { pool } from '../db.js';
import { sendEmail, isEmailConfigured } from './emailService.js';

// Email one-time codes. 6 digits from crypto.randomInt, stored only as an HMAC, 5-minute expiry,
// 5 wrong guesses per code, 60-second resend cooldown, previous codes invalidated on every new one.
export const OTP_TTL_MIN = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_COOLDOWN_S = Math.max(parseInt(process.env.OTP_COOLDOWN_SECONDS, 10) || 60, 1);   // the env override exists so the test suite does not have to wait a minute
export const OTP_HOURLY_CAP = 6;

const key = () => process.env.OTP_SECRET || crypto.createHash('sha256').update('techabhi-otp:' + process.env.JWT_SECRET).digest('hex');
const mac = (type, id, code) => crypto.createHmac('sha256', key()).update(`${type}:${id}:${code}`).digest();
export const newCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const fail = (status, code, message, extra = {}) => Object.assign(new Error(message), { status, code, ...extra });

export const otpAvailable = () => isEmailConfigured();

/** Creates and emails a fresh code. Throws {status, code, message} when it cannot. Never logs or returns the code. */
export async function issueOtp({ type, id, email, name = '' }) {
  if (!isEmailConfigured()) throw fail(503, 'EMAIL_NOT_CONFIGURED', 'Email verification is not set up on this server yet. The site owner must configure SMTP (MAIL_* settings).');
  const [[last]] = await pool.query('SELECT TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP()) age FROM email_otps WHERE account_type=? AND account_id=? ORDER BY id DESC LIMIT 1', [type, id]);
  if (last && last.age < OTP_COOLDOWN_S) throw fail(429, 'OTP_COOLDOWN', `Please wait ${OTP_COOLDOWN_S - last.age} seconds before asking for another code.`, { retry_after: OTP_COOLDOWN_S - last.age });
  const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM email_otps WHERE account_type=? AND account_id=? AND created_at > (UTC_TIMESTAMP() - INTERVAL 1 HOUR)', [type, id]);
  if (n >= OTP_HOURLY_CAP) throw fail(429, 'OTP_HOURLY_LIMIT', 'Too many codes requested. Try again in an hour.', { retry_after: 3600 });

  const code = newCode();
  await pool.query('UPDATE email_otps SET consumed_at=UTC_TIMESTAMP() WHERE account_type=? AND account_id=? AND consumed_at IS NULL', [type, id]);   // older codes stop working
  const [ins] = await pool.query('INSERT INTO email_otps (account_type, account_id, code_hash, created_at, expires_at) VALUES (?,?,?, UTC_TIMESTAMP(), UTC_TIMESTAMP() + INTERVAL ? MINUTE)', [type, id, mac(type, id, code).toString('hex'), OTP_TTL_MIN]);
  try {
    await sendEmail({
      to: email,
      subject: `${code} is your TechAbhi verification code`,
      text: `Hi ${name || 'there'},\n\nYour TechAbhi verification code is ${code}.\nIt expires in ${OTP_TTL_MIN} minutes and works once.\n\nIf you did not create a TechAbhi account, ignore this email. TechAbhi staff will never ask you for this code.`,
    });
  } catch (e) {
    await pool.query('UPDATE email_otps SET consumed_at=UTC_TIMESTAMP() WHERE id=?', [ins.insertId]);
    console.error('OTP email failed:', e?.code || e?.name);   // no code, address or message body in logs
    throw fail(502, 'EMAIL_SEND_FAILED', 'We could not send the email. Please try again in a moment.');
  }
  return { expires_in: OTP_TTL_MIN * 60, resend_after: OTP_COOLDOWN_S };
}

/** Returns {ok:true} or {ok:false, reason, attempts_left?}. Each guess is counted atomically, so parallel requests cannot exceed the limit. */
export async function verifyOtp({ type, id, code }) {
  const submitted = String(code ?? '').trim();
  const [[row]] = await pool.query('SELECT id, code_hash FROM email_otps WHERE account_type=? AND account_id=? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP() ORDER BY id DESC LIMIT 1', [type, id]);
  if (!row) return { ok: false, reason: 'expired' };
  const [bump] = await pool.query('UPDATE email_otps SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND attempts < ?', [row.id, OTP_MAX_ATTEMPTS]);
  if (bump.affectedRows !== 1) { await pool.query('UPDATE email_otps SET consumed_at=UTC_TIMESTAMP() WHERE id=? AND consumed_at IS NULL', [row.id]); return { ok: false, reason: 'locked' }; }
  const [[{ attempts }]] = await pool.query('SELECT attempts FROM email_otps WHERE id=?', [row.id]);
  const good = /^\d{6}$/.test(submitted) && crypto.timingSafeEqual(mac(type, id, submitted), Buffer.from(row.code_hash, 'hex'));
  if (!good) {
    if (attempts >= OTP_MAX_ATTEMPTS) { await pool.query('UPDATE email_otps SET consumed_at=UTC_TIMESTAMP() WHERE id=? AND consumed_at IS NULL', [row.id]); return { ok: false, reason: 'locked' }; }
    return { ok: false, reason: 'wrong', attempts_left: OTP_MAX_ATTEMPTS - attempts };
  }
  const [use] = await pool.query('UPDATE email_otps SET consumed_at=UTC_TIMESTAMP() WHERE id=? AND consumed_at IS NULL', [row.id]);   // single use: a replay or a race loses here
  return use.affectedRows === 1 ? { ok: true } : { ok: false, reason: 'expired' };
}
