import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, IndianRupee, BriefcaseBusiness, Bookmark, BookmarkCheck, ArrowRight, Laptop, Clock, Globe2, Navigation, GraduationCap, Star, FileText } from 'lucide-react';
import { TYPE_LABEL, MODE_LABEL, SECTOR_LABEL, timeAgo, ymdParts, fmtTime, driveState, DRIVE_LABEL, directionsUrl } from '../lib/format';
import { useSavedJobs } from '../lib/saved';
import CompanyAvatar from './CompanyAvatar';
import TrustBadge from './TrustBadge';
import ShareButton from './ShareButton';

function Fact({ icon: Icon, children, label }) {
  if (!children) return null;
  return (
    <li className="flex min-w-0 items-center gap-1.5 text-sm text-slate-700" title={label}>
      <Icon size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
      <span className="truncate"><span className="sr-only">{label}: </span>{children}</span>
    </li>
  );
}

const DRIVE_PILL = { upcoming: 'bg-sky-50 text-sky-800 border-sky-200', today: 'bg-rose-600 text-white border-rose-600', ongoing: 'bg-amber-50 text-amber-900 border-amber-300', expired: 'bg-slate-100 text-slate-600 border-slate-300' };

// One card, three treatments: walk-in drives (rose "ticket"), remote jobs (teal), everything else (neutral). Featured adds an amber edge.
export default function JobCard({ job }) {
  const { loggedIn, isSaved, toggle } = useSavedJobs();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  if (!job) return null;

  const walkIn = job.job_kind === 'walk_in';
  const remote = job.work_mode === 'remote';
  const skills = Array.isArray(job.skills) ? job.skills.filter(Boolean) : [];
  const url = `/jobs/${job.id}`;
  const saved = isSaved(job.id);
  const type = job.employment_type ? TYPE_LABEL[job.employment_type] || job.employment_type : '';
  const modeRaw = job.work_mode ? MODE_LABEL[job.work_mode] || job.work_mode : '';
  const mode = modeRaw && String(job.location || '').trim().toLowerCase() === modeRaw.toLowerCase() ? '' : modeRaw;
  const preview = (job.description_preview || '').replace(/\s+/g, ' ').trim();
  const ds = walkIn ? driveState(job) : null;
  const d = walkIn ? ymdParts(job.drive_date) : null;
  const maps = walkIn ? directionsUrl(job) : null;
  const docs = Array.isArray(job.documents_required) ? job.documents_required : [];
  const edge = job.featured ? 'border-l-4 border-l-accent-500' : walkIn ? 'border-l-4 border-l-rose-500' : remote ? 'border-l-4 border-l-teal-500' : '';

  async function onSave() {
    if (!loggedIn) { nav(`/candidate/login?next=${encodeURIComponent(loc.pathname + loc.search)}`); return; }
    setBusy(true); setMsg('');
    const r = await toggle(job.id);
    setBusy(false);
    if (r.error) setMsg(r.error);
  }

  return (
    <article className={`group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-indigo-300 hover:shadow-lift sm:p-5 ${edge}`}>
      {job.featured && <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-bold text-ink shadow-sm"><Star size={12} aria-hidden="true" />Featured</span>}
      <div className="flex items-start gap-3.5">
        {walkIn && d ? (
          <div aria-hidden="true" className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-rose-50 text-rose-700"><span className="text-xl font-extrabold leading-none">{d.d}</span><span className="mt-0.5 text-xs font-bold uppercase tracking-wide">{d.m}</span></div>
        ) : <CompanyAvatar name={job.company || job.title} logo={job.logo_url} />}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-snug text-slate-900">
            <Link to={url} className="after:absolute after:inset-0 after:content-[''] hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">{job.title}</Link>
          </h3>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-600">{job.company || 'Company not specified'}</p>
        </div>
        <button type="button" onClick={onSave} disabled={busy} aria-pressed={saved} aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
          title={loggedIn ? (saved ? 'Saved' : 'Save job') : 'Log in to save jobs'}
          className={`relative z-10 -mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${saved ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
          {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ds && <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${DRIVE_PILL[ds]}`}><Clock size={12} aria-hidden="true" />{DRIVE_LABEL[ds]}{ds === 'today' && job.reporting_time ? ` · report by ${fmtTime(job.reporting_time)}` : ''}</span>}
        {remote && <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800"><Globe2 size={12} aria-hidden="true" />Remote{job.remote_region ? ` – ${REGION[job.remote_region] || job.remote_region}` : ''}</span>}
        {remote && job.work_authorization_required && <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">Work authorization required</span>}
        {job.fresher_eligible && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Freshers welcome</span>}
        <TrustBadge status={job.verification_status} />
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2">
        {walkIn && <Fact icon={MapPin} label="Venue">{[job.venue, job.city].filter(Boolean).join(', ') || job.location}</Fact>}
        {walkIn && <Fact icon={Clock} label="Timing">{[job.reporting_time && `Report ${fmtTime(job.reporting_time)}`, job.interview_time && `Interview ${fmtTime(job.interview_time)}`].filter(Boolean).join(' · ')}</Fact>}
        <Fact icon={BriefcaseBusiness} label="Experience">{job.experience}</Fact>
        <Fact icon={IndianRupee} label="Salary">{job.salary}</Fact>
        {!walkIn && <Fact icon={MapPin} label={remote ? 'Work location' : 'Location'}>{remote ? 'Remote' : job.location}</Fact>}
        {remote && <Fact icon={Globe2} label="Hiring region">{job.remote_region ? REGION[job.remote_region] || job.remote_region : 'Not specified'}</Fact>}
        {remote && <Fact icon={Clock} label="Time zone">{job.timezone_requirement}</Fact>}
        {!remote && !walkIn && <Fact icon={Laptop} label="Work mode">{mode}</Fact>}
        {job.education && !walkIn && <Fact icon={GraduationCap} label="Education">{job.education}</Fact>}
      </ul>

      {!walkIn && preview && <p className="ta-line-clamp-2 mt-3 text-sm leading-6 text-slate-600">{preview}</p>}
      {walkIn && docs.length > 0 && <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-slate-600"><FileText size={15} className="text-slate-500" aria-hidden="true" /><span className="font-medium">Bring:</span>{docs.slice(0, 3).join(', ')}{docs.length > 3 ? ` +${docs.length - 3} more` : ''}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {type && <span className={`rounded-md px-2 py-1 text-xs font-semibold ${job.employment_type === 'internship' ? 'bg-emerald-50 text-emerald-800' : 'bg-indigo-50 text-indigo-700'}`}>{type}</span>}
        {job.sector && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{SECTOR_LABEL[job.sector]}</span>}
        {skills.slice(0, 4).map((s) => <span key={s} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{s}</span>)}
        {skills.length > 4 && <span className="text-xs font-medium text-slate-500">+{skills.length - 4} more</span>}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
        <span className="text-xs text-slate-500">{timeAgo(job.published_at) ? `Posted ${timeAgo(job.published_at).toLowerCase()}` : ''}</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700">{walkIn ? 'Drive details & registration' : 'View job details & apply'} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
      </div>
      {walkIn && (
        <div className="relative z-10 mt-3 flex flex-wrap gap-2">
          {maps && <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-sm font-semibold text-white hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"><Navigation size={16} aria-hidden="true" />Get directions<span className="sr-only"> (opens Google Maps)</span></a>}
          <ShareButton job={job} />
        </div>
      )}
      {msg && <p role="alert" className="relative z-10 mt-2 text-sm text-rose-700">{msg}</p>}
    </article>
  );
}
const REGION = { india: 'India', worldwide: 'Worldwide', usa: 'USA', uk: 'UK', germany: 'Germany', canada: 'Canada', australia: 'Australia', europe: 'Europe', other: 'Other countries' };
