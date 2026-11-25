import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { track } from '../lib/api';

// Uses the phone's share sheet when there is one, otherwise copies the link.
export default function ShareButton({ job, className = '', label = 'Share' }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/jobs/${job.id}`;
    const text = `${job.title}${job.company ? ' at ' + job.company : ''}`;
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); }
      else { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); }
      track(job.id, 'share');
    } catch { /* cancelled */ }
  };
  return (
    <button type="button" onClick={share} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${className}`}>
      {done ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}<span aria-live="polite">{done ? 'Link copied' : label}</span>
    </button>
  );
}
