
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe2,
  HeartHandshake,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { useMeta } from '../lib/format';

const CONTACT_EMAIL = 'pandeyabhi1056@gmail.com';

const pageContent = {
  about: {
    eyebrow: 'ABOUT TECHABHI',
    title: 'Your next career opportunity starts here.',
    description:
      'Explore jobs, discover internships and find opportunities that align with your skills, experience and career goals.',
    icon: Globe2,
    meta: 'About TechAbhi',
  },
  contact: {
    eyebrow: 'WE ARE HERE TO HELP',
    title: 'Let’s make your experience better.',
    description:
      'Have a question, found an incorrect listing or want to share feedback? We would love to hear from you.',
    icon: MessageCircle,
    meta: 'Contact TechAbhi',
  },
  privacy: {
    eyebrow: 'YOUR PRIVACY MATTERS',
    title: 'Transparency you can understand.',
    description:
      'Understand how information may be handled when you browse TechAbhi and use its job-search features.',
    icon: ShieldCheck,
    meta: 'Privacy Policy',
  },
  terms: {
    eyebrow: 'TERMS OF USE',
    title: 'A better experience starts with clarity.',
    description:
      'Review the guidelines for using TechAbhi and exploring job opportunities responsibly.',
    icon: FileText,
    meta: 'Terms and Conditions',
  },
};

const pageLinks = [
  { label: 'About', to: '/about', key: 'about', icon: Globe2 },
  { label: 'Contact', to: '/contact', key: 'contact', icon: Mail },
  { label: 'Privacy', to: '/privacy', key: 'privacy', icon: ShieldCheck },
  { label: 'Terms', to: '/terms', key: 'terms', icon: FileText },
];

const cardClass =
  'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition duration-200 hover:border-indigo-200 hover:shadow-[0_10px_30px_rgba(79,70,229,0.06)] sm:p-6';

const paragraphClass = 'text-sm leading-7 text-slate-600';

function PageHero({ page }) {
  const Icon = page.icon;

  return (
    <section className="relative isolate overflow-hidden bg-[#111735]">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-36 left-[20%] h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-6 sm:pb-16 sm:pt-9 lg:px-8">
        <Link
          to="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>

        <div className="mt-8 max-w-3xl sm:mt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-bold tracking-[0.15em] text-indigo-200 sm:text-xs">
            <Sparkles size={14} />
            {page.eyebrow}
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[46px]">
            {page.title}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            {page.description}
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-200">
              <Icon size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">TechAbhi</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Jobs · Internships · Career opportunities
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PageNavigation({ activePage }) {
  return (
    <nav
      aria-label="Information pages"
      className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm"
    >
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {pageLinks.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.key;

          return (
            <Link
              key={item.key}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-700'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ContentCard({ icon: Icon, title, children, className = '' }) {
  return (
    <section className={`${cardClass} ${className}`}>
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <Icon size={19} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-6 tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h2>

          <div className="mt-3 space-y-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function ContactCard() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copyEmail = async () => {
    setCopyError(false);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard is unavailable');
      }

      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <aside className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 sm:p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-600 shadow-sm">
        <Mail size={21} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
        Contact support
      </p>

      <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-slate-900">
        Let’s talk.
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        For questions, corrections, feedback or job listing removal requests,
        reach out by email.
      </p>

      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="mt-5 flex min-h-12 items-center gap-3 rounded-xl border border-indigo-100 bg-white p-3 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <Mail size={17} className="shrink-0" />
        <span className="min-w-0 break-all">{CONTACT_EMAIL}</span>
        <ExternalLink size={15} className="ml-auto shrink-0" />
      </a>

      <button
        type="button"
        onClick={copyEmail}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {copied ? <CheckCircle2 size={16} /> : <Mail size={16} />}
        {copied ? 'Email copied successfully' : 'Copy email address'}
      </button>

      {copyError && (
        <p role="status" className="mt-2 text-xs leading-5 text-rose-600">
          Copy is unavailable in this browser. Select the email above to copy it
          manually.
        </p>
      )}

      <div className="mt-5 border-t border-indigo-100 pt-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-indigo-600" />
          <p className="text-xs leading-5 text-slate-500">
            For listing issues, include the job title, listing URL and a short
            explanation. Never email passwords or verification codes.
          </p>
        </div>
      </div>
    </aside>
  );
}

function BottomCTA() {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-[#111735] p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-12 -top-20 -z-10 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] text-indigo-200">
            <BriefcaseBusiness size={21} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-300">
              Your next move
            </p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-white sm:text-xl">
              Ready for your next opportunity?
            </h2>
            <p className="mt-1.5 max-w-lg text-sm leading-6 text-slate-300">
              Explore available jobs and find opportunities that fit your
              career goals.
            </p>
          </div>
        </div>

        <Link
          to="/jobs"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-950 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#111735]"
        >
          Explore jobs
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

function PageLayout({ pageKey, children }) {
  const page = pageContent[pageKey];

  useMeta(`${page.meta} | TechAbhi`);

  return (
    <div className="min-h-screen bg-[#f7f8fc] pb-10">
      <PageHero page={page} />

      <div className="mx-auto -mt-5 max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8">
        <PageNavigation activePage={pageKey} />

        <div className="space-y-4 pb-2">{children}</div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-indigo-700"
          >
            <ArrowLeft size={15} />
            TechAbhi home
          </Link>

          <p className="text-xs leading-5 text-slate-500">
            Explore responsibly. Verify job details before applying.
          </p>
        </footer>
      </div>
    </div>
  );
}

export function About() {
  return (
    <PageLayout pageKey="about">
      <div className="grid gap-4 md:grid-cols-2">
        <ContentCard
          icon={BriefcaseBusiness}
          title="Discover opportunities"
        >
          <p className={paragraphClass}>
            TechAbhi is a job discovery portal designed to make exploring
            employment and internship opportunities more convenient.
          </p>
          <p className={paragraphClass}>
            Job details and application links may change. Always verify
            important information on the employer’s official website.
          </p>
        </ContentCard>

        <ContentCard
          icon={UserCheck}
          title="Your career, your decision"
        >
          <p className={paragraphClass}>
            Compare job descriptions, eligibility criteria, skills and employer
            information to find opportunities suited to your interests.
          </p>
          <p className={paragraphClass}>
            TechAbhi does not make hiring decisions and cannot guarantee
            interviews, selection or employment.
          </p>
        </ContentCard>
      </div>

      <ContentCard icon={HeartHandshake} title="Our approach">
        <p className={paragraphClass}>
          Our goal is to make job discovery easier by presenting opportunities
          in a clear and accessible way.
        </p>
        <p className={paragraphClass}>
          We encourage candidates to verify vacancies and employers before
          sharing personal documents, financial details or other sensitive
          information.
        </p>
      </ContentCard>

      <BottomCTA />
    </PageLayout>
  );
}

export function Contact() {
  const [site, setSite] = useState(null);
  useEffect(() => { api('/site').then(setSite).catch(() => {}); }, []);
  const c = site?.contact || {};
  const CONTACT = c.email || CONTACT_EMAIL;
  return (
    <PageLayout pageKey="contact">
      <div className="grid items-start gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <ContentCard icon={MessageCircle} title="How can we help?">
            <p className={paragraphClass}>
              Contact us with questions about the website, incorrect job
              information, broken application links, feedback or listing
              removal requests.
            </p>
            <p className={paragraphClass}>
              To help us understand the issue, include the job title, listing
              URL and a short description. Please do not send passwords or
              unnecessary sensitive information.
            </p>
          </ContentCard>

          {(c.phone || c.address || c.hours || c.security_email) && (
            <ContentCard icon={MessageCircle} title="Contact details">
              <ul className="space-y-2 text-[15px] text-slate-700">
                {c.email && <li>Email: <a className="font-semibold text-indigo-700 underline" href={`mailto:${c.email}`}>{c.email}</a></li>}
                {c.phone && <li>Phone: <a className="font-semibold text-indigo-700 underline" href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}>{c.phone}</a></li>}
                {c.hours && <li>Support hours: {c.hours}</li>}
                {c.address && <li>Address: {c.address}</li>}
                {c.security_email && <li>Security or abuse reports: <a className="font-semibold text-indigo-700 underline" href={`mailto:${c.security_email}`}>{c.security_email}</a></li>}
              </ul>
            </ContentCard>
          )}

          <ContentCard icon={MapPin} title="Report a job listing issue">
            <p className={paragraphClass}>
              If a vacancy appears outdated, a link is broken or job details
              seem incorrect, send us the relevant listing information.
            </p>

            <a
              href={`mailto:${CONTACT}?subject=${encodeURIComponent('TechAbhi Job Listing Report')}`}
              className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900"
            >
              Report a listing
              <ArrowRight size={15} />
            </a>
          </ContentCard>

          <ContentCard icon={CheckCircle2} title="What to include">
            <ul className="space-y-2.5">
              {[
                'Job title or company name',
                'Link to the relevant page',
                'A short description of the issue',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-6 text-slate-600"
                >
                  <Check size={16} className="mt-1 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </ContentCard>
        </div>

        <ContactCard />
      </div>
    </PageLayout>
  );
}

export function Privacy() {
  return (
    <PageLayout pageKey="privacy">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <h2 className="text-sm font-bold text-amber-950">
              Important privacy information
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900/80">
              This page describes general privacy practices. Before publishing,
              confirm that it accurately reflects the data your live website
              actually collects and processes.
            </p>
          </div>
        </div>
      </div>

      <ContentCard icon={Globe2} title="1. Browsing the website">
        <p className={paragraphClass}>
          Some job listings may be available without an account. Features that
          require an account may ask you to submit information such as contact
          details or application information.
        </p>
        <p className={paragraphClass}>
          The information collected depends on the features enabled on the
          live website and how those features are configured.
        </p>
      </ContentCard>

      <ContentCard
        icon={BriefcaseBusiness}
        title="2. Applications and usage data"
      >
        <p className={paragraphClass}>
          Information submitted through account or application features may be
          processed to provide those services. If analytics are enabled, the
          website may also record interactions such as job views or application
          link clicks.
        </p>
        <p className={paragraphClass}>
          The actual data collected, its purpose, retention period and any
          third-party service providers must be confirmed against the production
          backend and website configuration.
        </p>
      </ContentCard>

      <ContentCard icon={ShieldCheck} title="3. Account security">
        <p className={paragraphClass}>
          Use a strong, unique password and keep your sign-in credentials
          private. Never share your password or one-time verification codes
          with anyone.
        </p>
        <p className={paragraphClass}>
          The website’s actual security measures should be documented based on
          the implementation used by the deployed service.
        </p>
      </ContentCard>

      <ContentCard icon={UserCheck} title="4. Your choices and requests">
        <p className={paragraphClass}>
          For questions about personal information or requests concerning your
          data, contact us using the email address on the Contact page.
        </p>
        <p className={paragraphClass}>
          Available options may depend on the information held and the
          applicable legal requirements. Requests should be handled through an
          appropriate, verified process.
        </p>
      </ContentCard>

      <ContentCard icon={FileText} title="5. Cookies, services and updates">
        <p className={paragraphClass}>
          Cookies, browser storage, analytics tools, hosting providers and other
          third-party services should be disclosed when they are used and where
          disclosure is required.
        </p>
        <p className={paragraphClass}>
          Review this policy whenever data collection or website features
          change. This general template is not legal advice and should be
          checked against applicable privacy laws before publication.
        </p>
      </ContentCard>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Mail size={19} className="mt-0.5 shrink-0 text-indigo-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Privacy questions?
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Contact us if you have a question or request concerning your
              personal information.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('TechAbhi Privacy Enquiry')}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700 hover:text-indigo-900"
            >
              Email TechAbhi
              <ChevronRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export function Terms() {
  return (
    <PageLayout pageKey="terms">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <FileText size={20} className="mt-0.5 shrink-0 text-indigo-700" />
          <div>
            <h2 className="text-sm font-bold text-indigo-950">
              Please read before using the website
            </h2>
            <p className="mt-1 text-sm leading-6 text-indigo-900/80">
              These terms explain general expectations for using TechAbhi.
              Adapt them to your actual service and review them before
              publication.
            </p>
          </div>
        </div>
      </div>

      <ContentCard
        icon={BriefcaseBusiness}
        title="1. Job listing information"
      >
        <p className={paragraphClass}>
          Job listings are provided for informational and discovery purposes.
          Availability, eligibility, compensation, location and other details
          may change or be updated by the employer.
        </p>
        <p className={paragraphClass}>
          Verify important details on the employer’s official website before
          applying. A listing on TechAbhi does not guarantee that the vacancy
          remains open.
        </p>
      </ContentCard>

      <ContentCard icon={ShieldCheck} title="2. Stay safe while applying">
        <p className={paragraphClass}>
          Be cautious of requests for money to secure a job or interview,
          suspicious links, impersonation and requests for sensitive information
          from unverified sources.
        </p>
        <p className={paragraphClass}>
          Verify the employer and application destination independently.
          TechAbhi is not the hiring employer unless a listing explicitly states
          otherwise, and TechAbhi does not make hiring decisions.
        </p>
      </ContentCard>

      <ContentCard icon={UserCheck} title="3. Your responsibilities">
        <p className={paragraphClass}>
          Use the website lawfully and provide accurate information wherever
          required. Evaluate opportunities independently before sharing
          personal information with employers or other third parties.
        </p>
        <p className={paragraphClass}>
          Do not misuse the website or attempt to disrupt its normal operation.
          Any additional restrictions should reflect the actual features and
          rules of the service.
        </p>
      </ContentCard>

      <ContentCard icon={Globe2} title="4. External websites and applications">
        <p className={paragraphClass}>
          Job links may direct you to employer websites or other third-party
          services. Those websites may have their own terms, privacy practices
          and application processes.
        </p>
        <p className={paragraphClass}>
          Check the destination and review its terms before submitting an
          application. TechAbhi does not control external websites merely
          because a link is provided.
        </p>
      </ContentCard>

      <ContentCard icon={FileText} title="5. Service limitations and updates">
        <p className={paragraphClass}>
          We aim to make job discovery convenient, but cannot guarantee that
          every listing is current, complete, accurate or suitable for every
          visitor.
        </p>
        <p className={paragraphClass}>
          These terms may need to be updated as the website evolves. Review
          this page periodically and obtain appropriate legal review before
          relying on it as a final legal document.
        </p>
      </ContentCard>

      <BottomCTA />
    </PageLayout>
  );
}
