import { useEffect, useState } from 'react';
import { MapPin, Globe2, CalendarClock, ImageUp, Trash2, Info } from 'lucide-react';
import { api } from '../../lib/api';

const input = 'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15';
const area = 'w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15';
const REGIONS = [['india', 'India'], ['worldwide', 'Worldwide'], ['usa', 'USA'], ['uk', 'UK'], ['germany', 'Germany'], ['canada', 'Canada'], ['australia', 'Australia'], ['europe', 'Europe'], ['other', 'Other country']];
const CATS = ['Software Development', 'Data & Analytics', 'IT Support & Networking', 'Design', 'Banking & Finance', 'Sales & Marketing', 'Operations', 'Customer Support', 'Human Resources', 'Engineering', 'Manufacturing', 'Healthcare', 'Education', 'Content & Writing', 'Other'];

function F({ id, label, hint, wide, children }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</label>{children}{hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}</div>;
}
function Card({ icon: Icon, title, text, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Icon size={19} className="text-indigo-700" aria-hidden="true" />{title}</h2>
      {text && <p className="mt-1 text-sm text-slate-600">{text}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Structured location / remote / walk-in / verification fields + company logo. State lives in the parent form. */
export default function JobFormExtras({ form, set, id, prefix, auth, states }) {
  const walkIn = form.job_kind === 'walk_in'; const remote = form.work_mode === 'remote';
  const [logo, setLogo] = useState(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (id) api(`${prefix}/jobs/${id}`, { ...auth }).then((d) => setLogo(d.job?.logo_url || null)).catch(() => {}); }, [id, prefix]); // eslint-disable-line react-hooks/exhaustive-deps
  const bind = (k) => ({ id: `jf-${k}`, value: form[k] ?? '', onChange: set(k) });

  const upload = async (file) => {
    if (!file) return; setMsg('');
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setMsg('Choose a PNG, JPEG or WebP image (SVG is not allowed).'); return; }
    if (file.size > 512 * 1024) { setMsg('The logo must be 512 KB or smaller.'); return; }
    setBusy(true);
    try { const d = await api(`${prefix}/jobs/${id}/logo`, { method: 'POST', file, ...auth }); setLogo(`${d.job.logo_url}?v=${Date.now()}`); setMsg('Logo uploaded.'); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };
  const removeLogo = async () => { setBusy(true); try { await api(`${prefix}/jobs/${id}/logo`, { method: 'DELETE', ...auth }); setLogo(null); setMsg('Logo removed.'); } catch (e) { setMsg(e.message); } finally { setBusy(false); } };

  return (
    <div className="space-y-5">
      <Card icon={MapPin} title="Type, place and classification" text="Office and hybrid jobs need the real office city. “Remote” is a work mode, never a city.">
        <F id="jf-job_kind" label="Listing type"><select {...bind('job_kind')} className={input}><option value="standard">Regular job or internship</option><option value="walk_in">Walk-in drive</option></select></F>
        <F id="jf-sector" label="IT / Non-IT"><select {...bind('sector')} className={input}><option value="">Not specified</option><option value="it">IT</option><option value="semi_it">Semi-IT</option><option value="non_it">Non-IT</option></select></F>
        <F id="jf-employer_type" label="Employer type" hint="Government jobs stay hidden until an admin verifies them against an official notice."><select {...bind('employer_type')} className={input}><option value="">Not specified</option><option value="private">Private</option><option value="mnc">MNC</option><option value="startup">Startup</option><option value="government">Government</option><option value="other">Other</option></select></F>
        <F id="jf-category-x" label="Category"><select id="jf-category-x" value={form.category} onChange={set('category')} className={input}><option value="">Not specified</option>{CATS.map((c) => <option key={c}>{c}</option>)}{form.category && !CATS.includes(form.category) && <option>{form.category}</option>}</select></F>
        {!remote && <>
          <F id="jf-state" label="State / UT"><select {...bind('state')} className={input}><option value="">Select state</option>{states.map((s) => <option key={s} value={s}>{s}</option>)}</select></F>
          <F id="jf-city" label="Office city"><input {...bind('city')} className={input} placeholder="e.g. Ahmedabad" autoComplete="off" /></F>
          <F id="jf-address" label="Complete office address" wide><input {...bind('address')} className={input} placeholder="Building, street, area, PIN" /></F>
        </>}
        <F id="jf-experience_min_years" label="Minimum experience (years)" hint="0 means freshers can apply."><input {...bind('experience_min_years')} type="number" min="0" max="60" className={input} /></F>
        <F id="jf-experience_max_years" label="Maximum experience (years)"><input {...bind('experience_max_years')} type="number" min="0" max="60" className={input} /></F>
        <F id="jf-fresher_eligible" label="Freshers can apply"><select {...bind('fresher_eligible')} className={input}><option value="">Not stated</option><option value="1">Yes</option><option value="0">No</option></select></F>
        <F id="jf-salary_currency" label="Salary currency"><input {...bind('salary_currency')} className={input} maxLength={3} placeholder="INR" /></F>
        <F id="jf-salary_period" label="Salary period"><select {...bind('salary_period')} className={input}><option value="year">Per year</option><option value="month">Per month</option><option value="hour">Per hour</option></select></F>
        <F id="jf-company_website" label="Official company website"><input {...bind('company_website')} type="url" className={input} placeholder="https://" /></F>
        <F id="jf-source_url" label="Official source URL" wide hint="The employer’s careers page or notice. Required before an admin can verify a listing or publish a government job."><input {...bind('source_url')} type="url" className={input} placeholder="https://" /></F>
      </Card>

      {remote && (
        <Card icon={Globe2} title="Remote eligibility" text="Tell candidates who may apply. Do not mark hybrid or office jobs as remote.">
          <F id="jf-remote_region" label="Hiring region (required to publish)"><select {...bind('remote_region')} className={input}><option value="">Select region</option>{REGIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></F>
          {form.remote_region === 'other' && <F id="jf-remote_country" label="Country"><input {...bind('remote_country')} className={input} /></F>}
          <F id="jf-timezone_requirement" label="Time-zone requirement"><input {...bind('timezone_requirement')} className={input} placeholder="e.g. Overlap with EST 9am–1pm" /></F>
          <F id="jf-work_authorization_required" label="Work authorization needed"><select {...bind('work_authorization_required')} className={input}><option value="0">No, anyone in the region can apply</option><option value="1">Yes, legal right to work required</option></select></F>
        </Card>
      )}

      {walkIn && (
        <Card icon={CalendarClock} title="Walk-in drive details" text="Dates are Indian local dates. The drive disappears from the site automatically after its last day.">
          <F id="jf-drive_date" label="Drive date (required)"><input {...bind('drive_date')} type="date" className={input} /></F>
          <F id="jf-drive_end_date" label="Last day (multi-day drives)"><input {...bind('drive_end_date')} type="date" className={input} /></F>
          <F id="jf-reporting_time" label="Reporting time (required)"><input {...bind('reporting_time')} type="time" className={input} /></F>
          <F id="jf-interview_time" label="Interview time"><input {...bind('interview_time')} type="time" className={input} /></F>
          <F id="jf-venue" label="Venue name"><input {...bind('venue')} className={input} placeholder="e.g. Zeta Tower, 4th floor" /></F>
          <F id="jf-venue_address" label="Venue address (required)"><input {...bind('venue_address')} className={input} /></F>
          <F id="jf-maps_url" label="Google Maps link" wide hint="Optional. Without it, directions are built from the venue address."><input {...bind('maps_url')} type="url" className={input} placeholder="https://maps.google.com/…" /></F>
          <F id="jf-interview_process" label="Interview process (one step per line)"><textarea {...bind('interview_process')} rows={4} className={area} /></F>
          <F id="jf-documents_required" label="Documents required (one per line)"><textarea {...bind('documents_required')} rows={4} className={area} /></F>
        </Card>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><ImageUp size={19} className="text-indigo-700" aria-hidden="true" />Company logo</h2>
        {!id ? <p className="mt-2 flex items-start gap-2 text-sm text-slate-600"><Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Save the job first, then upload a logo (PNG, JPEG or WebP, up to 512 KB).</p> : (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {logo ? <img src={logo} alt="Current company logo" className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain p-1" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">No logo</span>}
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"><input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />{logo ? 'Replace logo' : 'Upload logo'}</label>
            {logo && <button type="button" onClick={removeLogo} disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-rose-300 px-4 text-sm font-semibold text-rose-800 hover:bg-rose-50"><Trash2 size={15} aria-hidden="true" />Remove</button>}
            <p role="status" className="text-sm text-slate-700">{msg}</p>
          </div>
        )}
      </section>
    </div>
  );
}
