import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

// Same rules the server enforces (utils/validate.js), so people see problems before submitting.
export function passwordProblems(pw, email = '') {
  const out = [];
  if (pw.length < 8) out.push('at least 8 characters');
  if (!/[A-Za-z]/.test(pw) || !/[^A-Za-z]/.test(pw)) out.push('letters together with numbers or symbols');
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && pw.toLowerCase().includes(local)) out.push('no part of your email name');
  return out;
}
export function PasswordMeter({ password }) {
  const score = [password.length >= 8, password.length >= 12, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const label = !password ? 'Strength' : score <= 2 ? 'Weak' : score <= 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';
  const color = score <= 2 ? 'bg-rose-500' : score <= 3 ? 'bg-amber-500' : 'bg-emerald-600';
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">{[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${password && i <= score ? color : 'bg-slate-200'}`} />)}</div>
      <p className="mt-1.5 text-xs text-slate-600">{label}. Use 8+ characters, mixing letters with numbers or symbols. Longer is stronger.</p>
    </div>
  );
}
export function ConfirmPassword({ id = 'confirm-password', value, onChange, password, className = '' }) {
  const [show, setShow] = useState(false);
  const mismatch = value && value !== password;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm password</label>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} autoComplete="new-password" value={value} onChange={onChange} required aria-invalid={!!mismatch} aria-describedby={`${id}-msg`}
          className={`h-11 w-full rounded-xl border bg-white px-3.5 pr-11 text-sm text-slate-900 outline-none focus:ring-4 ${mismatch ? 'border-rose-400 focus:ring-rose-500/10' : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/15'} ${className}`} placeholder="Type the password again" />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </div>
      <p id={`${id}-msg`} className="mt-1 min-h-[1.25rem] text-xs text-rose-700">{mismatch ? 'The two passwords do not match.' : ''}</p>
    </div>
  );
}
