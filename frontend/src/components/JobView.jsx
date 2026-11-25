
import CompanyAvatar from './CompanyAvatar';
import {
  ExternalLink,
  Mail,
  Info,
  MapPin,
  Clock3,
  IndianRupee,
  GraduationCap,
  BriefcaseBusiness,
  Laptop,
  Users,
  CalendarDays,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Building2,
  FileText,
  Gift,
  ListChecks,
  ArrowUpRight,
  ArrowLeft,
  CircleCheck,
  Globe2,
  ClipboardCheck,
} from 'lucide-react';

import { Link } from 'react-router-dom';

import {
  TYPE_LABEL,
  MODE_LABEL,
  fmtDate,
  btnPrimary,
  safeHttp,
  emailLike,
} from '../lib/format';

import { track, markOpened } from '../lib/api';
import CandidateBox from './CandidateBox';
import SharePanel from './SharePanel';

function applyClick(job, preview) {
  if (preview || !job?.id) return;

  try {
    track(job.id, 'apply_click');
    markOpened(job.id);
  } catch {
    // Application navigation should remain usable if tracking fails.
  }
}

function Section({ title, icon: Icon, children, count }) {
  return (
    <section className="border-t border-slate-100 pt-6 first:border-0 first:pt-0">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
          <Icon size={19} strokeWidth={1.9} />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
            {title}
          </h2>
          {count !== undefined && (
            <p className="mt-0.5 text-xs text-slate-500">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

function Bullets({ items }) {
  return (
    <ul className="space-y-3.5">
      {items.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className="flex items-start gap-3 text-sm leading-6 text-slate-600"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={13} />
          </span>
          <span className="min-w-0 whitespace-pre-line break-words">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Fact({ label, value, icon: Icon, variant = 'default' }) {
  if (value === undefined || value === null || value === '') return null;

  const styles =
    variant === 'green'
      ? {
          wrapper: 'border-emerald-100 bg-emerald-50/60',
          icon: 'text-emerald-600',
          label: 'text-emerald-800',
          value: 'text-emerald-950',
        }
      : {
          wrapper: 'border-slate-200/80 bg-slate-50/80',
          icon: 'text-indigo-600',
          label: 'text-slate-500',
          value: 'text-slate-800',
        };

  // A description-list group may only contain <dt>/<dd>, so the icon lives inside the term.
  return (
    <div className={`min-w-0 rounded-xl border p-3.5 transition-colors hover:border-indigo-200 ${styles.wrapper}`}>
      <dt className={`flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] ${styles.label}`}>
        <span className={`shrink-0 ${styles.icon}`}><Icon size={16} strokeWidth={1.9} aria-hidden="true" /></span>
        {label}
      </dt>
      <dd title={String(value)} className={`mt-1.5 break-words text-sm font-bold leading-5 ${styles.value}`}>
        {value}
      </dd>
    </div>
  );
}

function ActionButton({ href, onClick, children, variant = 'primary' }) {
  const base =
    'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';

  const appearance =
    variant === 'secondary'
      ? 'border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
      : 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={onClick}
      className={`${base} ${appearance}`}
    >
      {children}
    </a>
  );
}

function ApplicationPanel({ job, preview, applicationUrl, applicationEmail, hasApply }) {
  return (
    <section
      id="job-application"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-white to-indigo-50/60 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <BriefcaseBusiness size={21} />
          </span>

          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-950">
              How to apply
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Review the instructions before applying.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {preview && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900">
            <Info size={17} className="mt-0.5 shrink-0" />
            <p>
              Preview mode is active. Application tracking is disabled in
              this preview.
            </p>
          </div>
        )}

        {applicationUrl && (
          <ActionButton
            href={applicationUrl}
            onClick={() => applyClick(job, preview)}
          >
            Apply on employer website
            <ExternalLink size={16} />
          </ActionButton>
        )}

        {applicationEmail && (
          <a
            href={`mailto:${applicationEmail}?subject=${encodeURIComponent(
              `Application: ${job.title || 'Job opportunity'}`
            )}`}
            onClick={() => applyClick(job, preview)}
            className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-indigo-200 hover:bg-indigo-50/60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Mail size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-slate-500">
                Apply by email
              </span>
              <span className="mt-1 block break-all text-sm font-semibold text-indigo-700">
                {applicationEmail}
              </span>
            </span>
            <ArrowUpRight size={15} className="mt-1 shrink-0 text-slate-500" />
          </a>
        )}

        {job.application_instructions && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <ClipboardCheck size={15} className="text-indigo-600" />
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Application instructions
              </p>
            </div>
            <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-700">
              {job.application_instructions}
            </p>
          </div>
        )}

        {!hasApply && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            <Info size={20} className="mx-auto text-slate-500" />
            <p className="mt-2 text-sm font-bold text-slate-700">
              No application details were provided
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Check back later or contact the employer directly. Never pay a fee to apply.
            </p>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-amber-700" />
          <p className="text-xs leading-5 text-amber-950">
            Verify the employer and review all requirements before sharing
            personal information or paying any fee.
          </p>
        </div>

        <p className="text-center text-xs leading-5 text-slate-500">
          {job.accepts_applications
            ? 'Check the employer instructions to understand how applications are accepted.'
            : 'TechAbhi does not submit applications for you. External applications are handled through the employer’s website or email.'}
        </p>
      </div>
    </section>
  );
}

export default function JobView({ job, preview = false, company = null }) {
  if (!job) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <BriefcaseBusiness size={26} />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-slate-950">
          Job details unavailable
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          This opportunity could not be displayed. It may be unavailable or
          the job information has not loaded yet.
        </p>
        <Link
          to="/jobs"
          className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          <ArrowLeft size={16} />
          Browse all jobs
        </Link>
      </div>
    );
  }

  const applicationUrl = safeHttp(job.application_url) ? job.application_url : null;
  const applicationEmail = emailLike(job.application_email) ? job.application_email : null;

  const hasApply = Boolean(
    applicationUrl ||
      applicationEmail ||
      job.application_instructions ||
      job.accepts_applications
  );

  const responsibilities = Array.isArray(job.responsibilities)
    ? job.responsibilities.filter(Boolean)
    : [];

  const requirements = Array.isArray(job.requirements)
    ? job.requirements.filter(Boolean)
    : [];

  const skills = Array.isArray(job.skills)
    ? job.skills.filter(Boolean)
    : [];

  const benefits = Array.isArray(job.benefits)
    ? job.benefits.filter(Boolean)
    : [];

  const employmentType = job.employment_type
    ? TYPE_LABEL[job.employment_type] || job.employment_type
    : '';

  const workMode = job.work_mode
    ? MODE_LABEL[job.work_mode] || job.work_mode
    : '';

  const facts = [
    { label: 'Location', value: job.location, icon: MapPin },
    {
      label: 'Salary / compensation',
      value: job.salary || 'Not disclosed',
      icon: IndianRupee,
      variant: 'green',
    },
    { label: 'Experience', value: job.experience, icon: GraduationCap },
    { label: 'Employment type', value: employmentType, icon: BriefcaseBusiness },
    { label: 'Work arrangement', value: workMode, icon: Laptop },
    { label: 'Open positions', value: job.openings, icon: Users },
    { label: 'Education', value: job.education, icon: GraduationCap },
    {
      label: 'Published',
      value: job.published_at ? fmtDate(job.published_at) : null,
      icon: CalendarDays,
    },
    {
      label: 'Application deadline',
      value: job.expires_at ? fmtDate(job.expires_at) : null,
      icon: Clock3,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      {/* Top navigation */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/jobs"
          className="inline-flex min-h-9 items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition hover:text-indigo-700"
        >
          <ArrowLeft size={16} />
          Back to jobs
        </Link>

        {preview ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
            <Info size={14} />
            Preview mode
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <ShieldCheck size={14} className="text-emerald-600" />
            Review job details before applying
          </span>
        )}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* MAIN CONTENT */}
        <div className="min-w-0 space-y-5">
          {/* Job header */}
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="relative isolate overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-5 py-6 text-white sm:px-7 sm:py-8">
              <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full border-[35px] border-white/[0.045]" />
              <div className="pointer-events-none absolute -bottom-20 right-1/4 -z-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

              <div className="relative">
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white sm:h-14 sm:w-14 sm:rounded-2xl">
                    <Building2 size={25} strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.17em] text-indigo-200 sm:text-xs">
                      Job opportunity
                    </p>

                    <h1 className="break-words text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-[34px]">
                      {job.title || 'Untitled position'}
                    </h1>

                    <p className="mt-2 flex items-start gap-2 text-sm font-medium leading-6 text-indigo-100 sm:text-base">
                      <BriefcaseBusiness
                        size={16}
                        className="mt-1 shrink-0"
                      />
                      <span className="break-words">
                        {job.company || 'Company not specified'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Job badges */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {employmentType && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                      <BriefcaseBusiness size={13} />
                      {employmentType}
                    </span>
                  )}

                  {workMode && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100">
                      <Globe2 size={13} />
                      {workMode}
                    </span>
                  )}

                  {job.location && (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100">
                      <MapPin size={13} className="shrink-0" />
                      <span className="break-words">{job.location}</span>
                    </span>
                  )}
                </div>

                {/* Salary and primary action */}
                <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-indigo-200/80">
                      Salary / compensation
                    </p>
                    <p className="mt-1.5 break-words text-xl font-black tracking-tight sm:text-2xl">
                      {job.salary || 'Not disclosed'}
                    </p>
                  </div>

                  {!preview && applicationUrl && (
                    <a
                      href={applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      onClick={() => applyClick(job, preview)}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-indigo-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-950"
                    >
                      Apply Now
                      <ArrowUpRight size={17} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Job details */}
            <div className="p-5 sm:p-7">
              <Section title="Job overview" icon={Sparkles}>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {facts.map((fact) => (
                    <Fact key={fact.label} {...fact} />
                  ))}
                </dl>
              </Section>

              {job.description && (
                <Section title="About this role" icon={FileText}>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                    <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                      {job.description}
                    </p>
                  </div>
                </Section>
              )}

              {responsibilities.length > 0 && (
                <Section
                  title="Key responsibilities"
                  icon={ListChecks}
                  count={responsibilities.length}
                >
                  <Bullets items={responsibilities} />
                </Section>
              )}

              {requirements.length > 0 && (
                <Section
                  title="Requirements & qualifications"
                  icon={ClipboardCheck}
                  count={requirements.length}
                >
                  <Bullets items={requirements} />
                </Section>
              )}

              {skills.length > 0 && (
                <Section
                  title="Skills & technologies"
                  icon={Sparkles}
                  count={skills.length}
                >
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                      >
                        <CheckCircle2 size={12} className="shrink-0" />
                        <span className="break-words">{skill}</span>
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {job.eligibility && (
                <Section title="Eligibility criteria" icon={GraduationCap}>
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4">
                    <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-700">
                      {job.eligibility}
                    </p>
                  </div>
                </Section>
              )}

              {benefits.length > 0 && (
                <Section
                  title="Benefits & perks"
                  icon={Gift}
                  count={benefits.length}
                >
                  <Bullets items={benefits} />
                </Section>
              )}
            </div>
          </article>

          {company && !preview && (
            <section aria-labelledby="about-company" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                <CompanyAvatar name={company.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 id="about-company" className="text-base font-bold text-slate-900 sm:text-lg">About {company.name}</h2>
                  <p className="mt-0.5 text-sm text-slate-600">{company.open_jobs} open {company.open_jobs === 1 ? 'role' : 'roles'} on TechAbhi</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/companies/${encodeURIComponent(company.name)}`} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">View all jobs</Link>
                  {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer nofollow" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Website</a>}
                </div>
              </div>
              {company.description && <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{company.description}</p>}
            </section>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-24">
          <ApplicationPanel
            job={job}
            preview={preview}
            applicationUrl={applicationUrl}
            applicationEmail={applicationEmail}
            hasApply={hasApply}
          />

          {!preview && <CandidateBox job={job} />}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <ArrowUpRight size={20} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-slate-950">
                  Share this opportunity
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Help someone discover this role.
                </p>
              </div>
            </div>

            <SharePanel job={job} count={!preview} />
          </section>

          <Link
            to="/jobs"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <BriefcaseBusiness size={16} />
            Explore more jobs
          </Link>
        </aside>
      </div>
    </div>
  );
}
