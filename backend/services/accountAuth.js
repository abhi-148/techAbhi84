import { issueOtp } from './otp.js';
import { isEmailConfigured } from './emailService.js';

export const SETUP_ERROR = { error: 'Email verification is not set up on this server yet. The site owner must configure SMTP (MAIL_* settings) before accounts can be created.', code: 'EMAIL_NOT_CONFIGURED' };
export const emailReady = (res) => { if (isEmailConfigured()) return true; res.status(503).json(SETUP_ERROR); return false; };

/** Sends a code and answers the request. Cooldown / hourly-cap are reported as "already sent" (the user keeps the code they have). */
export async function respondNeedsVerification(res, { type, id, email, name, status = 201, extra = {} }) {
  try {
    const o = await issueOtp({ type, id, email, name });
    return res.status(status).json({ needs_verification: true, email, ...o, ...extra });
  } catch (e) {
    if (e.code === 'OTP_COOLDOWN' || e.code === 'OTP_HOURLY_LIMIT') return res.status(status).json({ needs_verification: true, email, resend_after: e.retry_after, ...extra });
    if (e.status) return res.status(e.status).json({ error: e.message, code: e.code, needs_verification: true, email });
    throw e;
  }
}
