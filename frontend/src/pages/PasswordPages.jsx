import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, MailCheck, CheckCircle2 } from 'lucide-react';
import { PasswordMeter, passwordProblems } from '../components/PasswordExtras';
import { api } from '../lib/api';
import { useMeta, inputCls } from '../lib/format';

const Shell = ({ title, children }) => (
  <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      {children}
    </div>
  </div>
);
const primary = 'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60';

export function ForgotPasswordPage() {
  useMeta('Forgot password | TechAbhi', 'Reset your TechAbhi password.', { noindex: true });
  const [sp] = useSearchParams();
  const [type, setType] = useState(sp.get('type') === 'recruiter' ? 'recruiter' : 'candidate');
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(''); const [err, setErr] = useState('');
  const [enabled, setEnabled] = useState(null);
  useEffect(() => { api('/auth/capabilities').then((d) => setEnabled(!!d.password_reset)).catch(() => setEnabled(false)); }, []);

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const d = await api('/auth/forgot', { method: 'POST', body: { type, email } }); setDone(d.message); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  if (done) return (
    <Shell title="Check your email">
      <p className="mt-4 flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><MailCheck className="mt-0.5 shrink-0" size={18} aria-hidden="true" />{done}</p>
      <p className="mt-4 text-sm text-slate-600">Nothing arrived? Check your spam folder, or try again in a few minutes.</p>
      <Link to={`/${type}/login`} className="mt-5 block text-center text-sm font-semibold text-indigo-700">Back to login</Link>
    </Shell>
  );
  return (
    <Shell title="Forgot your password?">
      <p className="mt-2 text-sm text-slate-600">Enter your account email and we’ll send you a link to choose a new password.</p>
      {enabled === false && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Password reset by email isn’t available right now. Please <Link to="/contact" className="font-semibold underline">contact us</Link> for help.</p>}
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="sr-only">Account type</legend>
          {['candidate', 'recruiter'].map((t) => (
            <label key={t} className={`flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold capitalize ${type === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-700'}`}>
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />{t}
            </label>
          ))}
        </fieldset>
        <div>
          <label htmlFor="fp-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
          <input id="fp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} h-12`} />
        </div>
        {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
        <button disabled={busy || !email || enabled === false} className={primary}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}Send reset link</button>
      </form>
      <Link to={`/${type}/login`} className="mt-5 block text-center text-sm font-semibold text-indigo-700">Back to login</Link>
    </Shell>
  );
}

export function ResetPasswordPage() {
  useMeta('Choose a new password | TechAbhi', 'Choose a new TechAbhi password.', { noindex: true });
  const [sp] = useSearchParams();
  const token = sp.get('token') || ''; const type = sp.get('type') === 'recruiter' ? 'recruiter' : 'candidate';
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr('');
    const problems = passwordProblems(pw);
    if (problems.length) return setErr('Your password needs ' + problems.join(' and ') + '.');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    setBusy(true);
    try { await api('/auth/reset', { method: 'POST', body: { token, password: pw } }); setOk(true); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  if (ok) return (
    <Shell title="Password updated">
      <p className="mt-4 flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 shrink-0" size={18} aria-hidden="true" />You can now log in with your new password.</p>
      <Link to={`/${type}/login`} className={`${primary} mt-5`}>Go to login</Link>
    </Shell>
  );
  return (
    <Shell title="Choose a new password">
      {!/^[a-f0-9]{64}$/.test(token) && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">This reset link is incomplete. Request a new one from the <Link to="/forgot-password" className="font-semibold underline">forgot password</Link> page.</p>}
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <div>
          <label htmlFor="rp-1" className="mb-1.5 block text-sm font-semibold text-slate-700">New password</label>
          <div className="relative">
            <input id="rp-1" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={`${inputCls} h-12 pr-12`} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center text-slate-500">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          <PasswordMeter password={pw} />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="rp-2" className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm new password</label>
          <input id="rp-2" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={`${inputCls} h-12`} />
        </div>
        {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
        <button disabled={busy || !/^[a-f0-9]{64}$/.test(token)} className={primary}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}Update password</button>
      </form>
    </Shell>
  );
}
