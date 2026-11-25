import { useEffect, useState, useCallback } from 'react';
import { api, isCandidate, getSession } from './api';

// One shared saved-jobs store so every Save button on a page stays in sync and we only fetch once.
let ids = null;           // Set<number> | null (not loaded)
let owner = null;         // the login token these ids belong to (never show one account's saves to another)
const fresh = () => { const t = getSession('candidate')?.email || null; if (t !== owner) { ids = null; owner = t; } };
let loading = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f());

async function load() {
  fresh();
  if (!isCandidate()) { ids = null; return; }
  if (ids || loading) return loading;
  loading = api('/candidate/saved/ids', { candidate: true })
    .then((d) => { ids = new Set(d.ids); })
    .catch(() => { ids = new Set(); })       // a failed lookup must not block saving
    .finally(() => { loading = null; emit(); });
  return loading;
}
export const resetSaved = () => { ids = null; emit(); };

export function useSavedJobs() {
  const [, tick] = useState(0);
  const loggedIn = isCandidate();
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    subs.add(f); load();
    return () => subs.delete(f);
  }, [loggedIn]);
  const toggle = useCallback(async (jobId) => {
    fresh();
    if (!isCandidate()) return { needsLogin: true };
    const was = ids?.has(jobId);
    try {
      if (was) await api('/candidate/saved/' + jobId, { method: 'DELETE', candidate: true });
      else await api('/candidate/saved', { method: 'POST', body: { job_id: jobId }, candidate: true });
      ids = new Set(ids || []); was ? ids.delete(jobId) : ids.add(jobId); emit();
      return { saved: !was };
    } catch (e) { return { error: e.message || 'Could not update saved jobs.' }; }
  }, []);
  return { loggedIn, isSaved: (id) => { fresh(); return loggedIn && !!ids?.has(id); }, toggle };
}
