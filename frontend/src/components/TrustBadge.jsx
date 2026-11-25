import { ShieldCheck, BadgeCheck, Clock3, TriangleAlert } from 'lucide-react';

// A badge always carries words (never colour alone) and is only "Verified" when an admin really verified the listing.
const STYLE = {
  verified: { label: 'Verified by TechAbhi', cls: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: ShieldCheck },
  recruiter_submitted: { label: 'Recruiter submitted', cls: 'border-sky-200 bg-sky-50 text-sky-800', Icon: BadgeCheck },
  awaiting: { label: 'Awaiting verification', cls: 'border-slate-200 bg-slate-50 text-slate-700', Icon: Clock3 },
  reported: { label: 'Reported opportunity', cls: 'border-amber-300 bg-amber-50 text-amber-900', Icon: TriangleAlert },
};
export default function TrustBadge({ status, className = '' }) {
  const s = STYLE[status]; if (!s) return null;
  const { Icon } = s;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls} ${className}`}><Icon size={13} aria-hidden="true" />{s.label}</span>;
}
