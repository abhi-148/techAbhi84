import { ChevronLeft, ChevronRight } from 'lucide-react';
export default function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  const nums = []; for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i += 1) nums.push(i);
  const b = 'inline-flex h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600';
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${b} border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40`} aria-label="Previous page"><ChevronLeft size={16} aria-hidden="true" /><span className="hidden sm:inline">&nbsp;Prev</span></button>
      {nums[0] > 1 && <><button type="button" onClick={() => onPage(1)} className={`${b} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>1</button>{nums[0] > 2 && <span aria-hidden="true" className="px-1 text-slate-500">…</span>}</>}
      {nums.map((n) => <button key={n} type="button" onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined} className={`${b} ${n === page ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{n}</button>)}
      {nums[nums.length - 1] < pages && <>{nums[nums.length - 1] < pages - 1 && <span aria-hidden="true" className="px-1 text-slate-500">…</span>}<button type="button" onClick={() => onPage(pages)} className={`${b} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>{pages}</button></>}
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className={`${b} border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40`} aria-label="Next page"><span className="hidden sm:inline">Next&nbsp;</span><ChevronRight size={16} aria-hidden="true" /></button>
    </nav>
  );
}
