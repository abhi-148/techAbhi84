
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { api, track } from '../lib/api';
import { useMeta } from '../lib/format';
import JobView from '../components/JobView';
import JobCard from '../components/JobCard';
import { DriveDetails, RemoteDetails, TrustPanel } from '../components/JobExtras';

function PageContainer({ children }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#f7f8fc] text-slate-900">
      {children}
    </div>
  );
}

function LoadingPage() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 ta-skel" />
          <div className="h-3 w-28 ta-skel" />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="h-1.5 animate-pulse bg-indigo-100" />

          <div className="p-5 sm:p-8">
            <div className="flex gap-4">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-slate-100 sm:h-14 sm:w-14" />

              <div className="min-w-0 flex-1">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                <div className="mt-3 h-7 max-w-lg ta-skel" />
                <div className="mt-3 h-4 max-w-xs animate-pulse rounded bg-slate-100" />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {[85, 105, 90].map((width, index) => (
                <div
                  key={index}
                  style={{ width }}
                  className="h-7 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-[76px] animate-pulse rounded-xl border border-slate-100 bg-slate-50"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="h-5 w-44 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-slate-100" />
            <div className="mt-5 h-5 w-36 animate-pulse rounded bg-slate-100" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-50" />
          </div>

          <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </PageContainer>
  );
}

function StatusPage({
  title,
  description,
  icon: Icon,
  action,
  onRetry,
}) {
  return (
    <PageContainer>
      <div className="mx-auto flex min-h-[65vh] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-300" />

          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <Icon size={25} strokeWidth={1.8} />
          </span>

          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600">
            TECHABHI CAREERS
          </p>

          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            {title}
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {description}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <RefreshCw size={15} />
                Try again
              </button>
            )}

            <Link
              to={action?.to || '/jobs'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {action?.label || 'Browse all jobs'}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

export function NotFound({
  title = 'Page not found',
  text = "We couldn't find what you were looking for.",
}) {
  useMeta(`${title} | TechAbhi`, text);

  return (
    <StatusPage
      title={title}
      description={text}
      icon={FileSearch}
      action={{ to: '/jobs', label: 'Explore jobs' }}
    />
  );
}

function RelatedJobs({ jobs }) {
  if (!jobs.length) return null;

  return (
    <section className="mt-10 border-t border-slate-200 pt-8 sm:mt-12 sm:pt-10">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-indigo-600" />
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600 sm:text-xs">
              MORE OPPORTUNITIES
            </p>
          </div>

          <h2 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            Related jobs you may like
          </h2>

          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Explore other opportunities and find your next career move.
          </p>
        </div>

        <Link
          to="/jobs"
          className="inline-flex min-h-10 w-fit shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          View all jobs
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <Sparkles size={21} />
          </span>

          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
              Your next opportunity is out there.
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-600">
              Explore more roles, compare opportunities and find the right
              next step for your career.
            </p>
          </div>
        </div>

        <Link
          to="/jobs"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Browse jobs
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

export default function JobDetailsPage() {
  const { id } = useParams();

  const [state, setState] = useState({ loading: true });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    setState({ loading: true });

    api(`/jobs/${id}`)
      .then((data) => {
        if (!active) return;

        const job = data?.job;

        setState({
          job,
          related: Array.isArray(data?.related) ? data.related : [],
          company: data?.company || null,
        });

        if (job) {
          try {
            const key = `viewed_${id}`;

            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, '1');
              track(id, 'view');
            }
          } catch {
            // Tracking must never interrupt the job details page.
          }
        }
      })
      .catch((error) => {
        if (active) {
          setState({ error });
        }
      });

    return () => {
      active = false;
    };
  }, [id, retryKey]);

  const job = state.job;

  useMeta(
    job
      ? `${job.title || 'Job Details'}${job.company ? ` at ${job.company}` : ''} | TechAbhi`
      : 'Job Details | TechAbhi',
    job?.description?.slice(0, 155) ||
      'Explore job details, eligibility, skills, salary and application instructions on TechAbhi.'
  );

  if (state.loading) {
    return <LoadingPage />;
  }

  if (state.error?.status === 410) {
    return (
      <StatusPage
        title="This opportunity has closed"
        description="This job is no longer accepting applications. Explore other available opportunities on TechAbhi."
        icon={Clock3}
        action={{ to: '/jobs', label: 'Find other jobs' }}
      />
    );
  }

  if (state.error?.status === 404) {
    return (
      <StatusPage
        title="Job not found"
        description="This opportunity may have been removed or is no longer published. Browse other jobs to find an alternative."
        icon={FileSearch}
        action={{ to: '/jobs', label: 'Explore jobs' }}
      />
    );
  }

  if (state.error) {
    return (
      <StatusPage
        title="We couldn't load this job"
        description="Please check your internet connection and try again. Your job details may become available when the request succeeds."
        icon={RefreshCw}
        onRetry={() => setRetryKey((value) => value + 1)}
        action={{ to: '/jobs', label: 'Browse jobs' }}
      />
    );
  }

  if (!job) {
    return (
      <StatusPage
        title="Job details unavailable"
        description="We couldn't find the details for this opportunity. It may no longer be available."
        icon={FileSearch}
        action={{ to: '/jobs', label: 'Browse jobs' }}
      />
    );
  }

  const related = Array.isArray(state.related) ? state.related : [];

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm"
        >
          <Link
            to="/"
            className="transition hover:text-indigo-700"
          >
            Home
          </Link>

          <ChevronRight size={14} className="text-slate-300" />

          <Link
            to={job.job_kind === 'walk_in' ? '/walk-in-drive' : job.work_mode === 'remote' ? '/remote-jobs' : '/jobs'}
            className="transition hover:text-indigo-700"
          >
            {job.job_kind === 'walk_in' ? 'Walk-in drives' : job.work_mode === 'remote' ? 'Remote jobs' : 'Jobs'}
          </Link>

          <ChevronRight size={14} className="text-slate-300" />

          <span className="max-w-[220px] truncate font-semibold text-slate-800 sm:max-w-sm">
            {job.title || 'Job details'}
          </span>
        </nav>

        {/* Main job details component */}
        <DriveDetails job={job} />
        <RemoteDetails job={job} />
        <JobView job={job} company={state.company} />
        <TrustPanel job={job} />

        {/* Trust and safety note */}
        <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={21} />
            </span>

            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-950">
                Apply with confidence
              </h2>

              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                Review the job requirements and eligibility before applying.
                Verify the employer and never pay suspicious recruitment fees.
              </p>

              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={14} />
                Check all details before submitting your application
              </p>
            </div>
          </div>
        </section>

        {/* Related jobs */}
        <RelatedJobs jobs={related} />

        {/* Bottom call to action */}
        <BottomCTA />
      </div>
    </PageContainer>
  );
}
