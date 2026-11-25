import { Link, useParams } from 'react-router-dom';
import { Clock, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { GUIDES, getGuide } from '../data/guides';
import { useMeta } from '../lib/format';
import PageHeader from '../components/PageHeader';
import { NotFound } from './JobDetailsPage';

export function ResourcesPage() {
  useMeta('Career Resources | TechAbhi', 'Practical guides on resumes, ATS, interviews, job-search scams and starting your career.');
  return (
    <>
      <PageHeader eyebrow="Career resources" title="Guides for your job search">
        Practical, plain-language guides on resumes, interviews and staying safe while you look for work.
      </PageHeader>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link to={`/career-resources/${g.slug}`} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
                <span className="w-fit rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{g.tag}</span>
                <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900">{g.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{g.summary}</p>
                <p className="mt-4 flex items-center justify-between text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" />{g.minutes} min read</span><span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700">Read <ArrowRight size={14} aria-hidden="true" /></span></p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 flex items-start gap-2 text-sm text-slate-500"><ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />These guides are general advice. They do not guarantee interviews or job offers.</p>
      </div>
    </>
  );
}

export function GuidePage() {
  const { slug } = useParams();
  const g = getGuide(slug);
  useMeta(g ? `${g.title} | TechAbhi` : 'Guide not found | TechAbhi', g?.summary);
  if (!g) return <NotFound />;
  const others = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 3);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to="/career-resources" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={16} aria-hidden="true" />All guides</Link>
      <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{g.tag}</span>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-900">{g.title}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><Clock size={14} aria-hidden="true" />{g.minutes} min read</p>
        <div className="mt-6 space-y-7">
          {g.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-bold text-slate-900">{s.h}</h2>
              {s.p?.map((t) => <p key={t} className="mt-2.5 text-sm leading-7 text-slate-700">{t}</p>)}
              {s.list && <ul className="mt-2.5 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 marker:text-indigo-400">{s.list.map((t) => <li key={t}>{t}</li>)}</ul>}
            </section>
          ))}
        </div>
      </article>
      <section className="mt-8">
        <h2 className="text-base font-bold text-slate-900">More guides</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {others.map((o) => <li key={o.slug}><Link to={`/career-resources/${o.slug}`} className="block h-full rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 hover:border-indigo-200 hover:text-indigo-700">{o.title}</Link></li>)}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/jobs" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Browse jobs</Link>
          <Link to="/resume-services" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">Resume services</Link>
        </div>
      </section>
    </div>
  );
}
