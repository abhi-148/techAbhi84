// Page headers with a distinct visual treatment per section (walk-in = rose, remote = teal, India = navy + marigold, jobs = light).
const THEMES = {
  walkin: { bg: 'bg-gradient-to-br from-ink via-indigo-950 to-rose-950', glow: 'bg-rose-500/25', eyebrow: 'text-rose-300', dark: true },
  remote: { bg: 'bg-gradient-to-br from-ink via-teal-950 to-teal-900', glow: 'bg-teal-400/20', eyebrow: 'text-teal-300', dark: true },
  india: { bg: 'bg-gradient-to-br from-ink via-indigo-950 to-indigo-900', glow: 'bg-accent-400/20', eyebrow: 'text-accent-300', dark: true },
  light: { bg: 'bg-white border-b border-slate-200', glow: '', eyebrow: 'text-indigo-700', dark: false },
};
export default function PageHero({ theme = 'light', eyebrow, title, intro, children, aside }) {
  const t = THEMES[theme] || THEMES.light;
  return (
    <section className={`relative isolate overflow-hidden ${t.bg}`}>
      {t.glow && <div aria-hidden="true" className={`pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full blur-3xl ${t.glow}`} />}
      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            {eyebrow && <p className={`text-sm font-bold uppercase tracking-wider ${t.eyebrow}`}>{eyebrow}</p>}
            <h1 className={`mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl ${t.dark ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
            {intro && <p className={`mt-3 max-w-2xl text-base leading-7 ${t.dark ? 'text-slate-200' : 'text-slate-600'}`}>{intro}</p>}
          </div>
          {aside}
        </div>
        {children && <div className="mt-6 max-w-3xl">{children}</div>}
      </div>
    </section>
  );
}
