import { useEffect, useRef, useState } from 'react';
import { CalendarClock, Clock, MapPin, Navigation, FileCheck2, ListOrdered, ExternalLink, Globe2, Languages, ShieldAlert, Flag, X, Info, Building } from 'lucide-react';
import { api, track } from '../lib/api';
import { fmtDrive, fmtTime, driveState, DRIVE_LABEL, directionsUrl, REGION_LABEL, safeHttp } from '../lib/format';
import TrustBadge from './TrustBadge';
import ShareButton from './ShareButton';

const Row = ({ icon: Icon, label, children }) => children ? (
  <div className="min-w-0">
    <dt className="flex items-center gap-2 text-sm text-slate-600"><Icon size={17} className="shrink-0 text-slate-500" aria-hidden="true" />{label}</dt>
    <dd className="mt-1 break-words pl-[1.6rem] text-[15px] font-semibold text-slate-900">{children}</dd>
  </div>
) : null;

/** Walk-in drive: everything a candidate needs on the day. */
export function DriveDetails({ job }) {
  if (job.job_kind !== 'walk_in' || !job.drive_date) return null;
  const st = driveState(job); const maps = directionsUrl(job);
  const range = job.drive_end_date && job.drive_end_date !== job.drive_date ? `${fmtDrive(job.drive_date)} to ${fmtDrive(job.drive_end_date)}` : fmtDrive(job.drive_date);
  const apply = safeHttp(job.application_url) ? job.application_url : null;
  return (
    <section aria-labelledby="drive-h" className="mb-6 overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-rose-600 px-5 py-3.5 text-white">
        <h2 id="drive-h" className="flex items-center gap-2 text-lg font-bold"><CalendarClock size={20} aria-hidden="true" />Walk-in drive details</h2>
        {st && <span className={`rounded-full px-3 py-1 text-sm font-bold ${st === 'expired' ? 'bg-slate-200 text-slate-700' : 'bg-white text-rose-700'}`}>{DRIVE_LABEL[st]}</span>}
      </div>
      <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <Row icon={CalendarClock} label="Interview date">{range}</Row>
        <Row icon={Clock} label="Reporting time">{fmtTime(job.reporting_time)}</Row>
        <Row icon={Clock} label="Interview time">{fmtTime(job.interview_time)}</Row>
        <Row icon={Building} label="Venue">{job.venue}</Row>
        <Row icon={MapPin} label="Venue address">{job.venue_address}</Row>
        <Row icon={FileCheck2} label="Documents to carry">{job.documents_required?.length ? <ul className="mt-1 list-inside list-disc space-y-0.5 font-medium">{job.documents_required.map((d) => <li key={d}>{d}</li>)}</ul> : null}</Row>
        <Row icon={ListOrdered} label="Interview process">{job.interview_process?.length ? <ol className="mt-1 list-inside list-decimal space-y-0.5 font-medium">{job.interview_process.map((d) => <li key={d}>{d}</li>)}</ol> : null}</Row>
      </dl>
      <div className="flex flex-wrap gap-2.5 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
        {maps && <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700"><Navigation size={16} aria-hidden="true" />Get directions<span className="sr-only"> (opens Google Maps)</span></a>}
        {apply && <a href={apply} target="_blank" rel="noopener noreferrer nofollow" onClick={() => track(job.id, 'apply_click')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-100"><ExternalLink size={16} aria-hidden="true" />Official registration link</a>}
        <ShareButton job={job} />
      </div>
    </section>
  );
}

/** Remote job: where it is, who it hires, and whether a permit is needed. Never shows a city for a remote role. */
export function RemoteDetails({ job }) {
  if (job.work_mode !== 'remote') return null;
  const region = job.remote_region ? (job.remote_region === 'other' && job.remote_country ? job.remote_country : REGION_LABEL[job.remote_region]) : null;
  return (
    <section aria-labelledby="remote-h" className="mb-6 rounded-2xl border border-teal-200 bg-teal-50/60 p-5 sm:p-6">
      <h2 id="remote-h" className="flex items-center gap-2 text-lg font-bold text-teal-950"><Globe2 size={20} aria-hidden="true" />Remote work details</h2>
      <dl className="mt-4 grid gap-5 sm:grid-cols-2">
        <Row icon={MapPin} label="Work location">Remote</Row>
        <Row icon={Globe2} label="Hiring region">{region || 'Not specified by the employer'}</Row>
        <Row icon={Languages} label="Country eligibility">{job.remote_region === 'worldwide' ? (job.work_authorization_required ? 'Open worldwide, but you must have the legal right to work in your country' : 'Open to applicants worldwide') : job.remote_region === 'india' ? 'Applicants based in India' : region ? `Applicants who can legally work in ${region}` : null}</Row>
        <Row icon={Clock} label="Time zone">{job.timezone_requirement}</Row>
        {job.work_authorization_required && <Row icon={ShieldAlert} label="Work authorization">Required. Check you are eligible before applying.</Row>}
      </dl>
    </section>
  );
}

const REASONS = [['fake_or_scam', 'Looks fake or like a scam'], ['asks_for_money', 'Asks candidates for money'], ['expired', 'Already closed or expired'], ['duplicate', 'Duplicate of another listing'], ['wrong_details', 'Details are wrong'], ['other', 'Something else']];
function ReportDialog({ job, onClose }) {
  const [reason, setReason] = useState('fake_or_scam'); const [details, setDetails] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [done, setDone] = useState(false);
  const first = useRef(null);
  useEffect(() => { first.current?.focus(); const k = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('');
    try { await api(`/jobs/${job.id}/report`, { method: 'POST', body: { reason, details } }); setDone(true); }
    catch (err) { setMsg(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="rep-h" className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-lift sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3"><h2 id="rep-h" className="text-xl font-bold text-slate-900">Report this opportunity</h2><button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
        {done ? (
          <div role="status" className="mt-4"><p className="text-[15px] text-slate-700">Thank you. Our team will review this listing. Several independent reports flag a job as “Reported opportunity” for other candidates.</p><button type="button" onClick={onClose} className="mt-5 min-h-11 rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white">Close</button></div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div><label htmlFor="rep-reason" className="mb-1.5 block text-sm font-semibold text-slate-800">What is wrong?</label>
              <select ref={first} id="rep-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label htmlFor="rep-d" className="mb-1.5 block text-sm font-semibold text-slate-800">Details (optional)</label>
              <textarea id="rep-d" rows={4} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15" placeholder="Do not include passwords or payment details." /></div>
            {msg && <p role="alert" className="text-sm text-rose-700">{msg}</p>}
            <div className="flex gap-3"><button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-xl border border-slate-300 text-sm font-bold text-slate-800">Cancel</button><button type="submit" disabled={busy} className="min-h-12 flex-[2] rounded-xl bg-rose-700 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Send report'}</button></div>
          </form>
        )}
      </div>
    </div>
  );
}

const EXPLAIN = {
  verified: 'A TechAbhi admin checked this listing against an official source.',
  recruiter_submitted: 'Posted by a recruiter whose account TechAbhi reviewed. The listing itself has not been separately verified.',
  awaiting: 'TechAbhi has not verified this listing yet. Check the employer’s official website before you apply.',
  reported: 'Several people reported a problem with this listing. Be careful and verify it independently.',
};
/** Where this listing came from, how much to trust it, official links, and a way to report it. */
export function TrustPanel({ job }) {
  const [reporting, setReporting] = useState(false);
  const official = safeHttp(job.source_url) ? job.source_url : null; const site = safeHttp(job.company_website) ? job.company_website : null;
  return (
    <section aria-labelledby="trust-h" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <h2 id="trust-h" className="text-lg font-bold text-slate-900">Verification and safety</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3"><TrustBadge status={job.verification_status} /><p className="text-[15px] text-slate-700">{EXPLAIN[job.verification_status]}</p></div>
      <ul className="mt-4 space-y-1.5 text-[15px] text-slate-700">
        {job.published_at && <li>Published: {new Date(job.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</li>}
        {job.expires_at && <li>Application deadline: {new Date(job.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</li>}
        {official && <li><a href={official} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-indigo-700 underline">Official source <ExternalLink size={14} aria-hidden="true" /></a></li>}
        {site && <li><a href={site} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-indigo-700 underline">Company website <ExternalLink size={14} aria-hidden="true" /></a></li>}
      </ul>
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" />Genuine employers never ask candidates to pay a fee to apply, attend an interview or receive an offer.</p>
      <button type="button" onClick={() => setReporting(true)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-sm font-bold text-rose-800 hover:bg-rose-50"><Flag size={16} aria-hidden="true" />Report this job</button>
      {reporting && <ReportDialog job={job} onClose={() => setReporting(false)} />}
    </section>
  );
}
