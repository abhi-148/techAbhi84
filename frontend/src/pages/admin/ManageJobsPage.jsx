import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Star, ShieldCheck, Eye, Pencil, ExternalLink, Trash2, Copy, X, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api';
import { useMeta, fmtDrive, shareMessage, publicUrl } from '../../lib/format';
import TrustBadge from '../../components/TrustBadge';
import Pagination from '../../components/Pagination';

const TABS = [['', 'All'], ['published', 'Published'], ['draft', 'Drafts'], ['expired', 'Expired'], ['closed', 'Closed']];
const sel = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600';
const STATUS = { published: 'bg-emerald-50 text-emerald-800 border-emerald-200', draft: 'bg-slate-100 text-slate-700 border-slate-300', closed: 'bg-rose-50 text-rose-800 border-rose-200', expired: 'bg-amber-50 text-amber-900 border-amber-300' };
const isExpired = (j) => j.status === 'published' && j.expires_at && new Date(j.expires_at) <= new Date();

function Confirm({ spec, onCancel, onOk, busy }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onCancel(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/60 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby="cf-d" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift">
        <h2 id="cf-t" className="text-xl font-bold text-slate-900">{spec.title}</h2>
        <p id="cf-d" className="mt-2 text-[15px] leading-6 text-slate-700">{spec.body}</p>
        <div className="mt-6 flex gap-3"><button type="button" autoFocus onClick={onCancel} className="min-h-12 flex-1 rounded-xl border border-slate-300 text-sm font-bold text-slate-800">Cancel</button>
          <button type="button" onClick={onOk} disabled={busy} className={`min-h-12 flex-1 rounded-xl text-sm font-bold text-white disabled:opacity-60 ${spec.danger ? 'bg-rose-700 hover:bg-rose-800' : 'bg-indigo-700 hover:bg-indigo-800'}`}>{busy ? 'Working…' : spec.confirm}</button></div>
      </div>
    </div>
  );
}

export default function ManageJobsPage() {
  useMeta('Manage jobs | TechAbhi Admin', 'Manage job listings.', { noindex: true });
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, parseInt(sp.get('page'), 10) || 1);
  const f = { status: sp.get('status') || '', q: sp.get('q') || '', kind: sp.get('kind') || '', work_mode: sp.get('work_mode') || '', verification: sp.get('verification') || '', featured: sp.get('featured') || '' };
  const [kw, setKw] = useState(f.q);
  const [data, setData] = useState(null); const [err, setErr] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(null); const [confirm, setConfirm] = useState(null);

  const qs = sp.toString();
  const load = useCallback(async () => {
    setErr('');
    try { setData(await api(`/admin/jobs?${qs}${qs ? '&' : ''}limit=20`, { admin: true })); }
    catch (e) { setErr(e.message || 'Unable to load jobs.'); setData((d) => d || { jobs: [], total: 0, pages: 1 }); }
  }, [qs]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => { if (kw.trim() !== f.q) set({ q: kw.trim() }); }, 350); return () => clearTimeout(t); }, [kw]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch, keepPage) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k); } if (!keepPage) n.delete('page'); setSp(n); };
  const clear = () => { setKw(''); setSp(new URLSearchParams()); };
  const hasFilter = Object.values(f).some(Boolean);

  const act = async (job, label, path, opts = {}) => {
    setBusy(job.id); setErr(''); setNote('');
    try { await api(`/admin/jobs/${job.id}${path}`, { admin: true, ...opts }); setNote(`${label}: “${job.title}”.`); await load(); }
    catch (e) { setErr([e.message, ...(e.details || [])].filter(Boolean).join(' · ')); } finally { setBusy(null); setConfirm(null); }
  };
  const setStatus = (job, status, label) => act(job, label, '/status', { method: 'POST', body: { status } });
  const copy = async (job, message) => { try { await navigator.clipboard.writeText(message ? shareMessage(job, publicUrl(job)) : publicUrl(job)); setNote(message ? 'Share message copied.' : 'Public link copied.'); } catch { setErr('Could not copy to the clipboard.'); } };

  const btn = 'inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition disabled:opacity-50';
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-bold uppercase tracking-wider text-indigo-700">Admin</p><h1 className="mt-1 text-3xl font-extrabold text-slate-900">Manage jobs</h1><p className="mt-1 text-[15px] text-slate-600">Create, verify, feature, publish and close listings. {data ? <strong>{data.total}</strong> : '…'} matching.</p></div>
        <Link to="/admin/jobs/new" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white hover:bg-indigo-800"><Plus size={16} aria-hidden="true" />Create job</Link>
      </div>

      <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="relative"><label htmlFor="aj-q" className="sr-only">Search by title or company</label><Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input id="aj-q" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Search by title or company" className="h-12 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-[15px] outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15" /></div>
        <div role="tablist" aria-label="Status" className="flex flex-wrap gap-2">{TABS.map(([v, l]) => <button key={v || 'all'} role="tab" aria-selected={f.status === v} type="button" onClick={() => set({ status: v })} className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${f.status === v ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>)}</div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="aj-kind">Type</label><select id="aj-kind" className={sel} value={f.kind} onChange={(e) => set({ kind: e.target.value })}><option value="">All types</option><option value="standard">Regular jobs</option><option value="walk_in">Walk-in drives</option></select>
          <label className="sr-only" htmlFor="aj-mode">Work mode</label><select id="aj-mode" className={sel} value={f.work_mode} onChange={(e) => set({ work_mode: e.target.value })}><option value="">Any work mode</option><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select>
          <label className="sr-only" htmlFor="aj-ver">Verification</label><select id="aj-ver" className={sel} value={f.verification} onChange={(e) => set({ verification: e.target.value })}><option value="">Any verification</option><option value="awaiting">Awaiting verification</option><option value="recruiter_submitted">Recruiter submitted</option><option value="verified">Verified</option><option value="reported">Reported</option></select>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-medium"><input type="checkbox" className="h-5 w-5" checked={f.featured === '1'} onChange={(e) => set({ featured: e.target.checked ? '1' : '' })} />Featured only</label>
          {hasFilter && <button type="button" onClick={clear} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"><RotateCcw size={15} aria-hidden="true" />Clear filters</button>}
        </div>
      </div>

      <div aria-live="polite" className="mt-4 space-y-2">
        {note && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 size={17} aria-hidden="true" />{note}<button type="button" onClick={() => setNote('')} aria-label="Dismiss" className="ml-auto"><X size={16} /></button></p>}
        {err && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"><AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />{err}</p>}
      </div>

      <div className="mt-4 space-y-3">
        {!data && [0, 1, 2].map((i) => <div key={i} className="ta-skel h-32 rounded-2xl" />)}
        {data && data.jobs.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-lg font-bold text-slate-900">No jobs match</p><p className="mt-1 text-sm text-slate-600">{hasFilter ? 'Try clearing a filter.' : 'Create your first listing.'}</p></div>}
        {data?.jobs.map((j) => {
          const exp = isExpired(j); const st = exp ? 'expired' : j.status; const loading = busy === j.id;
          return (
            <article key={j.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><h2 className="break-words text-lg font-bold text-slate-900">{j.title}</h2><p className="mt-0.5 text-sm text-slate-600">{j.company || 'No company'} · {j.work_mode === 'remote' ? `Remote${j.remote_region_label ? ` – ${j.remote_region_label}` : ''}` : j.location || 'No location'}{j.job_kind === 'walk_in' && j.drive_date ? ` · Drive ${fmtDrive(j.drive_date)}` : ''}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${STATUS[st]}`}>{st}</span>
                  {j.job_kind === 'walk_in' && <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800">Walk-in</span>}
                  {j.featured && <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-bold text-accent-800"><Star size={12} aria-hidden="true" />Featured</span>}
                  <TrustBadge status={j.verification_status} />
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">{j.expires_at ? `Deadline ${new Date(j.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No deadline'}</p>
              {j.recruiter_id && <p className="mt-1 inline-flex rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800">Recruiter job</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/admin/jobs/${j.id}/edit`} className={`${btn} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}><Pencil size={15} aria-hidden="true" />Edit</Link>
                <Link to={`/admin/jobs/${j.id}/preview`} className={`${btn} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}><Eye size={15} aria-hidden="true" />Preview</Link>
                {j.status === 'published' && !exp && <Link to={`/jobs/${j.id}`} target="_blank" className={`${btn} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}><ExternalLink size={15} aria-hidden="true" />View live</Link>}
                {j.status === 'published' && <button type="button" onClick={() => copy(j, false)} className={`${btn} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}><Copy size={15} aria-hidden="true" />Copy link</button>}
                {j.status === 'published' && <button type="button" onClick={() => copy(j, true)} className={`${btn} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}><Copy size={15} aria-hidden="true" />Copy message</button>}
                {j.status !== 'published' && <button type="button" disabled={loading} onClick={() => setStatus(j, 'published', 'Published')} className={`${btn} border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800`}>Publish</button>}
                {j.status === 'published' && <button type="button" disabled={loading} onClick={() => setStatus(j, 'draft', 'Unpublished')} className={`${btn} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>Unpublish</button>}
                {j.status !== 'closed' && <button type="button" disabled={loading} onClick={() => setConfirm({ title: 'Close this job?', body: `“${j.title}” will stop appearing and accepting applications. You can reopen it later.`, confirm: 'Close job', run: () => setStatus(j, 'closed', 'Closed') })} className={`${btn} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>Close</button>}
                <button type="button" disabled={loading} aria-pressed={j.featured} onClick={() => act(j, j.featured ? 'Removed from featured' : 'Featured', '/feature', { method: 'POST', body: { featured: !j.featured } })} className={`${btn} ${j.featured ? 'border-accent-400 bg-accent-100 text-accent-900' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}><Star size={15} aria-hidden="true" />{j.featured ? 'Unfeature' : 'Feature'}</button>
                <button type="button" disabled={loading} onClick={() => act(j, j.verification_status === 'verified' ? 'Verification removed' : 'Verified', '/verify', { method: 'POST', body: { verified: j.verification_status !== 'verified' } })} className={`${btn} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}><ShieldCheck size={15} aria-hidden="true" />{j.verification_status === 'verified' ? 'Remove verification' : 'Verify'}</button>
                {j.status !== 'published' && <button type="button" disabled={loading} onClick={() => setConfirm({ danger: true, title: 'Delete this job permanently?', body: `“${j.title}” will be removed for good. This cannot be undone. Jobs with applications cannot be deleted; close them instead.`, confirm: 'Delete job', run: () => act(j, 'Deleted', '', { method: 'DELETE' }) })} className={`${btn} border-rose-300 bg-white text-rose-800 hover:bg-rose-50`}><Trash2 size={15} aria-hidden="true" />Delete</button>}
              </div>
            </article>
          );
        })}
      </div>
      {data && <Pagination page={data.page || page} pages={data.pages} onPage={(p) => set({ page: p > 1 ? String(p) : '' }, true)} />}
      {confirm && <Confirm spec={confirm} busy={busy !== null} onCancel={() => setConfirm(null)} onOk={confirm.run} />}
    </div>
  );
}
