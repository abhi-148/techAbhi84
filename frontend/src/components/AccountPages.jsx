import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, KeyRound, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useMeta, fmtDate, inputCls } from '../lib/format';

const opt = (scope) => (scope === 'recruiter' ? { recruiter: true } : { candidate: true });

// "Notifications": a real feed built from actual events (application updates, new applications, proposals needing approval).
export function ActivityPage({ scope }) {
  useMeta('Notifications | TechAbhi', 'Recent activity on your TechAbhi account.', { noindex: true });
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { let live = true; api(`/${scope}/account/activity`, opt(scope)).then((r) => live && setD(r.items)).catch((e) => live && setErr(e.message)); return () => { live = false; }; }, [scope]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Notifications</h1>
      <p className="mt-1 text-sm text-slate-600">{scope === 'recruiter' ? 'Recent applications to your jobs.' : 'Updates on your applications and career assistance.'}</p>
      <div className="mt-6" aria-live="polite">
        {err && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{err}</p>}
        {!d && !err && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>}
        {d && d.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <BellOff className="mx-auto text-slate-300" size={36} aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-800">Nothing new yet</p>
            <p className="mt-1 text-sm text-slate-600">{scope === 'recruiter' ? 'New applications will appear here.' : 'When an application or request changes, you’ll see it here.'}</p>
          </div>
        )}
        {d && d.length > 0 && (
          <ul className="space-y-3">
            {d.map((i, k) => (
              <li key={k}>
                <Link to={i.link} className={`flex items-start gap-3.5 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${i.urgent ? 'border-amber-300' : 'border-slate-200'}`}>
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${i.urgent ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}><Bell size={17} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900">{i.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-600">{i.detail}</span>
                    <span className="mt-1 block text-xs text-slate-500">{fmtDate(i.at)}</span>
                  </span>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-slate-500" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function SettingsPage({ scope }) {
  useMeta('Account settings | TechAbhi', 'Change your TechAbhi password.', { noindex: true });
  const [f, setF] = useState({ cur: '', next: '', again: '' }); const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setOk(false); };
  async function submit(e) {
    e.preventDefault(); setErr(''); setOk(false);
    if (f.next.length < 8) return setErr('New password must be at least 8 characters.');
    if (f.next !== f.again) return setErr('The new passwords do not match.');
    setBusy(true);
    try { await api(`/${scope}/account/password`, { method: 'POST', body: { current_password: f.cur, new_password: f.next }, ...opt(scope) }); setOk(true); setF({ cur: '', next: '', again: '' }); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  const type = show ? 'text' : 'password';
  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Account settings</h1>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><KeyRound size={18} className="text-indigo-600" aria-hidden="true" />Change password</h2>
        <div><label htmlFor="pw-cur" className="mb-1.5 block text-sm font-semibold text-slate-700">Current password</label><input id="pw-cur" type={type} autoComplete="current-password" value={f.cur} onChange={set('cur')} className={`${inputCls} h-12`} /></div>
        <div>
          <label htmlFor="pw-new" className="mb-1.5 block text-sm font-semibold text-slate-700">New password</label>
          <div className="relative"><input id="pw-new" type={type} autoComplete="new-password" value={f.next} onChange={set('next')} className={`${inputCls} h-12 pr-12`} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide passwords' : 'Show passwords'} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center text-slate-500">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
        </div>
        <div><label htmlFor="pw-again" className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm new password</label><input id="pw-again" type={type} autoComplete="new-password" value={f.again} onChange={set('again')} className={`${inputCls} h-12`} /></div>
        {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
        {ok && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} aria-hidden="true" />Password updated.</p>}
        <button disabled={busy || !f.cur || !f.next} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}Update password</button>
      </form>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />Changing your password does not sign out other devices; those sessions end on their own when they expire.</p>
    </div>
  );
}
