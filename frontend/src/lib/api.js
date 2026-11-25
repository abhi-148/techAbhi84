
import { useSyncExternalStore } from 'react';

// Authentication state is maintained in memory.
// Actual authentication is handled by secure HttpOnly cookies.
const state = {
  candidate: null,
  recruiter: null,
  admin: null,
};

const subs = new Set();

const emit = () => {
  subs.forEach((fn) => fn());
};

const subscribe = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

export const getSession = (role) => state[role];

export const setSession = (role, info = {}) => {
  state[role] = { ...(info || {}) };
  emit();
};

export const clearSession = (role) => {
  if (state[role]) {
    state[role] = null;
    emit();
  }
};

export const isCandidate = () => !!state.candidate;
export const isRecruiter = () => !!state.recruiter;
export const isAdmin = () => !!state.admin;

export const useSession = (role) =>
  useSyncExternalStore(subscribe, () => state[role]);

/**
 * Called once before the app renders.
 * Checks the current server session.
 */
export async function bootstrapSession() {
  try {
    const res = await Promise.race([
      fetch('/api/auth/session', {
        credentials: 'same-origin',
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      ),
    ]);

    if (res.ok) {
      const data = await res.json();

      for (const role of Object.keys(state)) {
        state[role] = data[role] || null;
      }

      emit();
    }
  } catch {
    // Offline or slow server: start signed out.
  }
}

// Read CSRF token from the cookie.
// The authentication cookies themselves remain HttpOnly.
const csrf = () => {
  if (typeof document === 'undefined') return '';

  const match = document.cookie.match(
    /(?:^|; )ta_csrf=([^;]*)/
  );

  return match ? decodeURIComponent(match[1]) : '';
};

const pending = {};

function refresh(role) {
  if (!pending[role]) {
    pending[role] = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf(),
      },
      body: JSON.stringify({ role }),
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        delete pending[role];
      });
  }

  return pending[role];
}

/**
 * Fetch helper with cookies, CSRF protection
 * and one silent session renewal.
 */
export async function apiFetch(
  path,
  {
    role = null,
    method = 'GET',
    headers = {},
    body,
  } = {}
) {
  const run = () => {
    const requestHeaders = { ...headers };

    if (method !== 'GET' && method !== 'HEAD') {
      const token = csrf();

      if (token) {
        requestHeaders['X-CSRF-Token'] = token;
      }
    }

    return fetch(path, {
      method,
      headers: requestHeaders,
      body,
      credentials: 'same-origin',
    });
  };

  let res = await run();

  if (res.status === 401 && role) {
    const refreshed = await refresh(role);

    if (refreshed) {
      res = await run();
    }

    if (res.status === 401) {
      clearSession(role);
    }
  }

  return res;
}

/**
 * Main JSON API helper.
 */
export async function api(
  path,
  {
    method = 'GET',
    body,
    admin = false,
    candidate = false,
    recruiter = false,
    file,
    raw,
  } = {}
) {
  const role = admin
    ? 'admin'
    : candidate
      ? 'candidate'
      : recruiter
        ? 'recruiter'
        : null;

  const headers = {};
  let payload;

  if (file) {
    headers['Content-Type'] =
      file.type && /^image\//.test(file.type)
        ? file.type
        : 'application/pdf';

    payload = file;
  } else if (raw) {
    if (raw.type) {
      headers['Content-Type'] = raw.type;
    }

    payload = raw;
  } else if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;

  try {
    res = await apiFetch('/api' + path, {
      role,
      method,
      headers,
      body: payload,
    });
  } catch {
    throw Object.assign(
      new Error('Cannot reach the server. Check your connection.'),
      { status: 0 }
    );
  }

  let data = null;

  try {
    data = await res.json();
  } catch {
    // Empty or non-JSON response.
  }

  if (!res.ok) {
    throw Object.assign(
      new Error(data?.error || 'Request failed'),
      {
        status: res.status,
        details: data?.details,
        code: data?.code,
        data,
      }
    );
  }

  return data;
}

/**
 * Logout a user from the selected area.
 */
export async function logout(role) {
  try {
    await api('/auth/logout', {
      method: 'POST',
      body: { role },
    });
  } catch {
    // Sign out locally even if the request fails.
  }

  clearSession(role);
}

/**
 * Track a job event.
 */
export const track = (id, type) => {
  try {
    fetch(`/api/jobs/${id}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type }),
      keepalive: true,
    });
  } catch {
    // Ignore tracking errors.
  }
};

/**
 * Logged-in candidates only.
 * Records that they opened an employer link.
 */
export function markOpened(id) {
  if (!isCandidate()) return;

  try {
    apiFetch('/api/candidate/applications/opened', {
      role: 'candidate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_id: id }),
    }).catch(() => {});
  } catch {
    // Ignore tracking errors.
  }
}
