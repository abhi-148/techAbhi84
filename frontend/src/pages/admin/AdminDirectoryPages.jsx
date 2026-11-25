import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Users, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { useMeta, fmtDate } from '../../lib/format';

const STATUSES = ['new', 'in_review', 'shortlisted', 'interview', 'rejected', 'hired', 'withdrawn'];
const label = (s) => s.replace('_', ' ').replace(/^./, (c) => c.toUpperCase());

function useDirectory(kind) {
  const [sp, setSp] = useSearchParams(); const qs = sp.toString();
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { let live = true; setD(null); setErr(''); api(`/admin/directory/${kind}?${qs}`, { admin: true }).then((r) => live && setD(r)).catch((e) => live && setErr(e.message)); return () => { live = false; }; }, [kind, qs]);
  const go = (patch) => { const n = new URLSearchParams(sp); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!('page' in patch)) n.delete('page'); setSp(n); };
  return { sp, d, err, go };
}
function Shell({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Icon size={22} aria-hidden="true" /></span>
        <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1><p className="text-sm text-slate-600">{subtitle}</p></div></div>
      {children}
    </div>
  );
}
function Pager({ d, sp, go }) {
  if (!d || d.pages <= 1) return null; const page = d.page;
  return (<nav aria-label="Pagination" className="mt-5 flex items-center justify-center gap-3">
    <button disabled={page <= 1} onClick={() => go({ page: String(page - 1) })} className="flex h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold disabled:opacity-40"><ChevronLeft size={15} />Previous</button>
    <span className="text-sm text-slate-600">Page {page} of {d.pages}</span>
    <button disabled={page >= d.pages} onClick={() => go({ page: String(page + 1) })} className="flex h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold disabled:opacity-40">Next<ChevronRight size={15} /></button></nav>);
}
function SearchBox({ sp, go, placeholder, children }) {
  const [t, setT] = useState(sp.get('q') || '');
  return (<form onSubmit={(e) => { e.preventDefault(); go({ q: t.trim() }); }} role="search" className="mt-5 flex flex-wrap gap-2">
    <label className="relative min-w-[220px] flex-1"><span className="sr-only">{placeholder}</span><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" /></label>
    {children}<button className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">Search</button></form>);
}
const Empty = ({ text }) => <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">{text}</p>;
const Err = ({ text }) => <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{text}</p>;
const Loading = () => <div className="mt-6 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-200/70" />)}</div>;
const th = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500';

export function AdminCandidatesPage() {
  useMeta('Candidates | TechAbhi Admin', 'Registered candidates.', { noindex: true });
  const { sp, d, err, go } = useDirectory('candidates');
  return (
    <Shell title="Candidates" subtitle="Registered candidate accounts. Resumes and profiles are not shown here." icon={Users}>
      <SearchBox sp={sp} go={go} placeholder="Search by name or email" />
      {err && <Err text={err} />}{!d && !err && <Loading />}
      {d && d.candidates.length === 0 && <Empty text="No candidates match." />}
      {d && d.candidates.length > 0 && (<>
        <p className="mt-4 text-sm text-slate-600">{d.total} {d.total === 1 ? 'candidate' : 'candidates'}</p>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50"><tr><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Joined</th><th className={th}>Applications</th><th className={th}>Saved jobs</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{d.candidates.map((c) => (<tr key={c.id}><td className="px-4 py-3 font-semibold text-slate-900">{c.full_name}</td><td className="px-4 py-3 text-slate-600">{c.email}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtDate(c.created_at)}</td><td className="px-4 py-3">{c.applications}</td><td className="px-4 py-3">{c.saved_jobs}</td></tr>))}</tbody></table></div>
        <Pager d={d} sp={sp} go={go} /></>)}
    </Shell>
  );
}

export function AdminApplicationsPage() {
  useMeta('Applications | TechAbhi Admin', 'Applications submitted through TechAbhi.', { noindex: true });
  const { sp, d, err, go } = useDirectory('applications');
  return (
    <Shell title="Applications" subtitle="Applications submitted through TechAbhi to recruiter jobs. Application contents are visible only to the recruiter." icon={FileText}>
      <SearchBox sp={sp} go={go} placeholder="Search candidate, job or company">
        <label className="sr-only" htmlFor="ap-status">Status</label>
        <select id="ap-status" value={sp.get('status') || ''} onChange={(e) => go({ status: e.target.value })} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
      </SearchBox>
      {err && <Err text={err} />}{!d && !err && <Loading />}
      {d && d.applications.length === 0 && <Empty text="No applications match." />}
      {d && d.applications.length > 0 && (<>
        <p className="mt-4 text-sm text-slate-600">{d.total} {d.total === 1 ? 'application' : 'applications'}</p>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50"><tr><th className={th}>Candidate</th><th className={th}>Job</th><th className={th}>Status</th><th className={th}>Submitted</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{d.applications.map((a) => (<tr key={a.id}>
            <td className="px-4 py-3"><span className="block font-semibold text-slate-900">{a.candidate_name}</span><span className="block text-xs text-slate-500">{a.candidate_email}</span></td>
            <td className="px-4 py-3"><Link to={`/admin/jobs/${a.job_id}/preview`} className="font-semibold text-indigo-700 hover:underline">{a.title}</Link><span className="block text-xs text-slate-500">{a.company}</span></td>
            <td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{label(a.status)}</span></td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtDate(a.submitted_at)}</td></tr>))}</tbody></table></div>
        <Pager d={d} sp={sp} go={go} /></>)}
    </Shell>
  );
}
