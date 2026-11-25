import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

// Shown only when the server reports that password-reset emails can actually be sent.
export default function ForgotLink({ type }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    api('/auth/capabilities').then((d) => { if (live) setOn(!!d.password_reset); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!on) return null;
  return <div className="mt-2 text-right"><Link to={`/forgot-password?type=${type}`} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">Forgot password?</Link></div>;
}
