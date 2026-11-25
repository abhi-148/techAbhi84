import { CalendarClock, Landmark, FileCheck2 } from 'lucide-react';
import JobExplorer from '../components/explorer/JobExplorer';
import PageHero from '../components/PageHero';
import LocationPicker from '../components/LocationPicker';

const cfg = {
  page: 'walk_in', noun: 'walk-in drives', locationAware: true,
  fixed: { kind: 'walk_in', sort: 'drive_date' }, sorts: 'walk_in',
  filterIds: ['state', 'city', 'company', 'category', 'sector', 'experience_level', 'min_salary', 'drive_date', 'education', 'verified'],
  labels: { company: 'Company', category: 'Job role / category' },
  summaryPath: '/jobs/walk-ins/summary',
  tabs: [['', 'All drives', 'total'], ['today', 'Today', 'today'], ['upcoming', 'Upcoming', 'upcoming'], ['recent', 'Recently announced', 'recent']],
  searchPlaceholder: 'Job role or company', darkHero: true,
  metaTitle: 'Walk-in Drives – Interview Dates, Venues and Documents | TechAbhi',
  metaDesc: 'Upcoming and today’s walk-in interview drives with venue, reporting time, documents required and the official registration link. Expired drives are removed automatically.',
  emptyTitle: 'No walk-in drives match right now', emptyHint: 'Drives are added by our team and verified recruiters, and removed once the date passes. Try another city or date, or browse regular jobs.',
  suggestLinks: [['/jobs', 'Browse all jobs'], ['/remote-jobs', 'Browse remote jobs']],
};

export default function WalkInDrivePage() {
  return <JobExplorer cfg={cfg} renderHero={({ search, summary }) => (
    <PageHero theme="walkin" eyebrow="Walk-in drives" title="Walk-in drives you can attend in person"
      intro="Check the date, venue, reporting time and documents before you go. Expired drives disappear automatically, and every listing shows how it was verified."
      aside={<LocationPicker variant="hero" />}>
      {search}
      <ul className="mt-6 grid gap-3 text-sm text-slate-100 sm:grid-cols-3">
        <li className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-3"><CalendarClock size={18} className="text-rose-300" aria-hidden="true" /><span><strong className="text-white">{summary ? summary.today : '–'}</strong> happening today</span></li>
        <li className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-3"><Landmark size={18} className="text-rose-300" aria-hidden="true" /><span><strong className="text-white">{summary ? summary.upcoming : '–'}</strong> upcoming</span></li>
        <li className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-3"><FileCheck2 size={18} className="text-rose-300" aria-hidden="true" /><span>Documents &amp; directions on each card</span></li>
      </ul>
    </PageHero>
  )} />;
}
