
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ForgotLink from '../../components/ForgotLink';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  ChevronLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { api, setSession } from '../../lib/api';
import OtpVerify from '../../components/OtpVerify';
import { ConfirmPassword, passwordProblems } from '../../components/PasswordExtras';
import { inputCls, useMeta, safeNext } from '../../lib/format';

const cx = (...classes) => classes.filter(Boolean).join(' ');

function FieldLabel({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-bold text-slate-800"
    >
      {children}
    </label>
  );
}

function getPasswordStrength(password) {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  const score = checks.filter(Boolean).length;

  if (!password) {
    return {
      score: 0,
      label: 'Enter a password',
      color: 'bg-slate-200',
      text: 'text-slate-500',
    };
  }

  if (score <= 1) {
    return {
      score,
      label: 'Weak',
      color: 'bg-rose-500',
      text: 'text-rose-600',
    };
  }

  if (score === 2) {
    return {
      score,
      label: 'Fair',
      color: 'bg-amber-500',
      text: 'text-amber-600',
    };
  }

  if (score === 3) {
    return {
      score,
      label: 'Good',
      color: 'bg-blue-500',
      text: 'text-blue-600',
    };
  }

  return {
    score,
    label: 'Strong',
    color: 'bg-emerald-500',
    text: 'text-emerald-600',
  };
}

function PasswordStrength({ password }) {
  const strength = getPasswordStrength(password);

  const rules = [
    ['8+ characters', password.length >= 8],
    [
      'Upper & lowercase',
      /[a-z]/.test(password) && /[A-Z]/.test(password),
    ],
    ['One number', /\d/.test(password)],
    ['One symbol', /[^A-Za-z0-9]/.test(password)],
  ];

  return (
    <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-600">
          Password strength
        </span>
        <span className={cx('text-xs font-bold', strength.text)}>
          {strength.label}
        </span>
      </div>

      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4].map((item) => (
          <span
            key={item}
            className={cx(
              'h-1 flex-1 rounded-full transition-colors',
              strength.score >= item ? strength.color : 'bg-slate-200'
            )}
          />
        ))}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5">
        {rules.map(([label, valid]) => (
          <div
            key={label}
            className={cx(
              'flex items-center gap-1.5 text-xs',
              valid ? 'text-emerald-700' : 'text-slate-500'
            )}
          >
            {valid ? (
              <CheckCircle2 size={12} className="shrink-0" />
            ) : (
              <Circle size={12} className="shrink-0" />
            )}
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandPanel({ register }) {
  const features = [
    {
      title: 'Discover opportunities',
      description: 'Find roles that match your career goals.',
    },
    {
      title: 'Stay organised',
      description: 'Keep your candidate journey in one place.',
    },
    {
      title: 'Move forward',
      description: 'Take the next step in your career.',
    },
  ];

  return (
    <aside className="relative hidden overflow-hidden bg-[#111735] p-7 text-white lg:flex lg:flex-col lg:justify-between xl:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 top-0 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:30px_30px]" />
      </div>

      <Link
        to="/"
        className="relative inline-flex w-fit items-center gap-2.5"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-indigo-200">
          <BriefcaseBusiness size={21} />
        </span>
        <span className="text-xl font-extrabold tracking-tight">
          Tech<span className="text-indigo-300">Abhi</span>.
        </span>
      </Link>

      <div className="relative my-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-extrabold tracking-[0.12em] text-indigo-100">
          <Sparkles size={13} className="text-violet-300" />
          YOUR CAREER, YOUR NEXT CHAPTER
        </div>

        <h2 className="mt-5 max-w-sm text-3xl font-extrabold leading-[1.15] tracking-tight xl:text-[2.4rem]">
          {register
            ? 'Your next career chapter starts here.'
            : 'Welcome back. Your next opportunity awaits.'}
        </h2>

        <p className="mt-3 max-w-sm text-xs leading-6 text-slate-300">
          {register
            ? 'Create your candidate account and make your job search easier to manage.'
            : 'Sign in to continue your journey and manage your candidate account.'}
        </p>

        <div className="mt-6 space-y-4">
          {features.map((feature) => (
            <div key={feature.title} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-300/15 bg-indigo-400/10 text-indigo-200">
                <CheckCircle2 size={15} />
              </span>
              <div>
                <p className="text-xs font-bold text-white">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.045] p-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-indigo-300"
            />
            <div>
              <p className="text-xs font-bold text-white">
                Your career, your control
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Explore opportunities and decide which ones are right for you.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 pt-3 text-xs text-slate-500">
        © {new Date().getFullYear()} TechAbhi · Candidate portal
      </div>
    </aside>
  );
}

function MobileBrand() {
  return (
    <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
      <Link to="/" className="inline-flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
          <BriefcaseBusiness size={20} />
        </span>
        <span className="text-xl font-extrabold tracking-tight text-slate-950">
          Tech<span className="text-indigo-600">Abhi</span>.
        </span>
      </Link>

      <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700">
        Candidate portal
      </span>
    </div>
  );
}

function AuthInput({
  id,
  name,
  label,
  icon: Icon,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  error,
  trailing,
  ...rest
}) {
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      <div className="relative">
        <Icon
          size={17}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
        />

        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cx(
            inputCls,
            'h-11 rounded-xl border bg-slate-50/70 pl-10 text-xs text-slate-900 shadow-none outline-none transition placeholder:text-slate-500 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10',
            error
              ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10'
              : 'border-slate-200',
            trailing ? 'pr-11' : 'pr-3.5'
          )}
          {...rest}
        />

        {trailing}
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function CandidateAuthPage({ mode }) {
  const register = mode === 'register';

  useMeta(
    register
      ? 'Create candidate account | TechAbhi'
      : 'Candidate login | TechAbhi'
  );

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  const passwordStrength = getPasswordStrength(form.password);

  const updateField = (field) => (event) => {
    const value = event.target.value;

    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
    setErrorMessage('');
  };

  const validate = () => {
    const errors = {};

    if (register && !form.full_name.trim()) {
      errors.full_name = 'Please enter your full name.';
    }

    if (!form.email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!form.password) {
      errors.password = 'Please enter your password.';
    } else if (register && passwordProblems(form.password, form.email).length) {
      errors.password = 'Your password needs ' + passwordProblems(form.password, form.email).join(' and ') + '.';
    } else if (register && confirm !== form.password) {
      errors.confirm = 'The two passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();

    if (busy) return;

    setErrorMessage('');
    if (!validate()) return;

    setBusy(true);

    try {
      const body = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        ...(register ? { full_name: form.full_name.trim() } : {}),
      };

      const response = await api(`/candidate/${mode}`, {
        method: 'POST',
        body,
      });

      if (response?.needs_verification) { setOtpEmail(body.email); return; }
      setSession('candidate', { email: body.email, full_name: response?.full_name });
      navigate(
        safeNext(searchParams.get('next'), '/candidate/dashboard'),
        { replace: true }
      );
    } catch (error) {
      if (error?.data?.needs_verification) { setOtpEmail(form.email.trim().toLowerCase()); return; }
      setErrorMessage(
        error?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (otpEmail) {
    return <OtpVerify type="candidate" email={otpEmail} onBack={() => setOtpEmail('')} onVerified={(d) => { setSession('candidate', { email: otpEmail, full_name: d.full_name }); navigate(safeNext(searchParams.get('next'), '/candidate/dashboard'), { replace: true }); }} />;
  }

  return (
    <div className="relative isolate min-h-[calc(100vh-80px)] overflow-x-clip bg-[#f5f7fc] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-violet-200/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-blue-100/30 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-[1000px]">
        <div className="grid overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_70px_-40px_rgba(31,41,91,0.35)] lg:grid-cols-[0.92fr_1.08fr]">
          <BrandPanel register={register} />

          <section className="min-w-0 p-5 sm:p-8 lg:p-8 xl:p-10">
            <MobileBrand />

            <div className="mx-auto max-w-[410px]">
              <Link
                to="/"
                className="mb-4 hidden w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-700 lg:inline-flex"
              >
                <ChevronLeft size={14} />
                Back to home
              </Link>

              <div className="mb-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700">
                  {register ? (
                    <UserRound size={21} />
                  ) : (
                    <LockKeyhole size={21} />
                  )}
                </div>

                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">
                  {register ? 'Create your profile' : 'Candidate portal'}
                </p>

                <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-tight text-slate-950 sm:text-[30px]">
                  {register ? 'Create your account' : 'Welcome back'}
                </h1>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {register
                    ? 'Get started with your job search in just a few steps.'
                    : 'Sign in to continue and manage your career journey.'}
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"
                >
                  <p className="font-bold">
                    {register ? 'Account creation failed' : 'Sign-in failed'}
                  </p>
                  <p className="mt-1 break-words">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={submit} noValidate className="space-y-3.5">
                {register && (
                  <AuthInput
                    id="candidate-name"
                    name="full_name"
                    label="Full name"
                    icon={UserRound}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    autoCapitalize="words"
                    maxLength={120}
                    value={form.full_name}
                    onChange={updateField('full_name')}
                    error={fieldErrors.full_name}
                  />
                )}

                <AuthInput
                  id="candidate-email"
                  name="email"
                  label="Email address"
                  icon={Mail}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  maxLength={254}
                  value={form.email}
                  onChange={updateField('email')}
                  error={fieldErrors.email}
                />

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="candidate-password">
                      Password
                    </FieldLabel>

                    {register && (
                      <span className="text-xs text-slate-500">
                        8+ characters
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      size={17}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="candidate-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={updateField('password')}
                      placeholder={
                        register
                          ? 'Create a strong password'
                          : 'Enter your password'
                      }
                      autoComplete={
                        register ? 'new-password' : 'current-password'
                      }
                      minLength={register ? 8 : undefined}
                      required
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={
                        fieldErrors.password
                          ? 'candidate-password-error'
                          : register
                            ? 'candidate-password-help'
                            : undefined
                      }
                      className={cx(
                        inputCls,
                        'h-11 rounded-xl border bg-slate-50/70 pl-10 pr-11 text-xs text-slate-900 shadow-none outline-none transition placeholder:text-slate-500 hover:border-slate-300 focus:bg-white focus:ring-4',
                        fieldErrors.password
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                      )}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>

                  {!register && <ForgotLink type="candidate" />}

                  {fieldErrors.password && (
                    <p
                      id="candidate-password-error"
                      className="mt-1.5 text-xs leading-5 text-rose-600"
                    >
                      {fieldErrors.password}
                    </p>
                  )}

                  {register && (
                    <div id="candidate-password-help">
                      <PasswordStrength password={form.password} />
                    </div>
                  )}
                </div>

                {register && (
                  <div>
                    <ConfirmPassword id="candidate-confirm" value={confirm} onChange={(e) => { setConfirm(e.target.value); setFieldErrors((c) => ({ ...c, confirm: '' })); }} password={form.password} />
                    {fieldErrors.confirm && <p className="-mt-3 text-sm text-rose-700">{fieldErrors.confirm}</p>}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-extrabold text-white shadow-md shadow-indigo-600/15 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-indigo-600/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 disabled:cursor-wait disabled:opacity-65 disabled:hover:translate-y-0"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Please wait…
                    </>
                  ) : (
                    <>
                      {register ? 'Create free account' : 'Sign in to your account'}
                      <ArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-bold tracking-[0.13em] text-slate-500">
                  YOUR CAREER JOURNEY
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <p className="text-center text-xs leading-5 text-slate-500">
                {register ? 'Already have an account?' : 'New to TechAbhi?'}{' '}
                {register ? (
                  <Link
                    className="font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline"
                    to="/candidate/login"
                  >
                    Sign in
                  </Link>
                ) : (
                  <Link
                    className="font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline"
                    to="/candidate/register"
                  >
                    Create an account
                  </Link>
                )}
              </p>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck
                    size={15}
                    className="mt-0.5 shrink-0 text-indigo-600"
                  />
                  <p className="text-xs leading-[1.65] text-slate-500">
                    Your account helps manage your candidate journey. You can
                    browse available jobs without signing in wherever guest
                    access is supported.
                  </p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-indigo-700"
                >
                  Explore jobs first
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </section>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          © {new Date().getFullYear()} TechAbhi · Candidate account access
        </p>
      </div>
    </div>
  );
}
