import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { api } from '../lib/api';
import { useMeta } from '../lib/format';
import CompanyAvatar from '../components/CompanyAvatar';
import PageHeader from '../components/PageHeader';

export default function CompaniesPage() {
  useMeta('Companies Hiring Now | TechAbhi', 'See which companies currently have open roles on TechAbhi and browse their jobs.');
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') || ''; const page = Math.max(parseInt(sp.get('page'), 10) || 1, 1);
  const [text, setText] = useState(q);
  const [data, setData] = useState(null); const [err, setErr] = useState('');

  useEffect(() => {
    let live = true; setData(null); setErr('');
    api(`/jobs/companies?limit=24&page=${page}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
      .then((d) => live && setData(d)).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [q, page]);

  const go = (next) => { const n = new URLSearchParams(sp); Object.entries(next).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); setSp(n); };
  const submit = (e) => { e.preventDefault(); go({ q: text.trim(), page: '' }); };

  return (
    <>
      <PageHeader eyebrow="Companies" title="Companies hiring right now">
        Every company below currently has at least one open role on TechAbhi.
      </PageHeader>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={submit} role="search" className="flex max-w-xl gap-2">
          <label htmlFor="co-q" className="sr-only">Search companies</label>
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input id="co-q" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search company name"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <button className="h-12 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">Search</button>
        </form>

        <div className="mt-8" aria-live="polite">
          {err && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{err}</p>}
          {!data && !err && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>}
          {data && data.companies.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Building2 className="mx-auto text-slate-300" size={36} aria-hidden="true" />
              <p className="mt-3 font-semibold text-slate-800">{q ? `No companies match “${q}”` : 'No companies have open roles yet'}</p>
              {q && <button onClick={() => { setText(''); go({ q: '', page: '' }); }} className="mt-3 text-sm font-semibold text-indigo-700">Clear search</button>}
            </div>
          )}
          {data && data.companies.length > 0 && (
            <>
              <p className="mb-4 text-sm text-slate-600">{data.total} {data.total === 1 ? 'company' : 'companies'}</p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.companies.map((c) => (
                  <li key={c.name}>
                    <Link to={`/companies/${encodeURIComponent(c.name)}`} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
                      <div className="flex items-center gap-3.5">
                        <CompanyAvatar name={c.name} logo={c.logo_url} />
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-bold text-slate-900">{c.name}</h2>
                          <p className="text-sm font-semibold text-indigo-700">{c.open_jobs} open {c.open_jobs === 1 ? 'role' : 'roles'}</p>
                        </div>
                      </div>
                      {c.locations.length > 0 && <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-600"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />{c.locations.join(' · ')}</p>}
                      {c.categories.length > 0 && <p className="mt-2 text-xs text-slate-500">{c.categories.join(' · ')}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
              {data.pages > 1 && (
                <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
                  <button disabled={page <= 1} onClick={() => go({ page: String(page - 1) })} className="flex h-11 items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold disabled:opacity-40"><ChevronLeft size={16} />Previous</button>
                  <span className="text-sm text-slate-600">Page {page} of {data.pages}</span>
                  <button disabled={page >= data.pages} onClick={() => go({ page: String(page + 1) })} className="flex h-11 items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold disabled:opacity-40">Next<ChevronRight size={16} /></button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
