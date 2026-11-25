export default function PageHeader({ eyebrow, title, children, tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <section className={dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white' : 'border-b border-slate-200 bg-white'}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {eyebrow && <p className={`text-xs font-bold uppercase tracking-wider ${dark ? 'text-indigo-300' : 'text-indigo-600'}`}>{eyebrow}</p>}
        <h1 className={`mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
        {children && <div className={`mt-3 max-w-2xl text-base leading-7 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{children}</div>}
      </div>
    </section>
  );
}
