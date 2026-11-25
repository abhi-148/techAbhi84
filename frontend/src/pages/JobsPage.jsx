import JobExplorer from '../components/explorer/JobExplorer';
import PageHero from '../components/PageHero';
import LocationPicker from '../components/LocationPicker';

const COMMON = ['state', 'city', 'company', 'category', 'sector', 'experience_level', 'min_salary', 'education', 'skills', 'posted_within', 'verified'];
const PRESETS = {
  all: { page: 'all', title: 'Find Jobs', h1: 'Find your next job', intro: 'Search genuine openings by role, skills, company and location. Every listing shows who verified it.', fixed: {}, filterIds: ['employment_type', 'work_mode', ...COMMON] },
  internships: { page: 'internships', title: 'Internships', h1: 'Internship opportunities', intro: 'Internships for students and recent graduates, including remote ones.', fixed: { employment_type: 'internship' }, filterIds: ['work_mode', ...COMMON] },
  fresher: { page: 'fresher', title: 'Fresher Jobs', h1: 'Fresher jobs', intro: 'Roles that welcome freshers and recent graduates.', fixed: { fresher: '1' }, filterIds: ['employment_type', 'work_mode', ...COMMON.filter((x) => x !== 'experience_level')] },
};

export default function JobsPage({ preset = 'all' }) {
  const P = PRESETS[preset] || PRESETS.all;
  const cfg = { ...P, locationAware: true, noun: 'jobs', metaTitle: `${P.title} | TechAbhi`, metaDesc: `${P.h1} on TechAbhi. Search by role, skills, company, location, experience, salary and work mode.`,
    suggestLinks: [['/walk-in-drive', 'Browse walk-in drives'], ['/remote-jobs', 'Browse remote jobs'], ['/all-india-jobs', 'Browse all India jobs']] };
  return <JobExplorer cfg={cfg} renderHero={({ search }) => (
    <PageHero eyebrow={preset === 'internships' ? 'Internships' : preset === 'fresher' ? 'For freshers' : 'Jobs'} title={P.h1} intro={P.intro} aside={<LocationPicker variant="hero" className="!border-slate-300 !bg-white !text-slate-800 hover:!bg-slate-50" />}>{search}</PageHero>
  )} />;
}
