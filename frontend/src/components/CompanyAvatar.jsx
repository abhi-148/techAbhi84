import { useState } from 'react';
import { initials, avatarTone } from '../lib/format';

// Shows the real logo an admin/recruiter uploaded; otherwise initials. Logos are never invented.
export default function CompanyAvatar({ name, size = 'md', className = '', logo = null }) {
  const [broken, setBroken] = useState(false);
  const dim = { sm: 'h-10 w-10 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg' }[size];
  if (logo && !broken) return <img src={logo} alt="" loading="lazy" decoding="async" width={64} height={64} onError={() => setBroken(true)} className={`shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1 ${dim} ${className}`} />;
  return <span aria-hidden="true" className={`flex shrink-0 select-none items-center justify-center rounded-xl font-bold ${dim} ${avatarTone(name)} ${className}`}>{initials(name)}</span>;
}
