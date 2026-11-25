// Optional real-browser check (not part of `npm test`). Needs: a running API+built frontend, the SMTP sink (backend/tests/smtp-sink.mjs),
// and `npm i puppeteer-core @sparticuz/chromium` (or point CHROME_PATH at any Chrome/Chromium).
//   BASE=http://localhost:4020 SINK=http://127.0.0.1:4121 node e2e/browser-check.mjs
import puppeteer from 'puppeteer-core'; import chromium from '@sparticuz/chromium'; import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:4020'; const SINK = process.env.SINK || 'http://127.0.0.1:4121'; const OUT = process.env.OUT || '/tmp/shots';
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0; const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + x)); };
const exe = process.env.CHROME_PATH || await chromium.executablePath();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const issues = []; 
async function open(width, height = 900) {
  // one browser per scenario keeps cookies/storage fully isolated
  const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage'], executablePath: exe, headless: 'shell' });
  const ctx = { close: () => browser.close(), overridePermissions: (o, p) => browser.defaultBrowserContext().overridePermissions(o, p) }; const page = await browser.newPage(); await page.setViewport({ width, height, deviceScaleFactor: 1 });
  page.on('console', (m) => { /* 4xx answers are expected API behaviour (e.g. a deliberately wrong code); 5xx are caught below */ if (m.type() === 'error' && !/status of 4\d\d/.test(m.text())) issues.push(`console: ${m.text()} @ ${page.url()}`); });
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message} @ ${page.url()}`));
  page.on('requestfailed', (r) => issues.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 500) issues.push(`HTTP ${r.status()} ${r.url()}`); });
  return { ctx, page };
}
const PAGES = ['/', '/jobs', '/walk-in-drive', '/remote-jobs', '/all-india-jobs', '/internships', '/fresher-jobs', '/companies', '/career-resources', '/resume-services', '/about', '/contact', '/privacy', '/terms', '/candidate/login', '/candidate/register', '/recruiter/login', '/recruiter/register', '/forgot-password', '/admin/login'];
const WIDTHS = [320, 375, 425, 768, 1024, 1440];

// ---- layout at every width ----
for (const w of WIDTHS) {
  const { ctx, page } = await open(w);
  const bad = [];
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 30000 });
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, small: [...document.querySelectorAll('body *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12.5 && getComputedStyle(e).display !== 'none').slice(0, 3).map((e) => e.textContent.trim().slice(0, 30)) }));
    if (m.sw > m.iw + 1) bad.push(`${p}: scrollWidth ${m.sw} > ${m.iw}`); if (m.small.length) bad.push(`${p}: tiny text ${JSON.stringify(m.small)}`);
    if (['/', '/walk-in-drive', '/remote-jobs'].includes(p) && [320, 768, 1440].includes(w)) await page.screenshot({ path: `${OUT}/${w}-${p.replace(/\W/g, '') || 'home'}.png` });
  }
  ok(`${w}px: no horizontal overflow and no text under 12.5px on ${PAGES.length} pages`, bad.length === 0, bad.join(' | '));
  await ctx.close();
}

// ---- mobile navigation ----
{
  const { ctx, page } = await open(375); await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  const btn = await page.$('button[aria-label*="menu" i]'); ok('mobile: menu button exists', !!btn);
  await btn.click(); await sleep(300);
  const links = await page.$$eval('a', (as) => as.filter((a) => a.offsetParent).map((a) => a.getAttribute('href')));
  ok('mobile menu exposes walk-in, remote, all-India, jobs', ['/walk-in-drive', '/remote-jobs', '/all-india-jobs', '/jobs'].every((h) => links.includes(h)));
  await page.screenshot({ path: `${OUT}/375-menu.png` });
  await page.keyboard.press('Escape'); await sleep(200);
  await ctx.close();
}

// ---- no horizontal-scroll killers on tablet filter drawer, and keyboard focus visible ----
{
  const { ctx, page } = await open(375); await page.goto(BASE + '/walk-in-drive', { waitUntil: 'networkidle0' });
  const cards = await page.$$eval('article', (a) => a.length); ok('walk-in page shows seeded drives', cards >= 2, String(cards));
  const f = await page.$$eval('button', (bs) => bs.find((b) => /^Filters/.test(b.textContent.trim()))?.click() ?? 'none'); await sleep(300);
  ok('mobile filter drawer opens', await page.$('[role=dialog][aria-label=Filters]') !== null);
  await page.screenshot({ path: `${OUT}/375-filters.png` });
  const tiny = await page.$$eval('[role=dialog] button, [role=dialog] select, [role=dialog] input', (els) => els.filter((e) => e.offsetParent && Math.max(e.getBoundingClientRect().height, e.closest('label')?.getBoundingClientRect().height || 0) < 36).length); ok('filter drawer touch targets >= 36px tall', tiny === 0, String(tiny));
  await ctx.close();
}

// ---- URL-synced filtering on real data ----
{
  const { ctx, page } = await open(1440); await page.goto(BASE + '/remote-jobs', { waitUntil: 'networkidle0' });
  const total = async () => page.$$eval('article', (a) => a.length);
  const all = await total(); ok('remote page lists only remote jobs', all >= 2 && await page.$$eval('article', (a) => a.every((x) => /Remote/.test(x.textContent))), String(all));
  ok('no remote card shows an office city', await page.$$eval('article', (a) => a.every((x) => !/Ahmedabad|Pune|Bengaluru/.test(x.textContent))));
  await page.goto(BASE + '/remote-jobs?remote_region=usa', { waitUntil: 'networkidle0' }); const usa = await total(); ok('remote_region=usa filters real data', usa >= 1 && usa < all, `${usa}/${all}`);
  await page.goto(BASE + '/all-india-jobs?state=Gujarat', { waitUntil: 'networkidle0' }); ok('All India: state filter in URL restores on load', (await total()) >= 1 && (await page.$$eval('article', (a) => a.every((x) => /Gujarat|Ahmedabad|Surat|Remote/.test(x.textContent)))));
  const chip = await page.$$eval('ul[aria-label="Active filters"] button', (b) => b.map((x) => x.textContent)); ok('active filter chips shown', chip.some((c) => /Gujarat/.test(c)), JSON.stringify(chip));
  await page.goto(BASE + '/walk-in-drive?drive=today', { waitUntil: 'networkidle0' }); ok('walk-in "today" tab from URL', (await total()) >= 1);
  await page.goto(BASE + '/jobs?q=zzzzzz-nothing', { waitUntil: 'networkidle0' }); ok('no-results state with suggestions', /No jobs match/.test(await page.content()));
  await page.goto(BASE + '/jobs?page=1', { waitUntil: 'networkidle0' });
  const suggest = await page.$('input[role=combobox]'); await suggest.type('rea'); await sleep(900); ok('search suggestions appear', (await page.$$('[role=option]')).length > 0);
  await ctx.close();
}

// ---- location: permission only on click, reverse geocode, manual fallback, reset ----
{
  const { ctx, page } = await open(1440); await ctx.overridePermissions(BASE, ['geolocation']); await page.setGeolocation({ latitude: 23.0225, longitude: 72.5714 });
  const asked = []; await page.evaluateOnNewDocument(() => { const g = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation); navigator.geolocation.getCurrentPosition = (...a) => { window.__geoAsked = true; return g(...a); }; });
  await page.goto(BASE + '/all-india-jobs', { waitUntil: 'networkidle0' });
  ok('location is NOT requested on page load', !(await page.evaluate(() => window.__geoAsked)));
  await page.$$eval('button', (b) => b.find((x) => /Set location/.test(x.textContent))?.click()); await sleep(400);
  await page.$$eval('button', (b) => b.find((x) => /Use my current location/.test(x.textContent))?.click()); await sleep(2500);
  ok('location requested only after the click', await page.evaluate(() => window.__geoAsked));
  const stored = await page.evaluate(() => localStorage.getItem('techabhi_location')); ok('city saved, coordinates not stored', /Ahmedabad/.test(stored) && !/23\.0|72\.5/.test(stored), stored);
  await sleep(800); ok('jobs now filtered by detected city', /Location: Ahmedabad/.test(await page.content()));
  await page.screenshot({ path: `${OUT}/1440-located.png` });
  await page.$$eval('button', (b) => b.find((x) => /Ahmedabad/.test(x.textContent) && x.getAttribute('aria-haspopup'))?.click()); await sleep(400);
  await page.$$eval('button', (b) => b.find((x) => /Reset location/.test(x.textContent))?.click()); await sleep(300);
  ok('reset removes the saved location', (await page.evaluate(() => localStorage.getItem('techabhi_location'))) === null);
  await ctx.close();
}
{
  const { ctx, page } = await open(1440); await ctx.overridePermissions(BASE, []);
  await page.goto(BASE + '/jobs', { waitUntil: 'networkidle0' });
  await page.$$eval('button', (b) => b.find((x) => /Set location/.test(x.textContent))?.click()); await sleep(400);
  await page.$$eval('button', (b) => b.find((x) => /Use my current location/.test(x.textContent))?.click()); await sleep(1500);
  const t = await page.content(); ok('permission denied: clear message, nothing forced', /declined|could not get your location/i.test(t) && (await page.evaluate(() => localStorage.getItem('techabhi_location'))) === null);
  await ctx.close();
}

// ---- real sign-up with emailed OTP, cookie flags, no token in storage, logout ----
{
  const { ctx, page } = await open(1024); const email = `e2e${Date.now()}@example.com`;
  await page.goto(BASE + '/candidate/register', { waitUntil: 'networkidle0' });
  await page.type('input[autocomplete="name"], input[name="full_name"]', 'E2E Tester').catch(() => {});
  const inputs = await page.$$('input'); const names = await Promise.all(inputs.map((i) => i.evaluate((e) => e.type + ':' + (e.name || e.id))));
  await page.type('input[type=email]', email); const pw = await page.$$('input[type=password], input[autocomplete="new-password"]');
  await pw[0].type('Tech-Abhi-2026x'); await pw[1].type('Tech-Abhi-2026x');
  const nameInput = await page.$('input[name="full_name"], #candidate-full_name, input[autocomplete="name"]'); if (nameInput) await nameInput.type('E2E Tester');
  await page.$$eval('button[type=submit]', (b) => b[0].click()); await page.waitForFunction(() => /Verify your email/.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
  ok('register leads to the OTP screen (no session yet)', /Verify your email/.test(await page.content()), names.join(','));
  const code = await (async () => { for (let i = 0; i < 20; i++) { const j = await (await fetch(`${SINK}/otp?to=${email}`)).json(); if (j.code) return j.code; await sleep(300); } })();
  ok('the code arrived by email', /^\d{6}$/.test(code || ''));
  await page.type('#otp-code', '000000'); await page.click('button[type=submit]'); await sleep(900);
  ok('wrong code shows remaining tries', /tries left|try left/.test(await page.content()));
  await page.$eval('#otp-code', (e) => { e.value = ''; }); await page.type('#otp-code', code); await page.click('button[type=submit]');
  await page.waitForFunction(() => location.pathname.startsWith('/candidate/'), { timeout: 15000 }).catch(() => {});
  ok('correct code signs the person in', location_ok(await page.url()), await page.url());
  const cdp = await page.createCDPSession(); const { cookies } = await cdp.send('Network.getAllCookies');
  const at = cookies.find((c) => c.name === 'ta_at_candidate'); const rt = cookies.find((c) => c.name === 'ta_rt_candidate'); const cs = cookies.find((c) => c.name === 'ta_csrf');
  ok('session cookies are HttpOnly + SameSite=Strict', at?.httpOnly && rt?.httpOnly && at?.sameSite === 'Strict' && rt?.sameSite === 'Strict', JSON.stringify([at, rt]));
  ok('JavaScript cannot read the session cookies', !(await page.evaluate(() => document.cookie)).includes('ta_at_') && !(await page.evaluate(() => document.cookie)).includes('ta_rt_'));
  ok('CSRF cookie is readable (double-submit)', cs && !cs.httpOnly);
  const store = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })); ok('no tokens in localStorage / sessionStorage', !/token|eyJ/i.test(store), store.slice(0, 200));
  await page.screenshot({ path: `${OUT}/1024-dashboard.png` });
  await page.reload({ waitUntil: 'networkidle0' }); ok('session survives a reload (cookie-based)', location_ok(await page.url()));
  // logout from the UI
  await page.$$eval('button', (b) => b.find((x) => /log ?out|sign out/i.test(x.textContent))?.click()); await sleep(1500);
  const after = await page.evaluate(async () => (await (await fetch('/api/auth/session')).json()).candidate); ok('logout ends the server session', after === null, JSON.stringify(after));
  await ctx.close();
}
function location_ok(u) { return /\/candidate\//.test(u); }

console.log('\n--- console / network issues ---'); const uniq = [...new Set(issues)]; console.log(uniq.length ? uniq.join('\n') : 'none');
ok('no console errors, page errors, failed requests or 5xx responses', uniq.length === 0);
console.log(`\n${pass} passed, ${fail} failed`);
