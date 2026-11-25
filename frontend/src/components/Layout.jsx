import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BriefcaseBusiness, Menu, X, ChevronDown, ChevronRight, UserRound, ShieldCheck, LayoutDashboard, Megaphone } from 'lucide-react';
import { api, useSession } from '../lib/api';
import LocationPicker from './LocationPicker';

const primary = [
  { to: '/jobs', label: 'Find Jobs' },
  { to: '/walk-in-drive', label: 'Walk-in Drives' },
  { to: '/remote-jobs', label: 'Remote Jobs' },
  { to: '/all-india-jobs', label: 'All India' },
  { to: '/companies', label: 'Companies' },
];
const moreMenu = [
  { to: '/internships', label: 'Internships', hint: 'For students and graduates' },
  { to: '/fresher-jobs', label: 'Fresher Jobs', hint: 'Roles open to freshers' },
  { to: '/career-resources', label: 'Career Resources', hint: 'Guides and interview prep' },
  { to: '/resume-services', label: 'Resume Services', hint: 'Get your resume reviewed' },
];
const recruiterMenu = [
  { to: '/for-recruiters', label: 'Hire with TechAbhi', hint: 'How recruiting works here' },
  { to: '/recruiter/jobs/new', label: 'Post a Job', hint: 'Needs an approved recruiter account' },
  { to: '/recruiter/login', label: 'Recruiter login' },
  { to: '/recruiter/register', label: 'Register your company' },
];
const loginMenu = [
  { to: '/candidate/login', label: 'Candidate login', hint: 'Job seekers' },
  { to: '/recruiter/login', label: 'Recruiter login', hint: 'Employers' },
];
const footerCols = [
  ['Job seekers', [['/jobs', 'Find jobs'], ['/walk-in-drive', 'Walk-in drives'], ['/remote-jobs', 'Remote jobs'], ['/all-india-jobs', 'All India jobs'], ['/fresher-jobs', 'Fresher jobs'], ['/internships', 'Internships'], ['/companies', 'Companies'], ['/resume-services', 'Resume services']]],
  ['Recruiters', [['/for-recruiters', 'For recruiters'], ['/recruiter/jobs/new', 'Post a job'], ['/recruiter/login', 'Recruiter login'], ['/recruiter/register', 'Register company']]],
  ['TechAbhi', [['/about', 'About us'], ['/career-resources', 'Career resources'], ['/contact', 'Contact'], ['/privacy', 'Privacy policy'], ['/terms', 'Terms of use']]],
];

const linkBase = 'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500';
const navClass = ({ isActive }) => `${linkBase} ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

function Dropdown({ label, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}
        className={`${linkBase} inline-flex items-center gap-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900`}>
        {label}<ChevronDown size={15} className={`transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className={`absolute top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {items.map((i) => (
            <Link key={i.to} to={i.to} className="block rounded-lg px-3 py-2.5 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
              <span className="block text-sm font-semibold text-slate-800">{i.label}</span>
              {i.hint && <span className="block text-xs text-slate-500">{i.hint}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const cand = !!useSession('candidate'); const rec = !!useSession('recruiter');
  const [site, setSite] = useState(null); const [hideNote, setHideNote] = useState(false);
  useEffect(() => { api('/site').then(setSite).catch(() => {}); }, []);
  const note = !hideNote && site?.announcements?.[0];
  // Logged-in workspaces (candidate/recruiter/admin dashboards) bring their own header and navigation.
  const workspace = /^\/(candidate|recruiter)\/(?!login|register)/.test(location.pathname) || /^\/admin(\/(?!login)|$)/.test(location.pathname);

  useEffect(() => { setOpen(false); window.scrollTo?.(0, 0); }, [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open]);

  const mobileLink = ({ isActive }) => `flex min-h-12 items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-800 hover:bg-slate-50'}`;
  const mobileGroup = (t) => <p className="px-4 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t}</p>;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-[#f7f8fc] text-slate-900 antialiased">
      <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white p-3 text-indigo-700 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:shadow-lg">Skip to main content</a>

      {!workspace && <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        {note && (
          <div className={`flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium ${note.level === 'warning' ? 'bg-amber-100 text-amber-950' : note.level === 'success' ? 'bg-emerald-100 text-emerald-950' : 'bg-indigo-900 text-white'}`} role="status">
            <Megaphone size={16} aria-hidden="true" className="shrink-0" /><span>{note.message}{note.link_url && <> <a href={note.link_url} target="_blank" rel="noopener noreferrer" className="font-bold underline">Learn more</a></>}</span>
            <button type="button" onClick={() => setHideNote(true)} aria-label="Dismiss announcement" className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/10"><X size={16} /></button>
          </div>
        )}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="TechAbhi home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-accent-400"><BriefcaseBusiness size={19} aria-hidden="true" /></span>
            <span className="text-lg font-extrabold tracking-tight text-ink">TechAbhi<span className="text-accent-500">.</span></span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 xl:flex">
            {primary.map((l) => <NavLink key={l.to} to={l.to} className={navClass}>{l.label}</NavLink>)}
            <Dropdown label="More" items={moreMenu} align="left" />
          </nav>

          <div className="hidden items-center gap-1.5 xl:flex">
            <LocationPicker className="whitespace-nowrap" />
            {cand || rec ? (
              <Link to={cand ? '/candidate/dashboard' : '/recruiter/dashboard'} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                <LayoutDashboard size={16} aria-hidden="true" />{cand ? 'My account' : 'Recruiter dashboard'}
              </Link>
            ) : (
              <>
                <Dropdown label="For Recruiters" items={recruiterMenu} />
                <Dropdown label="Login" items={loginMenu} />
                <Link to="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Register</Link>
              </>
            )}
          </div>

          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 xl:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>}

      {open && !workspace && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto overscroll-contain bg-white pb-8 xl:hidden">
          <nav aria-label="Mobile" className="mx-auto max-w-lg space-y-0.5 px-3 pt-2">
            <NavLink to="/" end className={mobileLink}>Home<ChevronRight size={16} className="text-slate-500" /></NavLink>
            {[...primary, ...moreMenu].map((l) => <NavLink key={l.to} to={l.to} className={mobileLink}>{l.label}<ChevronRight size={16} className="text-slate-500" /></NavLink>)}
            <div className="px-1 pt-2"><LocationPicker className="!max-w-none w-full justify-center border border-slate-300" /></div>
            <NavLink to="/about" className={mobileLink}>About Us<ChevronRight size={16} className="text-slate-500" /></NavLink>
            {mobileGroup('Recruiters')}
            <NavLink to="/for-recruiters" className={mobileLink}>For Recruiters<ChevronRight size={16} className="text-slate-500" /></NavLink>
            <NavLink to="/recruiter/jobs/new" className={mobileLink}>Post a Job<ChevronRight size={16} className="text-slate-500" /></NavLink>
            {mobileGroup('Your account')}
            {cand || rec ? (
              <Link to={cand ? '/candidate/dashboard' : '/recruiter/dashboard'} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"><UserRound size={17} />{cand ? 'My account' : 'Recruiter dashboard'}</Link>
            ) : (
              <div className="grid grid-cols-2 gap-2 px-1">
                <Link to="/candidate/login" className="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800">Candidate login</Link>
                <Link to="/recruiter/login" className="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800">Recruiter login</Link>
                <Link to="/register" className="col-span-2 flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white">Register</Link>
              </div>
            )}
          </nav>
        </div>
      )}

      <main id="main-content" className="flex-1"><Outlet /></main>

      {!workspace && <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white"><BriefcaseBusiness size={19} aria-hidden="true" /></span>
              <span className="text-lg font-extrabold tracking-tight">TechAbhi<span className="text-indigo-600">.</span></span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">Jobs, internships and career support in one place. Read the details here, then apply through the employer’s official channel.</p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><ShieldCheck size={14} aria-hidden="true" />Never pay a fee to apply for a job</p>
          </div>
          {footerCols.map(([title, items]) => (
            <nav key={title} aria-label={title}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h2>
              <ul className="mt-4 space-y-2.5">
                {items.map(([to, label]) => <li key={to}><Link to={to} className="inline-flex min-h-8 items-center text-sm text-slate-600 hover:text-indigo-700">{label}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-slate-100">
          <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-slate-500 sm:px-6 lg:px-8">© {new Date().getFullYear()} TechAbhi. All rights reserved.</p>
        </div>
      </footer>}
    </div>
  );
}
