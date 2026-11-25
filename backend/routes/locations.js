import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { INDIA_REGIONS, canonicalState, NOT_A_PLACE } from '../utils/geo.js';

// Location helpers. Coordinates are used for ONE request (reverse geocoding) and are never stored or logged.
const r = Router();
const LIVE_SQL = "status='published' AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())";
const esc = (s) => String(s).slice(0, 80).replace(/[%_\\]/g, '\\$&');

export const geocoderConfigured = () => String(process.env.GEOCODER_DISABLED || '').toLowerCase() !== 'true';
const base = () => (process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
// The public OpenStreetMap server asks for at most 1 request per second and an identifying User-Agent.
// For real traffic point GEOCODER_URL at your own Nominatim or a Nominatim-compatible provider (e.g. LocationIQ + GEOCODER_API_KEY).
let chain = Promise.resolve(); let lastCall = 0;
const gap = () => (base().includes('nominatim.openstreetmap.org') ? 1100 : 0);
function throttled(fn) {
  const run = chain.then(async () => { const wait = lastCall + gap() - Date.now(); if (wait > 0) await new Promise((x) => setTimeout(x, wait)); lastCall = Date.now(); return fn(); });
  chain = run.catch(() => {});
  return run;
}
const cache = new Map();   // rounded coordinates -> {at, value}; ~1 km cells, 24 h, max 500 entries
async function geocode(path, params) {
  const u = new URL(base() + path);
  for (const [k, v] of Object.entries({ format: 'jsonv2', 'accept-language': 'en', ...params })) u.searchParams.set(k, v);
  if (process.env.GEOCODER_API_KEY) u.searchParams.set('key', process.env.GEOCODER_API_KEY);
  const res = await fetch(u, { headers: { 'User-Agent': process.env.GEOCODER_USER_AGENT || 'TechAbhi/1.0 (job portal; contact via site)' }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw Object.assign(new Error('geocoder'), { status: 502 });
  return res.json();
}
const place = (a = {}) => {
  const city = a.city || a.town || a.village || a.municipality || a.suburb || a.county || a.state_district || null;
  const state = canonicalState(a.state) || a.state || null;
  return { city: city && !NOT_A_PLACE.test(city) ? city : null, state, country: a.country || null, country_code: (a.country_code || '').toUpperCase() || null };
};

r.get('/states', async (req, res) => {
  const [rows] = await pool.query(`SELECT state name, COUNT(*) n FROM jobs WHERE ${LIVE_SQL} AND state IS NOT NULL GROUP BY state`);
  const n = new Map(rows.map((x) => [x.name, Number(x.n)]));
  res.json({ states: INDIA_REGIONS.map((s) => ({ ...s, jobs: n.get(s.name) || 0 })) });
});

// Cities come from the jobs that exist, so any city an employer posts in becomes searchable. Nothing is hardcoded.
r.get('/cities', async (req, res) => {
  const q = String(req.query.q || '').trim(); const state = canonicalState(req.query.state) || String(req.query.state || '').trim();
  const where = [LIVE_SQL, 'city IS NOT NULL']; const p = [];
  if (q) { where.push('city LIKE ?'); p.push(`${esc(q)}%`); }
  if (state) { where.push('state = ?'); p.push(state); }
  const [rows] = await pool.query(`SELECT city, state, COUNT(*) n FROM jobs WHERE ${where.join(' AND ')} GROUP BY city, state ORDER BY n DESC, city ASC LIMIT ?`, [...p, Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 50)]);
  res.json({ cities: rows.map((c) => ({ city: c.city, state: c.state, jobs: Number(c.n) })) });
});

// Place lookup for people choosing where they live: cities from live jobs first, then the geocoder (India only).
r.get('/search', rateLimit({ windowMs: 60 * 1000, max: 30 }), async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q.length < 2) return res.json({ places: [] });
  const [rows] = await pool.query(`SELECT city, state, COUNT(*) n FROM jobs WHERE ${LIVE_SQL} AND city LIKE ? GROUP BY city, state ORDER BY n DESC LIMIT 8`, [`${esc(q)}%`]);
  const places = rows.map((c) => ({ city: c.city, state: c.state, jobs: Number(c.n), source: 'jobs' }));
  if (q.length >= 3 && geocoderConfigured() && places.length < 5) {
    try {
      const hits = await throttled(() => geocode('/search', { q, countrycodes: 'in', addressdetails: '1', limit: '6', featuretype: 'settlement' }));
      for (const h of Array.isArray(hits) ? hits : []) {
        const pl = place(h.address); if (!pl.city || pl.country_code !== 'IN') continue;
        if (!places.some((x) => x.city.toLowerCase() === pl.city.toLowerCase() && x.state === pl.state)) places.push({ city: pl.city, state: pl.state, jobs: 0, source: 'map' });
      }
    } catch { /* the job-based results are still returned */ }
  }
  res.json({ places: places.slice(0, 10) });
});

r.post('/reverse', rateLimit({ windowMs: 60 * 1000, max: 20 }), async (req, res) => {
  if (!geocoderConfigured()) return res.status(503).json({ error: 'Automatic location lookup is turned off. Choose your city manually.', code: 'GEOCODER_DISABLED' });
  const lat = Number(req.body?.lat); const lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ error: 'Invalid coordinates.' });
  const la = lat.toFixed(2); const lo = lng.toFixed(2);   // ~1 km: enough for a city, too coarse to locate a person
  const key = `${la},${lo}`; const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 864e5) return res.json({ location: hit.value });
  let data;
  try { data = await throttled(() => geocode('/reverse', { lat: la, lon: lo, zoom: '10', addressdetails: '1' })); }
  catch { return res.status(502).json({ error: 'We could not look up your location right now. Choose your city manually.', code: 'GEOCODER_UNAVAILABLE' }); }
  const value = place(data?.address);
  if (!value.city && !value.state) return res.status(404).json({ error: 'We could not tell which city that is. Choose your city manually.' });
  if (cache.size >= 500) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value });
  res.json({ location: value });
});

export default r;
