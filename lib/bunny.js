// BunnyCDN Storage helpers. Images are stored in a Bunny storage zone and
// served publicly through the linked Pull Zone (CDN).
import crypto from 'crypto';

const ZONE = process.env.BUNNY_STORAGE_ZONE;
const HOST = process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com';
const KEY = process.env.BUNNY_ACCESS_KEY;
const CDN = (process.env.BUNNY_CDN_URL || '').replace(/\/$/, '');

export function bunnyConfigured() {
  return Boolean(ZONE && KEY && CDN);
}

function extFor(filename, contentType) {
  const fromName = (filename || '').split('.').pop();
  if (fromName && fromName.length <= 5 && /^[a-z0-9]+$/i.test(fromName)) {
    return fromName.toLowerCase();
  }
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
  };
  return map[contentType] || 'bin';
}

// Uploads a buffer and returns { path, url }.
export async function uploadToBunny(buffer, { filename, contentType } = {}) {
  if (!bunnyConfigured()) {
    throw new Error('BunnyCDN nav nokonfigurēts (BUNNY_* mainīgie)');
  }
  const ext = extFor(filename, contentType);
  const path = `slides/${crypto.randomUUID()}.${ext}`;
  const res = await fetch(`https://${HOST}/${ZONE}/${path}`, {
    method: 'PUT',
    headers: {
      AccessKey: KEY,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bunny upload neizdevās: ${res.status} ${text}`);
  }
  return { path, url: `${CDN}/${path}` };
}

// Deletes a stored object by its path (e.g. "slides/uuid.png"). 404 is ignored.
export async function deleteFromBunny(path) {
  if (!bunnyConfigured() || !path) return;
  const res = await fetch(`https://${HOST}/${ZONE}/${path}`, {
    method: 'DELETE',
    headers: { AccessKey: KEY },
  });
  if (!res.ok && res.status !== 404) {
    console.error(`Bunny delete neizdevās: ${res.status}`);
  }
}
