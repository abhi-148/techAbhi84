import JobExplorer from '../components/explorer/JobExplorer';
import PageHero from '../components/PageHero';
import LocationPicker from '../components/LocationPicker';

const cfg = {
  page: 'india', noun: 'jobs', locationAware: true, fixed: { scope: 'india' },
  filterIds: ['state', 'city', 'sector', 'category', 'employer_type', 'employment_type', 'work_mode', 'experience_level', 'min_salary', 'company', 'education', 'skills', 'posted_within', 'verified'],
  searchPlaceholder: 'Job title, skill or company',
  metaTitle: 'All India Jobs – Search by State and City | TechAbhi',
  metaDesc: 'Browse private-sector, MNC, IT and non-IT jobs across every Indian state and union territory, for freshers and experienced candidates.',
  emptyHint: 'Try another state or remove a filter. Government jobs appear only after TechAbhi verifies them against an official notice.',
  suggestLinks: [['/walk-in-drive', 'Browse walk-in drives'], ['/remote-jobs', 'Browse remote jobs']],
  quick: ({ update, values, meta }) => {
    const top = (meta.states || []).slice(0, 10);
    if (!top.length) return null;
    return (
      <div className="mb-4"><p className="mb-2 text-sm font-semibold text-slate-700">Popular states</p>
        <div className="flex flex-wrap gap-2">{top.map((s) => { const on = values.state === s.name; return <button key={s.name} type="button" aria-pressed={on} onClick={() => update({ state: on ? '' : s.name, city: '' })} className={`min-h-10 rounded-full border px-3.5 text-sm font-medium ${on ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{s.name} <span className={on ? 'text-white/80' : 'text-slate-500'}>({s.n})</span></button>; })}</div>
      </div>
    );
  },
};

export default function AllIndiaJobsPage() {
  return <JobExplorer cfg={cfg} renderHero={({ search }) => (
    <PageHero theme="india" eyebrow="All India" title="Jobs across every Indian state and union territory"
      intro="Private-sector, MNC, IT, non-IT, banking, sales, operations, support and engineering roles for freshers and experienced candidates. Pick a state or search any city."
      aside={<LocationPicker variant="hero" />}>{search}</PageHero>
  )} />;
}
