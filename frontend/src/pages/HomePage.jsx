import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, CalendarClock, MapPin, BriefcaseBusiness, ArrowRight, ShieldCheck, Wallet, ListChecks, Sparkles, FileText, ScanSearch, LifeBuoy, GraduationCap, Laptop, UserRound, Building2, Layers } from 'lucide-react';
import { api, useSession } from '../lib/api';
import { useMeta } from '../lib/format';
import JobCard from '../components/JobCard';
import CompanyAvatar from '../components/CompanyAvatar';
import { GUIDES } from '../data/guides';

const EXPERIENCE = [['', 'Experience'], ['fresher', 'Fresher'], ['0-2', '0–2 years'], ['2-5', '2–5 years'], ['5-plus', '5+ years']];
const TONES = { default: '', walkin: 'bg-rose-50/70 border-y border-rose-100', remote: 'bg-teal-50/70 border-y border-teal-100', featured: 'bg-accent-50 border-y border-accent-100', intern: 'bg-emerald-50/60 border-y border-emerald-100' };
const EYEBROW = { default: 'text-indigo-700', walkin: 'text-rose-700', remote: 'text-teal-700', featured: 'text-accent-700', intern: 'text-emerald-700' };
const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';

function Section({ id, eyebrow, title, to, toLabel = 'View all', tone = 'default', children }) {
  return (
    <div className={TONES[tone]}>
    <section aria-labelledby={id} className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className={`text-sm font-bold uppercase tracking-wider ${EYEBROW[tone]}`}>{eyebrow}</p>}
          <h2 id={id} className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
        </div>
        {to && <Link to={to} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900">{toLabel}<ArrowRight size={15} aria-hidden="true" /></Link>}
      </div>
      {children}
    </section>
    </div>
  );
}
const JobGrid = ({ jobs }) => <div className="grid gap-4 lg:grid-cols-2">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>;

export default function HomePage() {
  useMeta('TechAbhi – Find Jobs, Internships and Fresher Openings in India', 'Search job openings, internships, fresher and remote roles. Read the details on TechAbhi and apply through the employer.');
  const navigate = useNavigate();
  const [q, setQ] = useState(''); const [loc, setLoc] = useState(''); const [exp, setExp] = useState('');
  const [d, setD] = useState({ loading: true });
  const [rec, setRec] = useState(null);
  const cand = !!useSession('candidate');
  const [site, setSite] = useState(null);

  useEffect(() => {
    let live = true;
    const get = (p) => api(p).catch(() => null);
    (async () => {
      const [latest, fresher, intern, remote, meta, cos, walk, siteData] = await Promise.all([
        get('/jobs?limit=12'), get('/jobs?fresher=1&limit=10'), get('/jobs?employment_type=internship&limit=10'),
        get('/jobs?kind=remote&limit=10'), get('/jobs/meta'), get('/jobs/companies?limit=8'), get('/jobs?kind=walk_in&sort=drive_date&limit=4'), get('/site'),
      ]);
      if (!live) return;
      // Each job appears once on the page. Featured and walk-in drives claim their cards first, then the rest in order.
      const seen = new Set();
      const take = (r, n) => { const out = (Array.isArray(r) ? r : r?.jobs || []).filter((j) => !seen.has(j.id)).slice(0, n); out.forEach((j) => seen.add(j.id)); return out; };
      const featured = take(siteData?.featured, 4); const walkIns = take(walk, 4); const latestJobs = take(latest, 6);
      setSite(siteData);
      setD({ total: latest?.total ?? 0, featured, walkIns, walkTotal: walk?.total ?? 0, latest: latestJobs, fresher: take(fresher, 4), internships: take(intern, 4), remote: take(remote, 4), meta: meta || {}, companies: cos?.companies || [], companyCount: cos?.total ?? 0 });
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!cand) return undefined;
    let live = true;
    api('/candidate/recommendations', { candidate: true }).then((r) => live && setRec((r.jobs || []).slice(0, 4))).catch(() => live && setRec([]));
    return () => { live = false; };
  }, [cand]);

  function search(e) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (loc.trim()) p.set('location', loc.trim());
    if (exp) p.set('experience_level', exp);
    navigate(`/jobs${p.toString() ? `?${p}` : ''}`);
  }
  const popular = (d.meta?.skills || []).slice(0, 6).map((s) => s.name);
  const field = 'h-12 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none';

  return (
    <>
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-wider text-accent-300">Jobs · Walk-in drives · Remote · Internships</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">{site?.home?.hero_title || <>Find Your Dream Job. <span className="text-accent-300">Build Your Future.</span></>}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">{site?.home?.hero_subtitle || 'Search genuine jobs, walk-in drives, remote roles and internships. Every listing shows how it was verified, so you know who to trust.'}</p>

          <form onSubmit={search} role="search" aria-label="Search jobs" className="mt-8 grid gap-2 rounded-2xl bg-white p-2 text-slate-900 shadow-xl sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_0.8fr_auto]">
            <label className="flex items-center gap-2.5 rounded-xl px-3 focus-within:bg-indigo-50/60"><Search size={18} className="shrink-0 text-slate-500" aria-hidden="true" /><span className="sr-only">Job title, skills or company</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skills or company" className={field} maxLength={120} /></label>
            <label className="flex items-center gap-2.5 rounded-xl px-3 focus-within:bg-indigo-50/60"><MapPin size={18} className="shrink-0 text-slate-500" aria-hidden="true" /><span className="sr-only">Location</span>
              <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City or remote" className={field} maxLength={80} /></label>
            <label className="flex items-center gap-2.5 rounded-xl px-3 focus-within:bg-indigo-50/60"><BriefcaseBusiness size={18} className="shrink-0 text-slate-500" aria-hidden="true" /><span className="sr-only">Experience</span>
              <select value={exp} onChange={(e) => setExp(e.target.value)} className={`${field} cursor-pointer`}>{EXPERIENCE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <button className={`${btnPrimary} h-12 sm:col-span-2 lg:col-span-1`}>Search Jobs</button>
          </form>

          {popular.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Popular searches:</span>
              {popular.map((s) => <Link key={s} to={`/jobs?q=${encodeURIComponent(s)}`} className="rounded-full border border-white/15 px-3 py-1.5 text-slate-200 hover:bg-white/10">{s}</Link>)}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2.5">
            {[['/walk-in-drive', 'Walk-in drives', CalendarClock], ['/remote-jobs', 'Remote jobs', Laptop], ['/all-india-jobs', 'All India', MapPin], ['/fresher-jobs', 'Fresher jobs', GraduationCap], ['/internships', 'Internships', Layers], ['/companies', 'Companies', Building2]].map(([to, l, Icon]) => (
              <Link key={to} to={to} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"><Icon size={16} aria-hidden="true" />{l}</Link>
            ))}
          </div>
          {!d.loading && (
            <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-3 border-t border-white/10 pt-6">
              <div><dt className="text-sm text-slate-300">Open jobs</dt><dd className="text-2xl font-extrabold">{d.total}</dd></div>
              <div><dt className="text-sm text-slate-300">Companies hiring</dt><dd className="text-2xl font-extrabold">{d.companyCount}</dd></div>
            </dl>
          )}
        </div>
      </section>

      <div className="border-b border-slate-200 bg-white">
        <ul className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[[ShieldCheck, 'Apply on the employer’s site', 'We show the details; you apply through the official channel.'], [Wallet, 'No fees for candidates', 'Never pay to apply for a job. Report anyone who asks.'], [ListChecks, 'Track what you apply to', 'Save jobs and follow every application in one place.'], [FileText, 'Resume support', 'Upload your resume and check it against a job.']].map(([Icon, t, s]) => (
            <li key={t} className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Icon size={20} aria-hidden="true" /></span><div><p className="text-sm font-bold text-slate-900">{t}</p><p className="text-xs leading-5 text-slate-600">{s}</p></div></li>
          ))}
        </ul>
      </div>

      {d.loading && <div className="mx-auto max-w-7xl px-4 py-10"><div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-52 ta-skel" />)}</div></div>}

      {!d.loading && d.latest.length + d.walkIns.length + d.featured.length === 0 && (
        <section className="mx-auto max-w-3xl px-4 py-16 text-center"><BriefcaseBusiness className="mx-auto text-slate-300" size={40} aria-hidden="true" /><h2 className="mt-3 text-xl font-bold text-slate-900">New jobs are on the way</h2><p className="mt-1 text-slate-600">There are no open roles right now. Create an account and check back soon.</p><Link to="/register" className={`${btnPrimary} mt-5`}>Create an account</Link></section>
      )}

      {!d.loading && d.latest.length + d.walkIns.length + d.featured.length > 0 && (
        <>
          {site?.home?.show_featured !== false && d.featured.length > 0 && <Section id="featured" tone="featured" eyebrow="Handpicked" title="Featured opportunities" to="/jobs?featured=1"><JobGrid jobs={d.featured} /></Section>}
          {site?.home?.show_walk_ins !== false && d.walkIns.length > 0 && <Section id="walkins" tone="walkin" eyebrow="In person" title="Walk-in drives" to="/walk-in-drive" toLabel={`All ${d.walkTotal} drives`}><JobGrid jobs={d.walkIns} /></Section>}
          {d.latest.length > 0 && <Section id="latest" eyebrow="Fresh openings" title="Latest job openings" to="/jobs"><JobGrid jobs={d.latest} /></Section>}

          {d.companies.length > 0 && (
            <Section id="companies" eyebrow="Hiring now" title="Top hiring companies" to="/companies" toLabel="All companies">
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {d.companies.map((c) => (
                  <li key={c.name}><Link to={`/companies/${encodeURIComponent(c.name)}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                    <CompanyAvatar name={c.name} logo={c.logo_url} /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{c.name}</p><p className="text-xs text-indigo-700">{c.open_jobs} open {c.open_jobs === 1 ? 'role' : 'roles'}</p></div></Link></li>
                ))}
              </ul>
            </Section>
          )}

          {(d.meta.categories || []).length > 0 && (
            <Section id="categories" eyebrow="Browse by field" title="Popular job categories">
              <ul className="flex flex-wrap gap-3">
                {d.meta.categories.map((c) => <li key={c.name}><Link to={`/jobs?category=${encodeURIComponent(c.name)}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:border-indigo-200 hover:text-indigo-700">{c.name}<span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">{c.n}</span></Link></li>)}
              </ul>
            </Section>
          )}

          {d.fresher.length > 0 && <Section id="fresher" eyebrow="Start your career" title="Fresher jobs" to="/fresher-jobs"><JobGrid jobs={d.fresher} /></Section>}
          {site?.home?.show_internships !== false && d.internships.length > 0 && <Section id="interns" tone="intern" eyebrow="Learn and earn" title="Internship opportunities" to="/internships"><JobGrid jobs={d.internships} /></Section>}
          {site?.home?.show_remote !== false && d.remote.length > 0 && <Section id="remote" tone="remote" eyebrow="Work from anywhere" title="Remote jobs" to="/remote-jobs"><JobGrid jobs={d.remote} /></Section>}

          {(d.meta.locations || []).length > 0 && (
            <Section id="locations" eyebrow="Jobs by location" title="Find jobs near you">
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {d.meta.locations.map((l) => <li key={l.name}><Link to={`/jobs?location=${encodeURIComponent(l.name)}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-sm hover:border-indigo-200 hover:text-indigo-700"><span className="flex min-w-0 items-center gap-2"><MapPin size={15} className="shrink-0 text-slate-500" aria-hidden="true" /><span className="truncate">{l.name}</span></span><span className="text-xs font-bold text-slate-500">{l.n}</span></Link></li>)}
              </ul>
            </Section>
          )}
        </>
      )}

      <Section id="recommended" eyebrow="For you" title="Recommended opportunities" to={cand ? '/candidate/dashboard' : undefined} toLabel="Open dashboard">
        {cand && rec?.length > 0 && <JobGrid jobs={rec} />}
        {cand && rec && rec.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">Add skills and a resume to your <Link to="/candidate/profile" className="font-semibold text-indigo-700">profile</Link> to see recommendations here.</p>}
        {cand && !rec && <div className="h-40 ta-skel" />}
        {!cand && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Sparkles size={22} aria-hidden="true" /></span><div><p className="font-bold text-slate-900">Get jobs matched to your skills</p><p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Create a free profile with your skills and resume, and TechAbhi will suggest relevant openings.</p></div></div>
            <Link to="/candidate/register" className={btnPrimary}>Create free profile</Link>
          </div>
        )}
      </Section>

      <Section id="guidance" eyebrow="Career guidance" title="Guides to help your search" to="/career-resources" toLabel="All guides">
        <ul className="grid gap-4 md:grid-cols-3">
          {GUIDES.slice(0, 3).map((g) => <li key={g.slug}><Link to={`/career-resources/${g.slug}`} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md"><span className="w-fit rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{g.tag}</span><p className="mt-3 font-bold leading-snug text-slate-900">{g.title}</p><p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{g.summary}</p></Link></li>)}
        </ul>
      </Section>

      <Section id="resume" eyebrow="Resume services" title="Get your resume job-ready" to="/resume-services" toLabel="Learn more">
        <ul className="grid gap-4 md:grid-cols-3">
          {[[FileText, 'Upload and preview', 'Keep your resume ready on your profile.'], [ScanSearch, 'Check against a job', 'See matching skills and gaps before you apply.'], [LifeBuoy, 'Career assistance', 'Ask the team to review your profile. No guarantees, and nothing is shared without your approval.']].map(([Icon, t, s]) => (
            <li key={t} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Icon size={20} aria-hidden="true" /></span><p className="mt-3 font-bold text-slate-900">{t}</p><p className="mt-1 text-sm leading-6 text-slate-600">{s}</p></li>
          ))}
        </ul>
      </Section>

      <Section id="why" eyebrow="Why TechAbhi" title="Built for candidates who want clarity">
        <ul className="grid gap-4 md:grid-cols-3">
          {[['Clear job details', 'Salary, experience, skills and how to apply are shown up front, so you can decide quickly.'], ['Safety first', 'We remind you never to pay to apply, and recruiters are reviewed before they can post.'], ['Your data, your choice', 'Your profile and resume are shared with a company only when you approve it.']].map(([t, s]) => (
            <li key={t} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="font-bold text-slate-900">{t}</p><p className="mt-1.5 text-sm leading-6 text-slate-600">{s}</p></li>
          ))}
        </ul>
      </Section>

      <section className="mx-auto max-w-7xl px-4 pb-14 pt-4 sm:px-6 lg:px-8" aria-labelledby="cta">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl bg-indigo-600 p-7 text-white"><UserRound size={26} aria-hidden="true" /><h2 id="cta" className="mt-3 text-xl font-extrabold">Looking for your next role?</h2><p className="mt-1.5 text-sm leading-6 text-indigo-100">Create a free profile, save jobs and track your applications.</p><Link to="/candidate/register" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Register as candidate<ArrowRight size={15} aria-hidden="true" /></Link></div>
          <div className="rounded-2xl bg-slate-900 p-7 text-white"><Building2 size={26} aria-hidden="true" /><h2 className="mt-3 text-xl font-extrabold">Hiring?</h2><p className="mt-1.5 text-sm leading-6 text-slate-300">Register your company, post jobs and manage applications from one dashboard.</p><Link to="/for-recruiters" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">For recruiters<ArrowRight size={15} aria-hidden="true" /></Link></div>
        </div>
      </section>
    </>
  );
}
