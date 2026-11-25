import { useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed, X, Search, Globe2, RotateCcw, LoaderCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useUserLocation, saveLocation, resetLocation, locationLabel, detectLocation } from '../lib/location';

// "Where do you want to work?" The browser's location permission is requested ONLY when the person presses the button.
export default function LocationPicker({ variant = 'header', className = '' }) {
  const loc = useUserLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(''); const [places, setPlaces] = useState([]); const [states, setStates] = useState([]);
  const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  const input = useRef(null); const trigger = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    api('/locations/states').then((d) => setStates(d.states)).catch(() => {});
    input.current?.focus();
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', key);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev; trigger.current?.focus(); };
  }, [open]);
  useEffect(() => {
    if (!open || q.trim().length < 2) { setPlaces([]); return undefined; }
    const t = setTimeout(() => { api(`/locations/search?q=${encodeURIComponent(q.trim())}`).then((d) => setPlaces(d.places)).catch(() => setPlaces([])); }, 350);
    return () => clearTimeout(t);
  }, [q, open]);

  const choose = (l) => { saveLocation(l); setOpen(false); setQ(''); setNote(''); };
  const detect = async () => {
    setBusy(true); setNote('');
    try { const p = await detectLocation(); if (p.country_code && p.country_code !== 'IN') { setNote(`We found ${[p.city, p.country].filter(Boolean).join(', ')}. TechAbhi's office jobs are in India. Pick an Indian city, or choose Remote – Worldwide.`); } else choose({ mode: 'city', city: p.city, state: p.state }); }
    catch (e) { setNote(e.message); } finally { setBusy(false); }
  };
  const needle = q.trim().toLowerCase();
  const stateHits = needle.length >= 2 ? states.filter((s) => s.name.toLowerCase().includes(needle)).slice(0, 6) : [];
  const label = loc ? locationLabel(loc) : 'Set location';
  const trig = variant === 'header'
    ? 'inline-flex min-h-11 max-w-[11rem] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100'
    : 'inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20';

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={`${trig} ${className}`}>
        <MapPin size={16} aria-hidden="true" className="shrink-0" /><span className="truncate">{label}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="loc-title" className="max-h-[92dvh] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-5 shadow-lift sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><h2 id="loc-title" className="text-xl font-bold text-slate-900">Choose your location</h2><p className="mt-1 text-sm text-slate-600">Used only to filter jobs. We never show or store your exact position.</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <button type="button" onClick={detect} disabled={busy} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 text-[15px] font-bold text-white hover:bg-indigo-800 disabled:opacity-70">
              {busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={18} aria-hidden="true" />}{busy ? 'Finding your city…' : 'Use my current location'}
            </button>
            <div role="status" aria-live="polite" className="min-h-[1.25rem] pt-2 text-sm text-amber-800">{note}</div>

            <div className="relative mt-3">
              <label htmlFor="loc-q" className="sr-only">Search city or state</label>
              <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input ref={input} id="loc-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city or state" autoComplete="off" className="h-12 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-[15px] outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15" />
            </div>
            {(stateHits.length > 0 || places.length > 0) && (
              <ul className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 p-1">
                {places.map((p) => <li key={`${p.city}-${p.state}`}><button type="button" onClick={() => choose({ mode: 'city', city: p.city, state: p.state })} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm hover:bg-slate-50"><span>{p.city}{p.state ? `, ${p.state}` : ''}</span>{p.jobs > 0 && <span className="text-xs text-slate-500">{p.jobs} jobs</span>}</button></li>)}
                {stateHits.map((s) => <li key={s.name}><button type="button" onClick={() => choose({ mode: 'state', state: s.name })} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm hover:bg-slate-50"><span>{s.name} <span className="text-slate-500">({s.type === 'ut' ? 'Union Territory' : 'State'})</span></span>{s.jobs > 0 && <span className="text-xs text-slate-500">{s.jobs} jobs</span>}</button></li>)}
              </ul>
            )}
            {needle.length >= 2 && !stateHits.length && !places.length && <p className="mt-2 text-sm text-slate-600">No match yet. Try a different spelling, or pick a state below.</p>}

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {[['all-india', 'All India', MapPin], ['remote-india', 'Remote – India', Globe2], ['remote-worldwide', 'Remote – Worldwide', Globe2]].map(([mode, text, Icon]) => (
                <button key={mode} type="button" onClick={() => choose({ mode })} aria-pressed={loc?.mode === mode} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold ${loc?.mode === mode ? 'border-indigo-700 bg-indigo-50 text-indigo-800' : 'border-slate-300 text-slate-800 hover:bg-slate-50'}`}><Icon size={16} aria-hidden="true" />{text}</button>))}
            </div>
            {loc && <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4"><p className="text-sm text-slate-700">Current: <strong>{locationLabel(loc)}</strong></p>
              <button type="button" onClick={() => { resetLocation(); setNote(''); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"><RotateCcw size={15} aria-hidden="true" />Reset location</button></div>}
          </div>
        </div>
      )}
    </>
  );
}
