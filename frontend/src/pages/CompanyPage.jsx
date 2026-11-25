import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Globe } from 'lucide-react';
import { api } from '../lib/api';
import { useMeta } from '../lib/format';
import CompanyAvatar from '../components/CompanyAvatar';
import JobCard from '../components/JobCard';
import { NotFound } from './JobDetailsPage';

export default function CompanyPage() {
  const { name } = useParams();
  const [state, setState] = useState({ loading: true });
  useMeta(state.company ? `Jobs at ${state.company.name} | TechAbhi` : 'Company | TechAbhi', state.company ? `${state.company.open_jobs} open ${state.company.open_jobs === 1 ? 'role' : 'roles'} at ${state.company.name}. Read the details and apply through the employer.` : undefined);

  useEffect(() => {
    let live = true; setState({ loading: true });
    Promise.all([api(`/jobs/companies/${encodeURIComponent(name)}`), api(`/jobs?company=${encodeURIComponent(name)}&limit=50`)])
      .then(([c, j]) => live && setState({ company: c.company, jobs: j.jobs }))
      .catch((e) => live && setState({ error: e.status === 404 ? 'notfound' : e.message }));
    return () => { live = false; };
  }, [name]);

  if (state.loading) return <div className="mx-auto max-w-5xl px-4 py-10"><div className="h-40 animate-pulse rounded-2xl bg-slate-200/70" /></div>;
  if (state.error === 'notfound') return <NotFound />;
  if (state.error) return <p role="alert" className="mx-auto max-w-3xl p-8 text-rose-700">{state.error}</p>;
  const { company: c, jobs } = state;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/companies" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={16} aria-hidden="true" />All companies</Link>
      <header className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <CompanyAvatar name={c.name} size="lg" logo={c.logo_url} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{c.name}</h1>
            <p className="mt-1 text-sm font-semibold text-indigo-700">{c.open_jobs} open {c.open_jobs === 1 ? 'role' : 'roles'}</p>
          </div>
          {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Globe size={16} aria-hidden="true" />Company website</a>}
        </div>
        {c.description && <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-700">{c.description}</p>}
      </header>
      <h2 className="mb-4 mt-9 text-lg font-bold text-slate-900">Open roles at {c.name}</h2>
      <div className="grid gap-4">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
    </div>
  );
}
