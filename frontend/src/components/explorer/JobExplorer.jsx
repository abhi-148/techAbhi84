import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, SearchX, AlertCircle, RotateCcw, MapPin } from 'lucide-react';
import { api } from '../../lib/api';
import { useMeta } from '../../lib/format';
import { useUserLocation, locationFilters, locationLabel } from '../../lib/location';
import JobCard from '../JobCard';
import Pagination from '../Pagination';
import SearchBox from './SearchBox';
import FilterPanel from './FilterPanel';
import { FILTERS, SORTS, chipText } from './filters';

const PAGE_SIZE = 12;
function Skeleton() {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5" aria-hidden="true"><div className="flex gap-3.5"><div className="ta-skel h-12 w-12" /><div className="flex-1 space-y-2"><div className="ta-skel h-5 w-2/3" /><div className="ta-skel h-4 w-1/3" /></div></div><div className="ta-skel mt-4 h-4 w-full" /><div className="ta-skel mt-2 h-4 w-4/5" /><div className="mt-4 flex gap-2"><div className="ta-skel h-6 w-20" /><div className="ta-skel h-6 w-16" /></div></div>;
}

/**
 * One engine for every job list (All jobs, Internships, Fresher, Walk-in drives, Remote, All India).
 * State lives in the URL (shareable, back-button friendly); results always come from the real API.
 */
export default function JobExplorer({ cfg, renderHero }) {
  const [sp, setSp] = useSearchParams();
  const loc = useUserLocation();
  const [meta, setMeta] = useState({}); const [states, setStates] = useState([]); const [summary, setSummary] = useState(null);
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const [drawer, setDrawer] = useState(false); const [kw, setKw] = useState(sp.get('q') || '');
  const seq = useRef(0); const top = useRef(null);

  useMeta(cfg.metaTitle, cfg.metaDesc);
  useEffect(() => { api('/jobs/meta').then(setMeta).catch(() => {}); if (cfg.filterIds.includes('state')) api('/locations/states').then((d) => setStates(d.states)).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (cfg.summaryPath) api(cfg.summaryPath).then(setSummary).catch(() => {}); }, [cfg.summaryPath]);
  const qs = sp.toString();
  useEffect(() => setKw(sp.get('q') || ''), [qs]); // eslint-disable-line react-hooks/exhaustive-deps

  const page = Math.max(1, parseInt(sp.get('page'), 10) || 1);
  const urlVals = useMemo(() => { const o = {}; for (const id of [...cfg.filterIds, 'q', 'drive', 'sort', 'location']) { const v = sp.get(id); if (v) o[id] = v; } return o; }, [qs]); // eslint-disable-line react-hooks/exhaustive-deps
  const explicitPlace = !!(urlVals.state || urlVals.city);
  const prefOn = cfg.locationAware && sp.get('nl') !== '1' && !explicitPlace;
  const pref = prefOn ? locationFilters(loc, cfg.page) : {};
  const hasPref = Object.keys(pref).length > 0;
  const values = { ...pref, ...urlVals };
  const prefLabel = hasPref ? locationLabel(loc) : '';

  const apiParams = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...cfg.fixed, ...values })) if (v !== '' && v != null) p.set(k, v);
    if (hasPref && loc?.mode === 'city' && cfg.page === 'all') p.set('include_remote', 'india');
    p.set('limit', String(PAGE_SIZE)); p.set('page', String(page));
    return p.toString();
  }, [qs, loc, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const my = ++seq.current; setError('');
    api(`/jobs?${apiParams}`).then((d) => { if (my === seq.current) setData(d); }).catch((e) => { if (my === seq.current) { setError(e.message); setData({ jobs: [], total: 0, pages: 1 }); } });
  }, [apiParams, retry]);

  const update = useCallback((patch, { keepPage = false } = {}) => {
    const n = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) { if (v === '' || v == null) n.delete(k); else n.set(k, v); }
    if (!keepPage) n.delete('page');
    setSp(n);
  }, [sp, setSp]);
  const clearAll = () => { const n = new URLSearchParams(); if (sp.get('drive')) n.set('drive', sp.get('drive')); if (cfg.locationAware && hasPref) n.set('nl', '1'); setSp(n); setKw(''); };
  const goPage = (p) => { update({ page: p > 1 ? String(p) : '' }, { keepPage: true }); top.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); };

  const chips = [];
  if (urlVals.q) chips.push({ key: 'q', text: `Keyword: ${urlVals.q}`, clear: { q: '' } });
  for (const id of cfg.filterIds) if (urlVals[id]) chips.push({ key: id, text: chipText(id, urlVals[id]), clear: { [id]: '' } });
  if (urlVals.location) chips.push({ key: 'location', text: `Location: ${urlVals.location}`, clear: { location: '' } });
  if (hasPref) chips.push({ key: 'pref', text: `Location: ${prefLabel}`, clear: { nl: '1' }, title: 'From the location you chose. Remove to see everywhere.' });
  const activeCount = chips.length;

  const sorts = SORTS[cfg.sorts || 'default'];
  const search = <SearchBox value={kw} onChange={setKw} onSubmit={() => update({ q: kw.trim() })} onPick={(patch) => { setKw(patch.q ?? ''); update(patch); }} placeholder={cfg.searchPlaceholder} dark={cfg.darkHero} />;
  const panel = <FilterPanel ids={cfg.filterIds} values={values} onChange={update} meta={meta} states={states} hideLabels={cfg.labels} />;
  const noun = cfg.noun || 'jobs';

  useEffect(() => {
    if (!drawer) return undefined;
    const k = (e) => { if (e.key === 'Escape') setDrawer(false); }; document.addEventListener('keydown', k);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [drawer]);

  return (
    <>
      {renderHero({ search, summary, meta, update, values })}
      <div ref={top} className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Filters</h2>{activeCount > 0 && <button type="button" onClick={clearAll} className="text-sm font-semibold text-indigo-700 hover:underline">Clear all</button>}</div>
            {panel}
          </div>
        </aside>

        <section aria-live="polite" aria-busy={!data}>
          {cfg.tabs && (
            <div role="tablist" aria-label={`${noun} timing`} className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {cfg.tabs.map(([v, l, key]) => { const on = (urlVals.drive || '') === v; return (
                <button key={v || 'all'} role="tab" aria-selected={on} type="button" onClick={() => update({ drive: v })}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${on ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  {l}{summary && summary[key] != null && <span className={`rounded-full px-2 py-0.5 text-xs ${on ? 'bg-white/25' : 'bg-slate-100 text-slate-700'}`}>{summary[key]}</span>}</button>); })}
            </div>
          )}
          {cfg.quick?.({ update, values, states, meta })}

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setDrawer(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 lg:hidden"><SlidersHorizontal size={16} aria-hidden="true" />Filters{activeCount > 0 && <span className="rounded-full bg-indigo-700 px-2 py-0.5 text-xs text-white">{activeCount}</span>}</button>
            <p className="text-[15px] text-slate-700">{data ? <><strong className="text-slate-900">{data.total.toLocaleString('en-IN')}</strong> {data.total === 1 ? noun.replace(/s$/, '') : noun}{error ? '' : ' found'}</> : 'Loading…'}</p>
            <div className="ml-auto flex items-center gap-2"><label htmlFor="sort" className="text-sm text-slate-600">Sort</label>
              <select id="sort" value={values.sort ?? sorts[0][0]} onChange={(e) => update({ sort: e.target.value || (sorts[0][0] ? '' : '') })} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600">
                {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          </div>

          {chips.length > 0 && (
            <ul className="mb-4 flex flex-wrap gap-2" aria-label="Active filters">
              {chips.map((c) => <li key={c.key}><button type="button" title={c.title} onClick={() => update(c.clear)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 text-sm font-medium text-indigo-900 hover:bg-indigo-100">{c.key === 'pref' && <MapPin size={13} aria-hidden="true" />}{c.text}<X size={14} aria-hidden="true" /><span className="sr-only">Remove filter</span></button></li>)}
              <li><button type="button" onClick={clearAll} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"><RotateCcw size={14} aria-hidden="true" />Clear all</button></li>
            </ul>
          )}

          {!data ? <div className="space-y-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} />)}</div>
            : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"><AlertCircle className="mx-auto text-rose-600" aria-hidden="true" /><p className="mt-2 font-semibold text-rose-900">We could not load {noun}.</p><p className="mt-1 text-sm text-rose-800">{error}</p><button type="button" onClick={() => setRetry((n) => n + 1)} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-rose-700 px-5 text-sm font-bold text-white">Try again</button></div>
            : data.jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <SearchX className="mx-auto text-slate-500" size={34} aria-hidden="true" />
                <h2 className="mt-3 text-xl font-bold text-slate-900">{cfg.emptyTitle || `No ${noun} match these filters`}</h2>
                <p className="mx-auto mt-2 max-w-md text-[15px] text-slate-600">{cfg.emptyHint || 'Try removing a filter or searching a broader term. New listings are added regularly.'}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {activeCount > 0 && <button type="button" onClick={clearAll} className="inline-flex min-h-11 items-center rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white">Clear all filters</button>}
                  {chips.filter((c) => c.key !== 'pref').slice(0, 3).map((c) => <button key={c.key} type="button" onClick={() => update(c.clear)} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">Remove “{c.text}”</button>)}
                  {(cfg.suggestLinks || []).map(([to, text]) => <Link key={to} to={to} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-indigo-800 hover:bg-indigo-50">{text}</Link>)}
                </div>
              </div>
            ) : <>
              <ul className="space-y-4">{data.jobs.map((j) => <li key={j.id}><JobCard job={j} /></li>)}</ul>
              <Pagination page={data.page || page} pages={data.pages} onPage={goPage} />
            </>}
        </section>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3"><h2 className="text-lg font-bold text-slate-900">Filters</h2><button type="button" onClick={() => setDrawer(false)} aria-label="Close filters" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><X size={20} /></button></div>
            <div className="overflow-auto px-5 py-4">{panel}</div>
            <div className="flex gap-3 border-t border-slate-200 p-4"><button type="button" onClick={clearAll} className="min-h-12 flex-1 rounded-xl border border-slate-300 text-sm font-bold text-slate-800">Clear all</button><button type="button" onClick={() => setDrawer(false)} className="min-h-12 flex-[2] rounded-xl bg-indigo-700 text-sm font-bold text-white">Show {data ? data.total : ''} {noun}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
