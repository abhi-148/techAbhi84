import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Company logos: PNG / JPEG / WebP only (never SVG: it can carry script), <= 512 KB, content sniffed from the bytes,
// stored under a random name outside any static folder and served only through /api/jobs/:id/logo.
export const LOGO_DIR = path.resolve(process.env.LOGO_DIR || 'uploads/logos');
fs.mkdirSync(LOGO_DIR, { recursive: true });
export const MAX_LOGO_BYTES = 512 * 1024;
const TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

export function sniff(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}
export const logoMime = (name) => TYPES[String(name).split('.').pop()] || null;
export const safeLogoName = (name) => typeof name === 'string' && /^[a-f0-9]{32}\.(png|jpg|webp)$/.test(name);

/** Returns {name} or {error}. */
export function saveLogo(buf) {
  if (!Buffer.isBuffer(buf) || !buf.length) return { error: 'Send the image file as the request body (PNG, JPEG or WebP).' };
  if (buf.length > MAX_LOGO_BYTES) return { error: 'Logo must be 512 KB or smaller.' };
  const ext = sniff(buf);
  if (!ext) return { error: 'Logo must be a PNG, JPEG or WebP image.' };
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(LOGO_DIR, name), buf, { mode: 0o640 });
  return { name };
}
export const removeLogo = (name) => { if (safeLogoName(name)) fs.promises.unlink(path.join(LOGO_DIR, name)).catch(() => {}); };
