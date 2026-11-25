
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileText,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  Target,
  Trash2,
  Upload,
  WandSparkles,
} from 'lucide-react';

import { api, apiFetch } from '../../lib/api';
import { inputCls, fmtDate } from '../../lib/format';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function Panel({ children, className = '', id }) {
  return (
    <section
      id={id}
      className={cx(
        'scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6',
        className
      )}
    >
      {children}
    </section>
  );
}

function Heading({ icon: Icon, title, description, badge }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
        <Icon size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h2>
          {badge && (
            <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-extrabold uppercase tracking-wider text-indigo-700">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function Notice({ type = 'error', children, onClose }) {
  const success = type === 'success';

  return (
    <div
      role={success ? 'status' : 'alert'}
      className={cx(
        'flex items-start gap-3 rounded-xl border p-3.5 text-sm',
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800'
      )}
    >
      {success ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1 leading-6">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-md px-1.5 py-1 text-xs font-bold opacity-70 hover:opacity-100"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

function BulletGroup({ title, items, tone = 'slate', icon: Icon }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const tones = {
    emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-900',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-900',
    indigo: 'border-indigo-100 bg-indigo-50/70 text-indigo-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    violet: 'border-violet-100 bg-violet-50/70 text-violet-900',
  };

  return (
    <section className={cx('rounded-xl border p-4', tones[tone] || tones.slate)}>
      <h3 className="flex items-center gap-2 text-xs font-extrabold sm:text-sm">
        {Icon && <Icon size={16} />}
        <span className="min-w-0 flex-1">{title}</span>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">
          {items.length}
        </span>
      </h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-start gap-2 text-xs leading-5 sm:text-sm sm:leading-6"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoadingResume() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading resume">
      <div className="h-40 animate-pulse rounded-2xl bg-slate-200 sm:h-44" />
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="h-5 w-44 animate-pulse rounded bg-slate-100" />
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ))}
      <span className="sr-only">Loading your resume…</span>
    </div>
  );
}

export default function CandidateResumePage() {
  const [searchParams] = useSearchParams();

  const [resume, setResume] = useState(null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState([]);
  const [jobId, setJobId] = useState(searchParams.get('job') || '');
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const loadResume = useCallback(async () => {
    const data = await api('/candidate/resume', { candidate: true });
    setResume(data);
    setText(data.text || '');
    return data;
  }, []);

  const loadSavedJobs = useCallback(async () => {
    const data = await api('/candidate/saved', { candidate: true });
    setSaved((data.jobs || []).filter((job) => job.available));
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const data = await api('/candidate/resume', { candidate: true });
        if (active) {
          setResume(data);
          setText(data.text || '');
        }
      } catch (error) {
        if (active) {
          setErr(error.message || 'Unable to load your resume.');
        }
      }

      try {
        const data = await api('/candidate/saved', { candidate: true });
        if (active) {
          setSaved((data.jobs || []).filter((job) => job.available));
        }
      } catch {
        if (active) setSaved([]);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const run = async (operation, successMessage) => {
    if (busy) return;

    setBusy(true);
    setErr('');
    setMsg('');

    try {
      await operation();
      await loadResume();
      setMsg(successMessage);
    } catch (error) {
      setErr(error.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (file) => {
    if (!file || busy) return;

    setErr('');
    setMsg('');

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setErr('Please select a PDF file.');
      return;
    }

    if (file.size === 0) {
      setErr('The selected file is empty. Please choose another PDF.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErr('PDF must be under 2 MB.');
      return;
    }

    run(
      () =>
        api(
          '/candidate/resume/upload?name=' + encodeURIComponent(file.name),
          {
            method: 'POST',
            file,
            candidate: true,
          }
        ),
      'Your resume was uploaded successfully.'
    );
  };

  const handleFileInput = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    handleFile(file);
  };

  const saveText = () => {
    if (text.trim().length < 50) {
      setErr('Please enter at least 50 characters of resume text.');
      return;
    }

    run(
      () =>
        api('/candidate/resume/text', {
          method: 'POST',
          body: { text: text.trim() },
          candidate: true,
        }),
      'Resume text saved successfully.'
    );
  };

  const deleteResume = async () => {
    if (busy) return;

    const confirmed = window.confirm(
      'Delete your resume file and saved text? This cannot be undone.'
    );
    if (!confirmed) return;

    setBusy(true);
    setErr('');
    setMsg('');

    try {
      await api('/candidate/resume', {
        method: 'DELETE',
        candidate: true,
      });

      setResume({ has: false, has_file: false, text: '' });
      setText('');
      setResult(null);

      try {
        const data = await loadResume();
        setResume(data);
        setText(data.text || '');
      } catch {
        // Keep the confirmed deletion state if refresh fails.
      }

      setMsg('Resume deleted successfully.');
    } catch (error) {
      setErr(error.message || 'Unable to delete your resume.');
    } finally {
      setBusy(false);
    }
  };

  const downloadResume = async () => {
    if (downloading) return;

    setDownloading(true);
    setErr('');
    setMsg('');

    let objectUrl;

    try {
      const response = await apiFetch('/api/candidate/resume/download', { role: 'candidate' });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Resume file not found.');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Please sign in again to download your resume.');
        }
        throw new Error('Download failed. Please try again.');
      }

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = resume?.file_name || 'resume.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setMsg('Your resume download has started.');

      const urlToRevoke = objectUrl;
      objectUrl = null;
      window.setTimeout(() => URL.revokeObjectURL(urlToRevoke), 1000);
    } catch (error) {
      setErr(error.message || 'Unable to download your resume.');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setDownloading(false);
    }
  };

  const analyzeResume = async () => {
    if (analyzing) return;

    setAnalyzing(true);
    setErr('');
    setMsg('');
    setResult(null);

    try {
      const data = await api('/candidate/resume/analyze', {
        method: 'POST',
        body: { job_id: jobId || undefined },
        candidate: true,
      });
      setResult(data);
    } catch (error) {
      setErr(error.message || 'Unable to analyze your resume.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!resume) {
    return err ? (
      <div className="rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
          <AlertCircle size={25} />
        </span>
        <h2 className="mt-4 text-lg font-extrabold text-slate-900">
          Couldn’t load your resume
        </h2>
        <p className="mt-2 text-sm leading-6 text-rose-700">{err}</p>
        <button
          type="button"
          onClick={() => {
            setErr('');
            setResume(null);
            setLoadAttempt((attempt) => attempt + 1);
          }}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          Try again
        </button>
      </div>
    ) : (
      <LoadingResume />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-6 sm:space-y-6">
      {/* Header */}
      <section className="relative isolate overflow-hidden rounded-2xl bg-[#111735] p-5 shadow-sm sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:32px_32px]" />
        </div>

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-indigo-100 sm:h-14 sm:w-14">
              <FileText size={25} />
            </span>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.15em] text-indigo-200">
                <Sparkles size={12} />
                Candidate workspace
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Resume workspace
              </h1>
              <p className="mt-2 max-w-xl text-xs leading-6 text-slate-300 sm:text-sm">
                Manage your resume, save its text and review insights for your
                next application.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-xs font-semibold text-indigo-100 sm:self-center">
            <LockKeyhole size={15} />
            Private workspace
          </div>
        </div>
      </section>

      {/* Section navigation */}
      <nav
        aria-label="Resume sections"
        className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm"
      >
        {[
          ['#current-resume', 'Current resume', FileCheck2],
          ['#upload-resume', 'Upload PDF', Upload],
          ['#resume-text', 'Resume text', FileText],
          ['#resume-analysis', 'Resume insights', BrainCircuit],
        ].map(([href, label, Icon]) => (
          <a
            key={href}
            href={href}
            className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-bold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Icon size={14} />
            {label}
          </a>
        ))}
      </nav>

      {/* Alerts */}
      {err && (
        <Notice type="error" onClose={() => setErr('')}>
          <p className="font-bold">Something needs your attention</p>
          <p className="mt-1">{err}</p>
        </Notice>
      )}

      {msg && (
        <Notice type="success" onClose={() => setMsg('')}>
          <p className="font-bold">{msg}</p>
        </Notice>
      )}

      {/* Existing resume */}
      <Panel id="current-resume">
        <Heading
          icon={FileCheck2}
          title="Your current resume"
          description="Check the saved file and manage your resume."
          badge={resume.has ? 'Available' : 'Not uploaded'}
        />

        {resume.has ? (
          <div className="flex flex-col gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
              <FileCheck2 size={22} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-extrabold text-slate-900">
                {resume.file_name || 'Resume text'}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Saved
                </span>
                {resume.uploaded_at && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={13} />
                    Updated {fmtDate(resume.uploaded_at)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {resume.has_file && (
                <button
                  type="button"
                  onClick={downloadResume}
                  disabled={downloading || busy}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-60"
                >
                  {downloading ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <ArrowDownToLine size={15} />
                  )}
                  {downloading ? 'Preparing…' : 'Download PDF'}
                </button>
              )}

              <button
                type="button"
                onClick={deleteResume}
                disabled={busy}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
              >
                {busy ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
              <FileText size={24} />
            </span>
            <h3 className="mt-3 text-sm font-extrabold text-slate-900">
              Your resume starts here
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500 sm:text-sm">
              Upload a PDF or paste your resume text below to get started.
            </p>
            <a
              href="#upload-resume"
              className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold text-indigo-600 hover:bg-indigo-50"
            >
              Upload your resume <ArrowRight size={14} />
            </a>
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500 sm:text-xs">
          <LockKeyhole size={13} className="mt-0.5 shrink-0" />
          Your resume access depends on your account permissions and backend
          storage configuration.
        </p>
      </Panel>

      {/* PDF upload */}
      <Panel id="upload-resume">
        <Heading
          icon={Upload}
          title="Upload your resume"
          description="Choose a PDF file from your device. Maximum size: 2 MB."
        />

        <label
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!busy) handleFile(event.dataTransfer.files?.[0]);
          }}
          className={cx(
            'group flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition sm:py-10',
            dragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-indigo-50/40',
            busy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          )}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200 transition group-hover:scale-105">
            <Upload size={26} />
          </span>
          <h3 className="mt-4 text-sm font-extrabold text-slate-900 sm:text-base">
            {dragging ? 'Drop your PDF here' : 'Choose a resume PDF'}
          </h3>
          <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500 sm:text-sm">
            Drag and drop your file here, or browse files on your device.
          </p>
          <span className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition group-hover:bg-indigo-700 sm:text-sm">
            <Upload size={15} />
            Browse files
          </span>
          <span className="mt-3 text-xs text-slate-500">
            PDF format · Maximum 2 MB
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={busy}
            onChange={handleFileInput}
          />
        </label>

        {busy && (
          <p className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-700">
            <LoaderCircle size={15} className="animate-spin" />
            Processing your request…
          </p>
        )}
      </Panel>

      {/* Resume text editor */}
      <Panel id="resume-text">
        <Heading
          icon={FileText}
          title="Resume text"
          description="Paste the text from your resume. This content is used for resume analysis."
        />

        <label
          htmlFor="resume-text-content"
          className="mb-2 block text-xs font-bold text-slate-700 sm:text-sm"
        >
          Resume content
        </label>

        <textarea
          id="resume-text-content"
          className="min-h-60 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 sm:min-h-64 sm:px-4 sm:py-4 sm:leading-7"
          rows={10}
          value={text}
          disabled={busy}
          onChange={(event) => {
            setText(event.target.value);
            setMsg('');
          }}
          placeholder={'Paste your resume text here…\n\nInclude your summary, skills, education, experience and projects.'}
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            {text.length.toLocaleString('en-IN')} characters · Minimum 50 to save
          </p>
          <button
            type="button"
            onClick={saveText}
            disabled={busy || text.trim().length < 50}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {busy ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <FileCheck2 size={16} />
            )}
            Save resume text
          </button>
        </div>
      </Panel>

      {/* Resume analysis */}
      {resume.has && (
        <Panel id="resume-analysis">
          <Heading
            icon={BrainCircuit}
            title="Resume insights"
            description="Compare your resume with a saved job or request general suggestions."
            badge="Analysis"
          />

          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/80 p-4 sm:p-5">
            <label
              htmlFor="analysis-job"
              className="mb-2 block text-xs font-bold text-slate-700 sm:text-sm"
            >
              Choose a job to compare with
            </label>

            <div className="relative">
              <select
                id="analysis-job"
                className={cx(
                  inputCls,
                  'h-11 appearance-none rounded-xl border-slate-200 bg-white pr-10 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10'
                )}
                value={jobId}
                disabled={analyzing}
                onChange={(event) => {
                  setJobId(event.target.value);
                  setResult(null);
                }}
              >
                <option value="">General suggestions (no specific job)</option>

                {jobId &&
                  !saved.some((job) => String(job.id) === jobId) && (
                    <option value={jobId}>Job #{jobId}</option>
                  )}

                {saved.map((job) => (
                  <option key={job.id} value={String(job.id)}>
                    {job.title}
                    {job.company ? ` — ${job.company}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500 sm:text-xs">
              Select a saved job to compare skills, or request general resume
              suggestions.
            </p>

            <button
              type="button"
              onClick={analyzeResume}
              disabled={analyzing}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {analyzing ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <WandSparkles size={17} />
              )}
              {analyzing ? 'Analyzing resume…' : 'Analyze my resume'}
              {!analyzing && <ArrowRight size={15} />}
            </button>
          </div>

          {analyzing && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
              <LoaderCircle
                size={24}
                className="mx-auto animate-spin text-indigo-600"
              />
              <p className="mt-3 text-sm font-bold text-slate-700">
                Analyzing your resume
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Please wait while your results are prepared.
              </p>
            </div>
          )}

          {result && (
            <div className="mt-5 space-y-4">
              {result.job && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Target size={19} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Compared with
                    </p>
                    <h3 className="mt-1 break-words text-sm font-extrabold text-slate-900">
                      {result.job.title}
                    </h3>
                    {result.job.company && (
                      <p className="mt-1 text-xs text-slate-500">
                        {result.job.company}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {result.note && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600 sm:text-sm">
                  {result.note}
                </p>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <BulletGroup
                  title="Skills found in your resume"
                  items={result.matching_skills}
                  tone="emerald"
                  icon={CheckCircle2}
                />
                <BulletGroup
                  title="Skills missing from your resume"
                  items={result.missing_skills}
                  tone="amber"
                  icon={Lightbulb}
                />
              </div>

              {result.ai && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <Sparkles size={17} className="text-indigo-600" />
                    AI suggestions
                  </h3>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <BulletGroup
                      title="Resume improvements"
                      items={result.ai.improvement_suggestions}
                      tone="indigo"
                      icon={FileText}
                    />
                    <BulletGroup
                      title="Project ideas"
                      items={result.ai.project_ideas}
                      tone="violet"
                      icon={BrainCircuit}
                    />
                    <BulletGroup
                      title="Interview preparation"
                      items={result.ai.interview_tips}
                      tone="slate"
                      icon={Lightbulb}
                    />
                    <BulletGroup
                      title="Claims needing evidence"
                      items={result.ai.unverifiable}
                      tone="amber"
                      icon={CircleHelp}
                    />
                  </div>
                </div>
              )}

              {result.ai_error && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 sm:text-sm">
                  <p className="font-bold">AI suggestions unavailable</p>
                  <p className="mt-1 leading-6">{result.ai_error}</p>
                </div>
              )}

              {result.disclaimer && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-500 sm:text-xs">
                  {result.disclaimer}
                </p>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* Footer CTA */}
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
            <Sparkles size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-slate-900">
              Make your next application count
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
              Keep your resume current and explore opportunities that fit your
              skills.
            </p>
            <Link
              to="/jobs"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 transition hover:text-indigo-800 sm:text-sm"
            >
              Explore jobs <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
