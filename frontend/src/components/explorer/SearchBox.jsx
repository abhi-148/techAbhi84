import { useEffect, useId, useRef, useState } from 'react';
import { Search, X, Building2, MapPin, Wrench, Briefcase } from 'lucide-react';
import { api } from '../../lib/api';

// Keyword box with live suggestions (titles, companies, skills, cities) taken from real, currently open jobs.
export default function SearchBox({ value, onChange, onSubmit, onPick, placeholder = 'Job title, skills or company', dark = false }) {
  const id = useId(); const [items, setItems] = useState([]); const [open, setOpen] = useState(false); const [active, setActive] = useState(-1);
  const box = useRef(null); const seq = useRef(0);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) { setItems([]); return undefined; }
    const my = ++seq.current;
    const t = setTimeout(() => {
      api(`/jobs/suggest?q=${encodeURIComponent(q)}`).then((d) => {
        if (my !== seq.current) return;
        setItems([
          ...d.titles.map((v) => ({ k: 'title', v, label: v, icon: Briefcase, patch: { q: v } })),
          ...d.companies.map((v) => ({ k: 'company', v, label: v, icon: Building2, patch: { company: v, q: '' } })),
          ...d.skills.map((v) => ({ k: 'skill', v, label: v, icon: Wrench, patch: { skills: v, q: '' } })),
          ...d.cities.map((c) => ({ k: 'city', v: c.city, label: [c.city, c.state].filter(Boolean).join(', '), icon: MapPin, patch: { city: c.city, ...(c.state ? { state: c.state } : {}), q: '' } })),
        ]);
      }).catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [value]);
  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away); return () => document.removeEventListener('mousedown', away);
  }, []);

  const pick = (it) => { setOpen(false); setActive(-1); onPick(it.patch); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'Enter' && open && active >= 0 && items[active]) { e.preventDefault(); pick(items[active]); }
  };
  const showList = open && items.length > 0;
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); setOpen(false); onSubmit(); }} className="relative" ref={box}>
      <label htmlFor={`${id}-q`} className="sr-only">Search jobs</label>
      <Search size={19} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
      <input id={`${id}-q`} role="combobox" aria-expanded={showList} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined}
        value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onKeyDown={onKey} placeholder={placeholder} autoComplete="off" enterKeyHint="search"
        className={`h-14 w-full rounded-2xl border pl-12 pr-28 text-base text-slate-900 shadow-sm outline-none transition focus:ring-4 ${dark ? 'border-transparent bg-white focus:ring-accent-400/40' : 'border-slate-300 bg-white focus:border-indigo-600 focus:ring-indigo-600/15'}`} />
      {value && <button type="button" onClick={() => { onChange(''); setItems([]); }} aria-label="Clear search" className="absolute right-[5.5rem] top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={17} /></button>}
      <button type="submit" className="absolute right-2 top-1/2 inline-flex h-10 -translate-y-1/2 items-center rounded-xl bg-indigo-700 px-4 text-sm font-bold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">Search</button>
      {showList && (
        <ul id={`${id}-list`} role="listbox" aria-label="Suggestions" className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift">
          {items.map((it, i) => { const Icon = it.icon; return (
            <li key={`${it.k}-${it.label}`} id={`${id}-o${i}`} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); pick(it); }} onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm ${i === active ? 'bg-indigo-50 text-indigo-900' : 'text-slate-800'}`}>
              <Icon size={16} aria-hidden="true" className="shrink-0 text-slate-500" /><span className="truncate">{it.label}</span><span className="ml-auto shrink-0 text-xs capitalize text-slate-500">{it.k}</span>
            </li>); })}
        </ul>
      )}
    </form>
  );
}
