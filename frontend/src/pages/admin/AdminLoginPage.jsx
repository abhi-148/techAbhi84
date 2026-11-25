import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  ShieldAlert,
  LoaderCircle,
  BriefcaseBusiness,
  Sparkles,
  CheckCircle2,
  Fingerprint,
  KeyRound,
} from 'lucide-react';

import { api, setSession } from '../../lib/api';
import { inputCls, useMeta } from '../../lib/format';

const FEATURES = [
  'Manage job listings and publishing',
  'Review recruiter registrations',
  'Support candidates with career assistance',
];

const GENERIC_LOGIN_ERROR =
  'Unable to sign in with those credentials. Check your details and try again.';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export default function AdminLoginPage() {
  useMeta('Admin Login | TechAbhi');

  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
    if (error) setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setError('Enter both your administrator email and password.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const response = await api('/admin/login', {
        method: 'POST',
        body: { email, password },
      });

      if (!response?.email) throw new Error('Invalid login response.');
      // The session is an HttpOnly cookie set by the server; nothing sensitive is kept in JavaScript.
      setSession('admin', { email: response.email });
      setForm((previous) => ({ ...previous, password: '' }));
      navigate('/admin/dashboard', { replace: true });
    } catch {
      // Avoid exposing internal server details or account existence.
      setError(GENERIC_LOGIN_ERROR);
      setForm((previous) => ({ ...previous, password: '' }));
      setShowPassword(false);
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = cx(
    inputCls,
    '!h-11 !min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-900',
    'placeholder:text-slate-500 transition-colors duration-150 hover:border-slate-300',
    'focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10',
    'disabled:cursor-not-allowed disabled:opacity-60',
  );

  return (
    <div className="relative isolate flex min-h-[calc(100dvh-76px)] items-center justify-center overflow-hidden bg-[#f6f7fb] px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
      {/* Soft background decoration */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-36 h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl" />
        <div className="absolute -bottom-36 -right-24 h-80 w-80 rounded-full bg-violet-200/45 blur-3xl" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#cbd5e1_0.7px,transparent_0.7px)] [background-size:20px_20px]" />
      </div>

      <div className="w-full max-w-[1000px]">
        <header className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <Link
            to="/"
            className="group inline-flex min-w-0 items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 transition-colors group-hover:bg-indigo-700">
              <BriefcaseBusiness size={19} />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-extrabold leading-tight tracking-tight text-slate-950 sm:text-[17px]">
                TechAbhi
              </span>
              <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Career platform
              </span>
            </span>
          </Link>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-slate-600 shadow-sm sm:px-3 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Restricted access
          </span>
        </header>

        <div className="grid overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_22px_70px_-36px_rgba(30,41,90,0.4)] md:grid-cols-[0.92fr_1.08fr] md:rounded-[26px]">
          {/* Brand panel */}
          <section className="relative hidden overflow-hidden bg-[#17183d] p-6 text-white md:flex md:flex-col md:justify-between lg:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-transparent to-violet-600/25" />
              <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full border border-white/10" />
              <div className="absolute -right-8 top-1 h-44 w-44 rounded-full border border-white/10" />
              <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:32px_32px]" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-bold tracking-wide text-indigo-100">
                <Sparkles size={13} className="text-violet-300" />
                YOUR PLATFORM, ONE WORKSPACE
              </div>

              <h1 className="mt-5 max-w-sm text-[27px] font-black leading-[1.13] tracking-tight lg:text-[32px]">
                Keep your platform moving.
                <span className="mt-1.5 block bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
                  Access with care.
                </span>
              </h1>

              <p className="mt-3 max-w-sm text-xs leading-[1.7] text-slate-300 lg:text-xs">
                One central workspace for jobs, recruiter registrations, candidate accounts and career assistance.
              </p>

              <div className="mt-5 space-y-2.5">
                {FEATURES.map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5 text-xs text-slate-200 lg:text-xs">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
                      <CheckCircle2 size={13} />
                    </span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-7">
              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3.5 backdrop-blur-sm lg:p-4">
                <div className="flex items-start gap-2.5">
                  <div className="rounded-lg bg-white/10 p-2 text-indigo-200">
                    <Fingerprint size={19} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white lg:text-xs">
                      Administrator-only workspace
                    </p>
                    <p className="mt-1 text-xs leading-[1.6] text-slate-500">
                      Keep your credentials private and sign out on shared devices.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>© {new Date().getFullYear()} TechAbhi</span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={12} /> Admin access
                </span>
              </div>
            </div>
          </section>

          {/* Login panel */}
          <section className="flex items-center justify-center px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8">
            <div className="w-full max-w-[360px]">
              <div className="mb-4 flex items-center gap-2 md:hidden">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <BriefcaseBusiness size={17} />
                </span>
                <span className="text-base font-extrabold tracking-tight text-slate-950">TechAbhi</span>
              </div>

              <div className="mb-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700">
                  <LockKeyhole size={19} />
                </div>
                <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-indigo-600">
                  Secure workspace
                </p>
                <h2 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-slate-950 sm:text-[29px]">
                  Admin sign in
                </h2>
                <p className="mt-1.5 text-xs leading-[1.65] text-slate-500 sm:text-xs">
                  Sign in with the administrator account authorised for TechAbhi.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"
                >
                  <ShieldAlert size={17} className="mt-0.5 shrink-0" />
                  <p className="break-words">{error}</p>
                </div>
              )}

              <form onSubmit={submit} className="space-y-3.5" autoComplete="on">
                <div>
                  <label htmlFor="admin-email" className="mb-1.5 block text-xs font-bold text-slate-700">
                    Email address
                  </label>
                  <div className="group relative">
                    <Mail
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-indigo-600"
                    />
                    <input
                      id="admin-email"
                      name="email"
                      className={cx(fieldClass, 'pl-10 pr-3')}
                      type="email"
                      inputMode="email"
                      placeholder="admin@techabhi.com"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={254}
                      required
                      disabled={busy}
                      value={form.email}
                      onChange={updateField('email')}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label htmlFor="admin-password" className="text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                      <ShieldCheck size={12} /> Private
                    </span>
                  </div>
                  <div className="group relative">
                    <KeyRound
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-indigo-600"
                    />
                    <input
                      id="admin-password"
                      name="password"
                      className={cx(fieldClass, 'pl-10 pr-11')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      maxLength={1024}
                      required
                      disabled={busy}
                      value={form.password}
                      onChange={updateField('password')}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((previous) => !previous)}
                      disabled={busy}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy || !form.email.trim() || !form.password}
                  className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-px hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Verifying credentials…
                    </>
                  ) : (
                    <>
                      Sign in to dashboard
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Authorised access only</p>
                  <p className="mt-1 text-xs leading-[1.6] text-slate-500">
                    Never share your password or authentication token. Avoid signing in on public or shared devices.
                  </p>
                </div>
              </div>

              <Link
                to="/"
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
              >
                <ArrowLeft size={14} />
                Back to TechAbhi
              </Link>

              <p className="mt-2 text-center text-xs leading-4 text-slate-500">
                © {new Date().getFullYear()} TechAbhi. All rights reserved.
              </p>
            </div>
          </section>
        </div>

        <p className="mx-auto mt-2.5 max-w-3xl text-center text-xs leading-4 text-slate-500">
          Protect administrator APIs on the server and always use HTTPS.
        </p>
      </div>
    </div>
  );
}
