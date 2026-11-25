
import { useEffect, useState } from 'react';
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  Settings,
  BriefcaseBusiness,
  ChevronRight,
  CircleUserRound,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

import { api, isCandidate, logout as signOut } from '../../lib/api';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    description: 'Your career overview',
    to: '/candidate/dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: 'My Profile',
    description: 'Personal and professional details',
    to: '/candidate/profile',
    icon: CircleUserRound,
  },
  {
    label: 'My Resume',
    description: 'Manage your resume',
    to: '/candidate/resume',
    icon: FileText,
  },
  {
    label: 'Saved Jobs',
    description: 'Your bookmarked opportunities',
    to: '/candidate/saved-jobs',
    icon: Bookmark,
  },
  {
    label: 'Applications',
    description: 'Jobs you are tracking',
    to: '/candidate/applications',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Career Assistance',
    description: 'Explore optional career support',
    to: '/candidate/career-assistance',
    icon: HeartHandshake,
  },
  {
    label: 'Notifications',
    description: 'Updates on your activity',
    to: '/candidate/notifications',
    icon: Bell,
  },
  {
    label: 'Account Settings',
    description: 'Change your password',
    to: '/candidate/settings',
    icon: Settings,
  },
];

const currentYear = new Date().getFullYear();

function Brand({ onNavigate }) {
  return (
    <NavLink
      to="/"
      onClick={onNavigate}
      aria-label="TechAbhi home"
      className="group inline-flex min-w-0 items-center gap-2.5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-600/20 transition duration-200 group-hover:scale-[1.03]">
        <BriefcaseBusiness size={20} strokeWidth={2.1} />
      </span>

      <span className="min-w-0">
        <span className="block text-[19px] font-extrabold leading-tight tracking-tight text-slate-950">
          Tech<span className="text-indigo-600">Abhi</span>.
        </span>
        <span className="mt-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Candidate workspace
        </span>
      </span>
    </NavLink>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f8fc] px-4 py-10">
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"
        role="status"
        aria-live="polite"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <ShieldCheck size={25} />
        </span>

        <h1 className="mt-4 text-base font-extrabold text-slate-900">
          Checking your account
        </h1>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Please wait while we verify your session.
        </p>

        <div className="mx-auto mt-5 h-1.5 w-36 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-600" />
        </div>
      </div>
    </div>
  );
}

function SidebarNav({ onNavigate }) {
  return (
    <nav aria-label="Candidate navigation">
      <div className="mb-3 flex items-center justify-between px-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
          Workspace
        </p>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
          MENU
        </span>
      </div>

      <div className="space-y-1">
        {NAV_ITEMS.map(({ label, description, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'group relative flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 transition duration-150',
                isActive
                  ? 'border-indigo-100 bg-indigo-50/90 text-indigo-700'
                  : 'border-transparent text-slate-600 hover:border-slate-100 hover:bg-slate-50 hover:text-slate-950',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-indigo-600" />
                )}

                <span
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-600',
                  ].join(' ')}
                >
                  <Icon size={17} strokeWidth={1.9} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">
                    {label}
                  </span>
                  <span
                    className={[
                      'mt-0.5 block truncate text-xs leading-4',
                      isActive ? 'text-indigo-600/80' : 'text-slate-500',
                    ].join(' ')}
                  >
                    {description}
                  </span>
                </span>

                {isActive && (
                  <ChevronRight
                    size={15}
                    className="shrink-0 text-indigo-500"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function SidebarFooter({ onLogout, onNavigate, busy }) {
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="rounded-xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50 to-violet-50 p-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
          <Sparkles size={17} />
        </span>

        <h3 className="mt-3 text-xs font-extrabold text-slate-900">
          Your next move starts here
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Discover new opportunities for your career.
        </p>

        <NavLink
          to="/jobs"
          onClick={onNavigate}
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 transition hover:text-indigo-900"
        >
          Explore jobs
          <ArrowRight size={13} />
        </NavLink>
      </div>

      <button
        type="button"
        onClick={onLogout}
        disabled={busy}
        className="mt-3 flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogOut size={17} />
        <span>{busy ? 'Logging out…' : 'Log out'}</span>
      </button>
    </div>
  );
}

function MobileDrawer({ onClose, onLogout, busy }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[2px]"
        aria-label="Close navigation menu"
        onClick={onClose}
      />

      <aside
        id="candidate-mobile-navigation"
        className="absolute inset-y-0 left-0 flex w-[min(88vw,330px)] flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-2xl sm:p-5"
        aria-label="Mobile candidate navigation"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <Brand onNavigate={onClose} />

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 py-5">
          <SidebarNav onNavigate={onClose} />
        </div>

        <SidebarFooter
          onLogout={onLogout}
          onNavigate={onClose}
          busy={busy}
        />
      </aside>
    </div>
  );
}

function CandidateFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200/80 py-5">
      <div className="flex flex-col justify-between gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:text-xs">
        <p>© {currentYear} TechAbhi. Keep moving forward.</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <NavLink
            to="/privacy"
            className="transition hover:text-indigo-600"
          >
            Privacy
          </NavLink>

          <NavLink
            to="/terms"
            className="transition hover:text-indigo-600"
          >
            Terms
          </NavLink>

          <NavLink
            to="/"
            className="inline-flex items-center gap-1 transition hover:text-indigo-600"
          >
            <ArrowLeft size={12} />
            Main website
          </NavLink>
        </div>
      </div>
    </footer>
  );
}

export default function CandidateLayout() {
  const [ok, setOk] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    if (!isCandidate()) {
      setOk(false);
      return () => {
        active = false;
      };
    }

    api('/candidate/me', { candidate: true })
      .then(() => {
        if (active) setOk(true);
      })
      .catch(() => {
        if (active) setOk(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const closeMobile = () => setMobileOpen(false);

  const logout = () => {
    if (loggingOut) return;

    setLoggingOut(true);
    signOut('candidate').finally(() => navigate('/', { replace: true }));
  };

  if (ok === null) return <LoadingScreen />;

  if (!ok) {
    return (
      <Navigate
        to={`/candidate/login?next=${encodeURIComponent(
          location.pathname + location.search
        )}`}
        replace
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
              aria-label="Open candidate menu"
              aria-expanded={mobileOpen}
              aria-controls="candidate-mobile-navigation"
            >
              <Menu size={19} />
            </button>

            <Brand />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NavLink
              to="/jobs"
              className="hidden min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 sm:inline-flex"
            >
              <BriefcaseBusiness size={16} />
              Browse jobs
            </NavLink>

            <span className="hidden h-7 w-px bg-slate-200 sm:block" />

            <NavLink
              to="/candidate/profile"
              className={({ isActive }) =>
                [
                  'inline-flex min-h-10 items-center gap-2 rounded-xl border px-2 py-1.5 transition sm:pr-3',
                  isActive
                    ? 'border-indigo-200 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50',
                ].join(' ')
              }
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <CircleUserRound size={17} />
              </span>
              <span className="hidden text-xs font-bold text-slate-700 sm:inline">
                My account
              </span>
            </NavLink>
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      {mobileOpen && (
        <MobileDrawer
          onClose={closeMobile}
          onLogout={logout}
          busy={loggingOut}
        />
      )}

      {/* Main application layout */}
      <div className="mx-auto flex w-full max-w-[1600px] items-start gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:gap-7 lg:px-8 lg:py-7">
        {/* Desktop sidebar */}
        <aside className="sticky top-[88px] hidden max-h-[calc(100vh-108px)] w-[240px] shrink-0 flex-col overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm lg:flex xl:w-[260px] xl:p-4">
          <SidebarNav />

          <div className="mt-auto">
            <SidebarFooter onLogout={logout} busy={loggingOut} />
          </div>
        </aside>

        {/* Page content */}
        <div className="min-w-0 flex-1">
          <div className="min-h-[60vh] min-w-0">
            <Outlet />
          </div>

          <CandidateFooter />
        </div>
      </div>
    </div>
  );
}
