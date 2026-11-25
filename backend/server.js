import 'dotenv/config';
import 'express-async-errors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import adminJobs from './routes/adminJobs.js';
import candidateRoutes from './routes/candidate.js';
import recruiterRoutes from './routes/recruiter.js';
import adminRecruiters from './routes/adminRecruiters.js';
import assistance from './routes/assistance.js';
import { requireCandidate, requireAdmin, requireRecruiter } from './middleware/auth.js';
import publicJobs, { getPublicJob } from './routes/publicJobs.js';
import authRoutes from './routes/auth.js';
import { candidateAccount, recruiterAccount, adminDirectory } from './routes/account.js';
import { jobHead, sitemap, robots, pageHead } from './routes/seo.js';
import locationRoutes from './routes/locations.js';
import { publicSite, adminCms } from './routes/site.js';
import { csrfGuard } from './middleware/csrf.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /^change-me/i.test(process.env.JWT_SECRET)) { console.error('JWT_SECRET must be set to a random value of 32+ characters (not the .env.example placeholder). Generate one: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'); process.exit(1); }
if (!process.env.DB_NAME) { console.error('DB_NAME missing'); process.exit(1); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { useDefaults: false, directives: {
  'default-src': ["'self'"], 'script-src': ["'self'"], 'style-src': ["'self'"], 'style-src-attr': ["'unsafe-inline'"],
  'img-src': ["'self'", 'data:'], 'font-src': ["'self'"], 'connect-src': ["'self'"], 'object-src': ["'none'"],
  'base-uri': ["'self'"], 'form-action': ["'self'"], 'frame-ancestors': ["'none'"] } } }));
app.use((req, res, next) => {   // geolocation is allowed for this site only (the "use my location" button); everything else sensitive is off
  res.set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(), payment=()');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors({ origin: (process.env.CORS_ORIGIN || '').split(',').filter(Boolean), credentials: true }));
app.use('/api', (req, res, next) => { res.set('Cache-Control', req.method === 'GET' && /^\/(jobs|site|locations)/.test(req.path) ? res.get('Cache-Control') || 'no-cache' : 'no-store'); next(); });
app.use(express.json({ limit: '200kb' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300 }));
app.use('/api', csrfGuard);

app.use('/api/admin/cms', adminCms);
app.use('/api/admin/directory', requireAdmin, adminDirectory);   // read-only candidate/application directories (own path so /api/admin/login stays public)
app.use('/api/admin', adminJobs);
app.use('/api/admin', adminRecruiters);
app.use('/api/recruiter/account', requireRecruiter, recruiterAccount);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/candidate/assistance', requireCandidate, assistance.candidateRouter);
app.use('/api/admin/assistance', requireAdmin, assistance.adminRouter);
app.use('/api/auth', authRoutes);
app.use('/api/jobs', publicJobs);
app.use('/api/locations', locationRoutes);
app.use('/api/site', publicSite);
app.use('/api/candidate/account', requireCandidate, candidateAccount);
app.use('/api/candidate', candidateRoutes);
app.get('/sitemap.xml', (q, s, n) => sitemap(q, s).catch(n));
app.get('/robots.txt', robots);
app.get('/api/health', (q, s) => s.json({ ok: true }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));   // unknown API paths must not fall through to the SPA

// Serve the built frontend with per-job SEO tags injected (production)
const dist = path.resolve(__dirname, '../frontend/dist');
const indexFile = path.join(dist, 'index.html');
if (fs.existsSync(indexFile)) {
  // Cached in production; re-read per request in development so a fresh `npm run build` is picked up without a restart.
  const cachedTpl = fs.readFileSync(indexFile, 'utf8');
  const getTpl = () => (process.env.NODE_ENV === 'production' ? cachedTpl : fs.readFileSync(indexFile, 'utf8'));
  app.use(express.static(dist, { index: false }));
  app.get('/jobs/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { state, job } = id ? await getPublicJob(id) : { state: 'missing' };
      if (state === 'ok') {
        // drop the template's generic <title>/description so the page has exactly one of each
        const base = getTpl().replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta\s+name="description"[^>]*>/i, '');
        return res.send(base.replace('<!--SEO_HEAD-->', jobHead(job)));
      }
      res.status(state === 'closed' ? 410 : 404).send(getTpl().replace('<!--SEO_HEAD-->', '<meta name="robots" content="noindex">'));
    } catch (e) { next(e); }
  });
  app.get('*', (req, res) => {
    // Known public pages get their own title/description/canonical; private areas are noindex.
    // The template's generic <title>/<description> are dropped only when a specific head replaces them.
    const head = pageHead(req.path);
    if (head.includes('<title>')) {
      const base = getTpl().replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta\s+name="description"[^>]*>/i, '');
      return res.send(base.replace('<!--SEO_HEAD-->', head));
    }
    res.send(getTpl().replace('<!--SEO_HEAD-->', head));
  });
}

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: 'Bad request' });
  console.error('Unhandled error:', err.code || err.name, String(err.message).slice(0, 120));   // never log SQL, tokens or request bodies
  res.status(500).json({ error: 'Something went wrong' });
});

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e?.code || e?.name, String(e?.message).slice(0, 120)));
app.listen(process.env.PORT || 4000, () => console.log('TechAbhi API on :' + (process.env.PORT || 4000)));
