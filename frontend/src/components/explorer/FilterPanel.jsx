import { useEffect, useId, useState } from 'react';
import { api } from '../../lib/api';
import { FILTERS } from './filters';

const label = 'mb-1.5 block text-sm font-semibold text-slate-800';
const field = 'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15';

function Text({ id, f, value, onCommit }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const uid = useId();
  return (
    <div><label htmlFor={uid} className={label}>{f.label}</label>
      <input id={uid} className={field} value={v} placeholder={f.placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v.trim())} onKeyDown={(e) => { if (e.key === 'Enter') onCommit(v.trim()); }} />
      {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}</div>
  );
}
function City({ f, value, state, onCommit }) {
  const [v, setV] = useState(value); const [opts, setOpts] = useState([]); const uid = useId();
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => { api(`/locations/cities?limit=10&q=${encodeURIComponent(v)}${state ? `&state=${encodeURIComponent(state)}` : ''}`).then((d) => setOpts(d.cities)).catch(() => setOpts([])); }, 250);
    return () => clearTimeout(t);
  }, [v, state]);
  const commit = (x) => { const hit = opts.find((o) => o.city.toLowerCase() === x.toLowerCase()); onCommit(hit ? hit.city : x.trim(), hit?.state); };
  return (
    <div><label htmlFor={uid} className={label}>{f.label}</label>
      <input id={uid} className={field} list={`${uid}-l`} value={v} placeholder="Search a city" autoComplete="off" onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && commit(v)} onKeyDown={(e) => { if (e.key === 'Enter') commit(v); }} />
      <datalist id={`${uid}-l`}>{opts.map((o) => <option key={`${o.city}-${o.state}`} value={o.city}>{o.state ? `${o.city}, ${o.state} (${o.jobs})` : o.city}</option>)}</datalist>
      {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}</div>
  );
}

export default function FilterPanel({ ids, values, onChange, meta, states, hideLabels = {} }) {
  return (
    <div className="space-y-5">
      {ids.map((id) => {
        const f = FILTERS[id]; if (!f) return null; const val = values[id] || '';
        const lab = { ...f, label: hideLabels[id] || f.label };
        if (f.type === 'state') return (
          <div key={id}><label htmlFor="flt-state" className={label}>{f.label}</label>
            <select id="flt-state" className={field} value={val} onChange={(e) => onChange({ state: e.target.value, city: '' })}>
              <option value="">All states and UTs</option>
              {states.map((s) => <option key={s.name} value={s.name}>{s.name}{s.jobs ? ` (${s.jobs})` : ''}</option>)}
            </select></div>);
        if (f.type === 'city') return <City key={id} f={lab} value={val} state={values.state} onCommit={(c, st) => onChange({ city: c, ...(st && !values.state ? { state: st } : {}) })} />;
        if (f.type === 'text') return <Text key={id} id={id} f={lab} value={val} onCommit={(x) => onChange({ [id]: x })} />;
        if (f.type === 'select') {
          const opts = f.from === 'categories' ? [['', 'All categories'], ...(meta.category_options || []).map((c) => [c, c])] : f.options;
          return <div key={id}><label htmlFor={`flt-${id}`} className={label}>{lab.label}</label><select id={`flt-${id}`} className={field} value={val} onChange={(e) => onChange({ [id]: e.target.value })}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>{f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}</div>;
        }
        if (f.type === 'date') return <div key={id}><label htmlFor={`flt-${id}`} className={label}>{f.label}</label><input id={`flt-${id}`} type="date" className={field} value={val} onChange={(e) => onChange({ [id]: e.target.value })} /></div>;
        if (f.type === 'check') return (
          <label key={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
            <input type="checkbox" checked={val === f.value} onChange={(e) => onChange({ [id]: e.target.checked ? f.value : '' })} className="h-5 w-5" />{f.checkLabel}</label>);
        if (f.type === 'radio') return (
          <fieldset key={id}><legend className={label}>{lab.label}</legend>
            <div role="radiogroup" className="flex flex-wrap gap-2">{f.options.map(([v, l]) => { const on = val === v; return (
              <button key={v || 'any'} type="button" role="radio" aria-checked={on} onClick={() => onChange({ [id]: v })}
                className={`min-h-10 rounded-full border px-3.5 text-sm font-medium transition ${on ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>); })}</div>
            {f.help && <p className="mt-1.5 text-xs text-slate-500">{f.help}</p>}</fieldset>);
        if (f.type === 'multi') {
          const cur = val ? val.split(',') : [];
          return (
            <fieldset key={id}><legend className={label}>{lab.label}</legend>
              <div className="space-y-1">{f.options.map(([v, l]) => (
                <label key={v} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-slate-800 hover:bg-slate-50">
                  <input type="checkbox" className="h-5 w-5" checked={cur.includes(v)} onChange={(e) => onChange({ [id]: (e.target.checked ? [...cur, v] : cur.filter((x) => x !== v)).join(',') })} />{l}</label>))}</div></fieldset>);
        }
        return null;
      })}
    </div>
  );
}
