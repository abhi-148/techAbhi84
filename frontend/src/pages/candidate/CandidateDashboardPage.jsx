
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  CheckCircle2,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileText,
  HeartHandshake,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  AlertCircle,
  MapPin,
  Zap,
} from 'lucide-react';

import { api } from '../../lib/api';
import JobCard from '../../components/JobCard';

const cx = (...classes) => classes.filter(Boolean).join(' ');

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, to, color, detail }) {
  const themes = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  };

  return (
    <Link
      to={to}
      className="group min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-900/[0.04] sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
            themes[color] || themes.indigo
          )}
        >
          <Icon size={19} />
        </span>
        <ArrowRight
          size={16}
          className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
        />
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
        {value ?? 0}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </Link>
  );
}

function QuickLink({ icon: Icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-indigo-100 group-hover:text-indigo-700">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-slate-800 sm:text-sm">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-4 text-slate-500">
          {description}
        </span>
      </span>
      <ChevronRight
        size={16}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
      />
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-52 rounded-2xl bg-slate-200 sm:h-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-36 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((item) => (
          <div key={item} className="h-48 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-sm sm:p-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
        <AlertCircle size={24} />
      </span>
      <h2 className="mt-4 text-lg font-extrabold text-slate-900">
        Dashboard couldn't load
      </h2>
      <p className="mt-2 break-words text-sm leading-6 text-slate-500">
        {message || 'Something went wrong. Please try again.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
      >
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  );
}

function ProfileProgress({ percent }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label="Profile completeness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function CandidateDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const loadDashboard = useCallback(async () => {
    setError('');

    try {
      const result = await api('/candidate/dashboard', {
        candidate: true,
      });
      setDashboard(result);
    } catch (err) {
      setError(err?.message || 'Unable to load your dashboard.');
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    try {
      const result = await api('/candidate/recommendations', {
        candidate: true,
      });
      setRecommendations(result || { jobs: [] });
    } catch {
      // Keep the main dashboard usable if recommendations are unavailable.
      setRecommendations({ jobs: [] });
    }
  }, []);

  useEffect(() => {
    let active = true;

    setDashboard(null);
    setRecommendations(null);
    setError('');

    const load = async () => {
      try {
        const result = await api('/candidate/dashboard', {
          candidate: true,
        });
        if (active) setDashboard(result);
      } catch (err) {
        if (active) {
          setError(err?.message || 'Unable to load your dashboard.');
        }
      }

      try {
        const result = await api('/candidate/recommendations', {
          candidate: true,
        });
        if (active) setRecommendations(result || { jobs: [] });
      } catch {
        if (active) setRecommendations({ jobs: [] });
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [retry]);

  if (error && !dashboard) {
    return (
      <div className="min-h-[60vh] bg-[#f7f8fc] px-4 py-12 sm:px-6 lg:px-8">
        <ErrorState
          message={error}
          onRetry={() => setRetry((value) => value + 1)}
        />
      </div>
    );
  }

  if (!dashboard) return <DashboardSkeleton />;

  const completeness = dashboard.completeness || {};
  const percent = Math.max(
    0,
    Math.min(100, Number(completeness.percent) || 0)
  );
  const missing = Array.isArray(completeness.missing)
    ? completeness.missing
    : [];
  const jobs = Array.isArray(recommendations?.jobs)
    ? recommendations.jobs
    : [];
  const firstName =
    String(dashboard.full_name || 'there').trim().split(/\s+/)[0] || 'there';

  return (
    <div className="min-h-screen bg-[#f7f8fc] pb-10">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-7 lg:px-8">
        {/* Welcome */}
        <section className="relative isolate overflow-hidden rounded-2xl bg-[#111735] px-5 py-6 shadow-lg shadow-indigo-950/[0.07] sm:px-7 sm:py-8 lg:px-9">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
            <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:32px_32px]" />
          </div>

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="min-w-0 max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-bold tracking-wide text-indigo-100">
                <Sparkles size={13} className="text-violet-300" />
                CANDIDATE WORKSPACE
              </span>

              <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                Welcome back,{' '}
                <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
                  {firstName}
                </span>
                .
              </h1>

              <p className="mt-3 max-w-xl text-xs leading-6 text-slate-300 sm:text-sm">
                Manage your profile, revisit saved opportunities and discover
                jobs for your next career move.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  to="/jobs"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-indigo-950 transition hover:bg-indigo-50 sm:text-sm"
                >
                  <Search size={15} />
                  Explore jobs
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/candidate/profile"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 sm:text-sm"
                >
                  <CircleUserRound size={15} />
                  My profile
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-300 sm:text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-300" />
                  Your candidate workspace
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-300" />
                  Your next step starts here
                </span>
              </div>
            </div>

            <div className="hidden shrink-0 items-center justify-center md:flex">
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-white/15 bg-white/[0.07] lg:h-36 lg:w-36">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-lg lg:h-28 lg:w-28">
                  <BriefcaseBusiness size={40} strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Overview stats */}
        <section>
          <SectionHeading
            eyebrow="Your overview"
            title="Career at a glance"
            description="Your saved opportunities and profile progress."
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={Bookmark}
              label="Saved jobs"
              value={dashboard.saved}
              to="/candidate/saved-jobs"
              color="violet"
              detail="Jobs you have bookmarked"
            />
            <StatCard
              icon={ChartNoAxesColumnIncreasing}
              label="Jobs you're tracking"
              value={dashboard.tracked}
              to="/candidate/applications"
              color="indigo"
              detail="Review your job activity"
            />
            <Link
              to="/candidate/profile"
              className="group min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-900/[0.04] sm:col-span-2 sm:p-5 lg:col-span-1"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                  <UserRound size={19} />
                </span>
                <ArrowRight
                  size={16}
                  className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
                />
              </div>
              <p className="mt-4 text-xs font-semibold text-slate-500">
                Profile completeness
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-slate-950">
                  {percent}%
                </span>
                <span className="text-xs text-slate-500">complete</span>
              </div>
              <div className="mt-3">
                <ProfileProgress percent={percent} />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {percent >= 100
                  ? 'Your profile is complete.'
                  : 'Add details to strengthen your profile.'}
              </p>
            </Link>
          </div>
        </section>

        {/* Profile progress and assistance */}
        <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <CircleUserRound size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">
                    Build a stronger profile
                  </h2>
                  <span
                    className={cx(
                      'rounded-full px-2.5 py-1 text-xs font-bold',
                      percent >= 100
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-indigo-50 text-indigo-700'
                    )}
                  >
                    {percent >= 100 ? 'Complete' : `${percent}% complete`}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Keep your candidate information accurate and up to date.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <ProfileProgress percent={percent} />
            </div>

            {missing.length > 0 ? (
              <>
                <p className="mt-4 text-xs font-bold text-slate-700">
                  Details you can still add
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {missing.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800"
                    >
                      <Clock3 size={12} className="shrink-0" />
                      <span className="break-words">{item}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={15} />
                No missing profile items to show.
              </p>
            )}

            <Link
              to="/candidate/profile"
              className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 sm:text-sm"
            >
              Update my profile
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white shadow-sm sm:p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 -z-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <HeartHandshake size={22} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold">
              Need career guidance?
            </h2>
            <p className="mt-2 text-xs leading-6 text-indigo-100 sm:text-sm">
              Explore the available career assistance service if you need
              support with your job search.
            </p>
            <Link
              to="/candidate/career-assistance"
              className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-50 sm:text-sm"
            >
              Explore assistance
              <ArrowRight size={15} />
            </Link>
            <p className="mt-3 text-xs leading-5 text-indigo-100/80">
              Assistance does not guarantee a job or interview.
            </p>
          </div>
        </section>

        {/* Recommended jobs */}
        <section>
          <SectionHeading
            eyebrow="For your next move"
            title="Recommended jobs"
            description="Suggestions from your candidate recommendations."
            action={
              <Link
                to="/jobs"
                className="inline-flex w-fit items-center gap-1.5 text-xs font-bold text-indigo-600 transition hover:text-indigo-800 sm:text-sm"
              >
                Browse all jobs
                <ArrowRight size={15} />
              </Link>
            }
          />

          {!recommendations ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-2xl bg-slate-200"
                />
              ))}
            </div>
          ) : (
            <>
              {recommendations.fallback && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                  <Target size={17} className="mt-0.5 shrink-0 text-amber-700" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-900">
                      Improve your job matches
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      Add skills to your profile to help surface more relevant
                      opportunities. Newest jobs are shown for now.
                    </p>
                    <Link
                      to="/candidate/profile"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline underline-offset-4"
                    >
                      Add your skills <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )}

              {jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center sm:py-12">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <BriefcaseBusiness size={23} />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold text-slate-900">
                    No recommended jobs yet
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500 sm:text-sm">
                    Explore available jobs and check back as new opportunities
                    are added.
                  </p>
                  <Link
                    to="/jobs"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 sm:text-sm"
                  >
                    Explore all jobs <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <div className="grid items-stretch gap-4 sm:grid-cols-2">
                  {jobs.map((job) => (
                    <div key={job.id} className="min-w-0">
                      <JobCard job={job} />

                      {((job.matched_skills?.length || 0) > 0 ||
                        (job.reasons?.length || 0) > 0) && (
                        <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                          <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 size={13} />
                            Why this job appears
                          </p>
                          <p className="mt-1 break-words text-xs leading-5 text-emerald-800">
                            {[
                              job.matched_skills?.length
                                ? `Matching skills: ${job.matched_skills.join(', ')}`
                                : null,
                              ...(Array.isArray(job.reasons)
                                ? job.reasons
                                : []),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Quick access */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <SectionHeading
            eyebrow="Your workspace"
            title="Quick access"
            description="Your most-used candidate tools, all in one place."
          />

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <QuickLink
              icon={CircleUserRound}
              title="My profile"
              description="Update your candidate details"
              to="/candidate/profile"
            />
            <QuickLink
              icon={Bookmark}
              title="Saved jobs"
              description="Revisit bookmarked opportunities"
              to="/candidate/saved-jobs"
            />
            <QuickLink
              icon={FileText}
              title="Applications tracker"
              description="Review jobs you're tracking"
              to="/candidate/applications"
            />
            <QuickLink
              icon={Search}
              title="Find opportunities"
              description="Explore available job listings"
              to="/jobs"
            />
            <QuickLink
              icon={HeartHandshake}
              title="Career assistance"
              description="Explore available support"
              to="/candidate/career-assistance"
            />
            <QuickLink
              icon={ShieldCheck}
              title="Account details"
              description="Review your candidate profile"
              to="/candidate/profile"
            />
          </div>
        </section>

        {/* Final CTA */}
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
              <BriefcaseBusiness size={19} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900">
                Ready for your next opportunity?
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Discover open positions and take your next career step.
              </p>
            </div>
          </div>
          <Link
            to="/jobs"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 sm:text-sm"
          >
            Explore jobs
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
}
