import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Globe2, FilePenLine, Clock, Star, ShieldCheck, Flag, Activity, Megaphone, Trash2, Save, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useMeta } from '../../lib/format';

const num = (v) => Number(v || 0).toLocaleString('en-IN');
const ACTION = { create: 'created', update: 'updated', publish: 'published', unpublish: 'unpublished', close: 'closed', delete: 'deleted', verify: 'verified', unverify: 'removed verification from', feature: 'featured', unfeature: 'unfeatured', login: 'signed in', dismiss_report: 'dismissed a report on', close_reported_job: 'closed a reported' };

/** Extra dashboard blocks: job mix, moderation queue and the audit trail. */
export function DashboardExtras({ s }) {
  const tiles = [
    [FilePenLine, 'Draft jobs', s.draft, '/admin/jobs?status=draft', 'text-slate-700 bg-slate-100'],
    [Clock, 'Expired jobs', s.expired, '/admin/jobs?status=expired', 'text-amber-800 bg-amber-100'],
    [CalendarClock, 'Live walk-in drives', s.walk_ins, '/admin/jobs?kind=walk_in&status=published', 'text-rose-800 bg-rose-100'],
    [Globe2, 'Live remote jobs', s.remote, '/admin/jobs?work_mode=remote&status=published', 'text-teal-800 bg-teal-100'],
    [Star, 'Featured jobs', s.featured, '/admin/jobs?featured=1', 'text-accent-800 bg-accent-100'],
    [ShieldCheck, 'Awaiting verification', s.awaiting_verification, '/admin/jobs?verification=awaiting&status=published', 'text-sky-800 bg-sky-100'],
    [Flag, 'Open reports', s.open_reports, '/admin/reports', 'text-rose-800 bg-rose-100'],
  ];
  return (
    <>
      <section className="mt-8" aria-labelledby="mix-h">
        <h2 id="mix-h" className="text-xl font-extrabold text-slate-900">Jobs and moderation</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map(([Icon, label, v, to, tone]) => (
            <li key={label}><Link to={to} className="flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-indigo-300"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={19} aria-hidden="true" /></span><span><span className="block text-2xl font-extrabold text-slate-900">{num(v)}</span><span className="block text-sm text-slate-600">{label}</span></span></Link></li>
          ))}
          <li className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800"><Activity size={19} aria-hidden="true" /></span><span><span className="block text-2xl font-extrabold text-slate-900">{num(s.views)}</span><span className="block text-sm text-slate-600">Job views</span></span></li>
        </ul>
      </section>
      <section className="mt-8" aria-labelledby="act-h">
        <h2 id="act-h" className="text-xl font-extrabold text-slate-900">Recent activity</h2>
        <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-card">
          {(s.activity || []).length === 0 && <li className="p-5 text-sm text-slate-600">Admin actions will appear here.</li>}
          {(s.activity || []).map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm"><span className="text-slate-800"><strong>{a.admin_email || 'Admin'}</strong> {ACTION[a.action] || a.action} {a.entity}{a.detail ? <> “{a.detail}”</> : null}</span><time className="text-slate-500" dateTime={a.created_at}>{new Date(a.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></li>
          ))}
        </ul>
      </section>
    </>
  );
}

const REASON = { fake_or_scam: 'Fake or scam', asks_for_money: 'Asks for money', expired: 'Expired', duplicate: 'Duplicate', wrong_details: 'Wrong details', other: 'Other' };
export function AdminReportsPage() {
  useMeta('Reported jobs | TechAbhi Admin', 'Moderation queue', { noindex: true });
  const [rows, setRows] = useState(null); const [err, setErr] = useState(''); const [note, setNote] = useState('');
  const load = useCallback(() => api('/admin/reports', { admin: true }).then((d) => setRows(d.reports)).catch((e) => { setErr(e.message); setRows([]); }), []);
  useEffect(() => { load(); }, [load]);
  const resolve = async (r, action) => {
    if (action === 'close_job' && !window.confirm(`Close “${r.title}”? It will stop showing to candidates.`)) return;
    setErr(''); setNote('');
    try { await api(`/admin/reports/${r.id}/resolve`, { method: 'POST', admin: true, body: { action } }); setNote(action === 'dismiss' ? 'Reports dismissed.' : 'Job closed.'); load(); } catch (e) { setErr(e.message); }
  };
  const seen = new Set();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-wider text-indigo-700">Moderation</p><h1 className="mt-1 text-3xl font-extrabold text-slate-900">Reported jobs</h1>
      <p className="mt-1 text-[15px] text-slate-600">Candidates report suspicious or wrong listings. Several independent reports automatically label a job “Reported opportunity”.</p>
      <div aria-live="polite" className="mt-4 space-y-2">{note && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 size={16} aria-hidden="true" />{note}</p>}{err && <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900"><AlertCircle size={16} aria-hidden="true" />{err}</p>}</div>
      <div className="mt-4 space-y-3">
        {!rows && <div className="ta-skel h-28 rounded-2xl" />}
        {rows && rows.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">No open reports. 🎉</div>}
        {rows?.map((r) => { const first = !seen.has(r.job_id); seen.add(r.job_id); return (
          <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-bold text-slate-900"><Link className="hover:underline" to={`/admin/jobs/${r.job_id}/preview`}>{r.title}</Link></h2><p className="text-sm text-slate-600">{r.company} · {r.open_for_job} open report{r.open_for_job === 1 ? '' : 's'} · job is {r.job_status}</p></div><span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-800">{REASON[r.reason]}</span></div>
            {r.details && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{r.details}</p>}
            <p className="mt-2 text-xs text-slate-500">{new Date(r.created_at).toLocaleString('en-IN')}</p>
            {first && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => resolve(r, 'dismiss')} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800 hover:bg-slate-50">Dismiss reports</button><button type="button" onClick={() => resolve(r, 'close_job')} className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-800">Close this job</button></div>}
          </article>); })}
      </div>
    </div>
  );
}

const field = 'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15';
function Lab({ id, children }) { return <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">{children}</label>; }
export function AdminContentPage() {
  useMeta('Site content | TechAbhi Admin', 'Content management', { noindex: true });
  const [d, setD] = useState(null); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [ann, setAnn] = useState({ message: '', link_url: '', level: 'info', ends_at: '' });
  const load = useCallback(() => api('/admin/cms', { admin: true }).then(setD).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const save = async (key, body) => { setErr(''); setMsg(''); try { await api(`/admin/cms/settings/${key}`, { method: 'PUT', admin: true, body }); setMsg('Saved.'); load(); } catch (e) { setErr(e.message); } };
  const addAnn = async (e) => { e.preventDefault(); setErr(''); setMsg(''); try { await api('/admin/cms/announcements', { method: 'POST', admin: true, body: { ...ann, ends_at: ann.ends_at || null, link_url: ann.link_url || null } }); setAnn({ message: '', link_url: '', level: 'info', ends_at: '' }); setMsg('Announcement published.'); load(); } catch (e2) { setErr(e2.message); } };
  const delAnn = async (id) => { if (!window.confirm('Delete this announcement?')) return; try { await api(`/admin/cms/announcements/${id}`, { method: 'DELETE', admin: true }); load(); } catch (e) { setErr(e.message); } };
  const toggleAnn = async (a) => { try { await api(`/admin/cms/announcements/${a.id}`, { method: 'PUT', admin: true, body: { ...a, active: !a.active } }); load(); } catch (e) { setErr(e.message); } };
  if (!d) return <div className="mx-auto max-w-4xl p-6">{err ? <p role="alert" className="text-rose-800">{err}</p> : <div className="ta-skel h-40 rounded-2xl" />}</div>;
  const setHome = (k) => (e) => setD({ ...d, home: { ...d.home, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } });
  const setContact = (k) => (e) => setD({ ...d, contact: { ...d.contact, [k]: e.target.value } });
  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6';
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div><p className="text-sm font-bold uppercase tracking-wider text-indigo-700">Content</p><h1 className="mt-1 text-3xl font-extrabold text-slate-900">Site content</h1><p className="mt-1 text-[15px] text-slate-600">Edit the homepage, announcements and contact details. Featured jobs are chosen from <Link to="/admin/jobs?status=published" className="font-semibold text-indigo-700 underline">Manage jobs</Link>.</p></div>
      <div aria-live="polite">{msg && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{msg}</p>}{err && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{err}</p>}</div>

      <section className={card} aria-labelledby="ann-h"><h2 id="ann-h" className="flex items-center gap-2 text-lg font-bold"><Megaphone size={19} aria-hidden="true" />Announcements</h2>
        <form onSubmit={addAnn} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Lab id="an-m">Message (max 300 characters)</Lab><input id="an-m" required maxLength={300} className={field} value={ann.message} onChange={(e) => setAnn({ ...ann, message: e.target.value })} /></div>
          <div><Lab id="an-l">Link (optional)</Lab><input id="an-l" type="url" className={field} value={ann.link_url} onChange={(e) => setAnn({ ...ann, link_url: e.target.value })} placeholder="https://" /></div>
          <div><Lab id="an-v">Style</Lab><select id="an-v" className={field} value={ann.level} onChange={(e) => setAnn({ ...ann, level: e.target.value })}><option value="info">Information</option><option value="success">Good news</option><option value="warning">Warning</option></select></div>
          <div><Lab id="an-e">Hide after (optional)</Lab><input id="an-e" type="datetime-local" className={field} value={ann.ends_at} onChange={(e) => setAnn({ ...ann, ends_at: e.target.value })} /></div>
          <div className="flex items-end"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white hover:bg-indigo-800"><Plus size={16} aria-hidden="true" />Publish announcement</button></div>
        </form>
        <ul className="mt-5 divide-y divide-slate-100">{d.announcements.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className={`text-[15px] ${a.active ? 'text-slate-900' : 'text-slate-500 line-through'}`}>{a.message}</span><span className="flex gap-2"><button type="button" onClick={() => toggleAnn(a)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold">{a.active ? 'Hide' : 'Show'}</button><button type="button" onClick={() => delAnn(a.id)} aria-label="Delete announcement" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-rose-300 text-rose-800"><Trash2 size={15} /></button></span></li>)}{d.announcements.length === 0 && <li className="py-3 text-sm text-slate-600">No announcements yet.</li>}</ul>
      </section>

      <section className={card} aria-labelledby="home-h"><h2 id="home-h" className="text-lg font-bold">Homepage</h2>
        <div className="mt-4 grid gap-3">
          <div><Lab id="h-t">Headline (leave empty for the default)</Lab><input id="h-t" maxLength={120} className={field} value={d.home.hero_title} onChange={setHome('hero_title')} /></div>
          <div><Lab id="h-s">Sub-headline</Lab><input id="h-s" maxLength={300} className={field} value={d.home.hero_subtitle} onChange={setHome('hero_subtitle')} /></div>
          <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="mb-1 text-sm font-semibold text-slate-800">Sections to show</legend>
            {[['show_featured', 'Featured opportunities'], ['show_walk_ins', 'Walk-in drives'], ['show_remote', 'Remote jobs'], ['show_internships', 'Internships']].map(([k, l]) => <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={d.home[k] !== false} onChange={setHome(k)} />{l}</label>)}</fieldset>
          <div><button type="button" onClick={() => save('home', d.home)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white hover:bg-indigo-800"><Save size={16} aria-hidden="true" />Save homepage</button></div>
        </div>
      </section>

      <section className={card} aria-labelledby="ct-h"><h2 id="ct-h" className="text-lg font-bold">Contact information</h2>
        <p className="mt-1 text-sm text-slate-600">Shown on the Contact page. Leave a field empty to hide it. Only publish details that really exist.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[['email', 'Support email', 'email'], ['security_email', 'Security / abuse email', 'email'], ['phone', 'Phone', 'tel'], ['hours', 'Support hours', 'text']].map(([k, l, t]) => <div key={k}><Lab id={`c-${k}`}>{l}</Lab><input id={`c-${k}`} type={t} className={field} value={d.contact[k]} onChange={setContact(k)} /></div>)}
          <div className="sm:col-span-2"><Lab id="c-a">Address</Lab><input id="c-a" className={field} value={d.contact.address} onChange={setContact('address')} /></div>
          <div><button type="button" onClick={() => save('contact', d.contact)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white hover:bg-indigo-800"><Save size={16} aria-hidden="true" />Save contact details</button></div>
        </div>
      </section>
    </div>
  );
}
