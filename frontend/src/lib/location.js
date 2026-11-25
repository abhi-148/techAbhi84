import { useSyncExternalStore } from 'react';
import { api } from './api';

// The visitor's chosen place. Only a city/state NAME is remembered (in this browser); coordinates are used once to look the place up and are never stored.
const KEY = 'techabhi_location';
const subs = new Set();
let cached = null; let cachedRaw;
const read = () => {
  let raw = null; try { raw = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try { const v = JSON.parse(raw); cached = v && typeof v.mode === 'string' ? v : null; } catch { cached = null; }
  return cached;
};
const emit = () => subs.forEach((f) => f());
export const getLocation = read;
export function saveLocation(loc) { try { localStorage.setItem(KEY, JSON.stringify(loc)); } catch { /* ignore */ } emit(); }
export function resetLocation() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } emit(); }
export const useUserLocation = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, read);

export const PLACE_MODES = { 'all-india': 'All India', 'remote-india': 'Remote – India', 'remote-worldwide': 'Remote – Worldwide' };
export function locationLabel(loc) {
  if (!loc) return '';
  if (PLACE_MODES[loc.mode]) return PLACE_MODES[loc.mode];
  return [loc.city, loc.state].filter(Boolean).join(', ') || 'Your location';
}
/** Turns the saved place into API filters for pages that opt in. Never forces a location on someone who has not chosen one. */
export function locationFilters(loc, page) {
  if (!loc) return {};
  if (loc.mode === 'remote-india') return page === 'remote' ? { eligibility: 'india' } : {};
  if (loc.mode === 'remote-worldwide') return page === 'remote' ? { eligibility: 'worldwide' } : {};
  if (loc.mode === 'all-india' || page === 'remote') return {};
  const f = {}; if (loc.state) f.state = loc.state; if (loc.city) f.city = loc.city;
  return f;
}

/** Asks the browser for permission (only when called from a click), then asks our server which city those coordinates are in. */
export function detectLocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(Object.assign(new Error('This browser cannot share its location. Choose your city below.'), { code: 'unsupported' }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try { const d = await api('/locations/reverse', { method: 'POST', body: { lat: pos.coords.latitude, lng: pos.coords.longitude } }); resolve(d.location); }
        catch (e) { reject(Object.assign(new Error(e.message), { code: 'lookup' })); }
      },
      (err) => reject(Object.assign(new Error(err.code === 1 ? 'Location permission was declined. You can pick your city below instead.' : 'We could not get your location. Choose your city below.'), { code: err.code === 1 ? 'denied' : 'failed' })),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  });
}
