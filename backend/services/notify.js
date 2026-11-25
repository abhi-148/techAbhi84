import { sendEmail, isEmailConfigured } from './emailService.js';
export async function notifyAdminNewRecruiter({ name, company, email }) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to || !isEmailConfigured()) { if (!to) console.warn('ADMIN_NOTIFICATION_EMAIL is not configured; admin notification skipped.'); return; }
  try {
    await sendEmail({ to, subject: 'New recruiter registration - TechAbhi', text: ['A recruiter has verified their email and is waiting for approval.', '', `Name: ${name}`, `Company: ${company}`, `Email: ${email}`, 'Status: pending', '', 'Review this account in the admin dashboard.'].join('\n') });
  } catch (e) { console.error('Admin recruiter registration email failed:', e?.code || e?.name || 'Unknown error'); }
}
