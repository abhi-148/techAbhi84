import { Globe2 } from 'lucide-react';
import JobExplorer from '../components/explorer/JobExplorer';
import PageHero from '../components/PageHero';
import LocationPicker from '../components/LocationPicker';

const REGIONS = [['india', 'India'], ['worldwide', 'Worldwide'], ['usa', 'USA'], ['uk', 'UK'], ['germany', 'Germany'], ['canada', 'Canada'], ['australia', 'Australia'], ['europe', 'Europe'], ['other', 'Other']];
const TYPES = [['', 'All remote'], ['full-time', 'Full-time'], ['part-time', 'Part-time'], ['internship', 'Internships'], ['freelance', 'Freelance']];

const cfg = {
  page: 'remote', noun: 'remote jobs', locationAware: true, fixed: { kind: 'remote' },
  filterIds: ['remote_region', 'eligibility', 'work_auth', 'timezone', 'employment_type', 'category', 'sector', 'experience_level', 'min_salary', 'skills', 'posted_within', 'verified'],
  searchPlaceholder: 'Role, skill or company', darkHero: true,
  metaTitle: 'Remote Jobs – Work From Home, India and Worldwide | TechAbhi',
  metaDesc: 'Find genuinely remote and work-from-home jobs and internships. See whether a role hires in India, worldwide or a specific country before you apply.',
  emptyTitle: 'No remote jobs match these filters', emptyHint: 'Only fully remote roles are listed here. Hybrid and office jobs are never shown as remote. Try a different hiring region or remove a filter.',
  suggestLinks: [['/jobs', 'Browse all jobs'], ['/walk-in-drive', 'Browse walk-in drives']],
  quick: ({ update, values }) => (
    <div className="mb-4 space-y-3">
      <div role="group" aria-label="Job type" className="flex flex-wrap gap-2">{TYPES.map(([v, l]) => { const on = (values.employment_type || '') === v; return <button key={v || 'all'} type="button" aria-pressed={on} onClick={() => update({ employment_type: v })} className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${on ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>; })}</div>
      <div role="group" aria-label="Hiring region" className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-700">Hiring in:</span>
        {REGIONS.map(([v, l]) => { const cur = (values.remote_region || '').split(',').filter(Boolean); const on = cur.includes(v); return <button key={v} type="button" aria-pressed={on} onClick={() => update({ remote_region: (on ? cur.filter((x) => x !== v) : [...cur, v]).join(',') })} className={`min-h-10 rounded-full border px-3.5 text-sm font-medium ${on ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>; })}</div>
    </div>
  ),
};

export default function RemoteJobsPage() {
  return <JobExplorer cfg={cfg} renderHero={({ search }) => (
    <PageHero theme="remote" eyebrow="Remote jobs" title="Work from anywhere, with the fine print up front"
      intro="Every role here is fully remote. We show who it hires (India, worldwide or a specific country), the time zone, and whether a work permit is needed, so you do not waste an application."
      aside={<LocationPicker variant="hero" />}>
      {search}
      <p className="mt-4 flex items-start gap-2 text-sm text-teal-100"><Globe2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />Hybrid and office jobs are never labelled remote on TechAbhi.</p>
    </PageHero>
  )} />;
}
