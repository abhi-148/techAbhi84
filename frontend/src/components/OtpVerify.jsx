import { useEffect, useRef, useState } from 'react';
import { MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';

// Email one-time-code step. The code is checked on the server (5 minutes, 5 tries, single use); nothing here "pretends" verification.
export default function OtpVerify({ type, email, resendAfter = 60, onVerified, onBack }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [wait, setWait] = useState(resendAfter);
  const input = useRef(null);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your email.'); return; }
    setBusy(true); setError(''); setInfo('');
    try {
      const data = await api('/auth/otp/verify', { method: 'POST', body: { type, email, code } });
      onVerified(data);
    } catch (err) {
      setError(err.code === 'OTP_LOCKED' ? 'Too many wrong codes. Request a new code below.' : err.data?.attempts_left != null ? `That code is not right. ${err.data.attempts_left} ${err.data.attempts_left === 1 ? 'try' : 'tries'} left.` : err.message);
      setCode('');
      input.current?.focus();
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (wait > 0 || busy) return;
    setBusy(true); setError(''); setInfo('');
    try {
      const d = await api('/auth/otp/resend', { method: 'POST', body: { type, email } });
      setInfo('A new code is on its way. Older codes no longer work.');
      setWait(d.resend_after || 60);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><MailCheck size={24} aria-hidden="true" /></div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Verify your email</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">We sent a 6-digit code to <strong className="break-all text-slate-900">{email}</strong>. It expires in 5 minutes.</p>
        <form onSubmit={submit} className="mt-6" noValidate>
          <label htmlFor="otp-code" className="mb-1.5 block text-sm font-semibold text-slate-700">Verification code</label>
          <input ref={input} id="otp-code" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" maxLength={6} value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} placeholder="000000"
            className="h-14 w-full rounded-xl border border-slate-300 bg-white text-center text-2xl font-bold tracking-[0.5em] text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15" aria-describedby="otp-msg" />
          <div id="otp-msg" role="status" aria-live="polite" className="min-h-[1.5rem] pt-2 text-sm">
            {error && <p className="text-rose-700">{error}</p>}
            {!error && info && <p className="text-emerald-700">{info}</p>}
          </div>
          <button type="submit" disabled={busy || code.length !== 6} className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600/25 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? 'Checking…' : 'Verify and continue'}
          </button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" onClick={resend} disabled={wait > 0 || busy} className="inline-flex min-h-11 items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-900 disabled:cursor-not-allowed disabled:text-slate-500">
            <RefreshCw size={15} aria-hidden="true" />{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
          </button>
          <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={15} aria-hidden="true" />Use a different email</button>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">TechAbhi will never ask you for this code by phone or chat. Check your spam folder if it does not arrive.</p>
      </div>
    </div>
  );
}
