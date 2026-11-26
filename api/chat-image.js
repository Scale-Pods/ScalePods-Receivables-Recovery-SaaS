/**
 * Same-origin image relay for Google Drive reference links.
 *
 * Drive's public download endpoint sets `Cross-Origin-Resource-Policy:
 * same-site`, so embedding it directly from the app can fail and leave the
 * browser showing the image's alt text instead of the picture. Fetching the
 * bytes here and streaming them from `/api/chat-image` keeps the request
 * same-origin, so the reference image renders reliably in the chat bubble.
 */

const DRIVE_HOSTS = new Set([
  'drive.google.com',
  'drive.usercontent.google.com',
  'driveusercontent.google.com',
]);

const FILE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function sendText(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(message);
}

/** Accept a bare Drive ID or any Drive share/download URL and return the ID. */
export function parseDriveFileId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (FILE_ID_PATTERN.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (!DRIVE_HOSTS.has(host) && !host.endsWith('.drive.google.com')) {
      return null;
    }

    const fromPath = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
    const fromQuery = parsed.searchParams.get('id');
    const candidate = fromPath || fromQuery || '';
    return FILE_ID_PATTERN.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function driveDownloadUrl(fileId) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=view&authuser=0`;
}

function readQuery(req) {
  const rawUrl = req.url || '/';
  try {
    return new URL(rawUrl, 'http://localhost').searchParams;
  } catch {
    return new URLSearchParams();
  }
}

/** GET /api/chat-image?id=<drive-file-id> */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendText(res, 405, 'Method not allowed. Use GET to load an image.');
    return;
  }

  const query = readQuery(req);
  const fileId = parseDriveFileId(
    query.get('id') || query.get('url') || query.get('fileId') || '',
  );

  if (!fileId) {
    sendText(res, 400, 'A valid Google Drive file id is required.');
    return;
  }

  try {
    const upstream = await fetch(driveDownloadUrl(fileId), {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; ScalePodsChatImage/1.0)',
      },
    });

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    if (!upstream.ok || !contentType.startsWith('image/')) {
      sendText(
        res,
        502,
        'The Drive file could not be loaded as an image. Open it in Drive to view it.',
      );
      return;
    }

    const declaredLength = Number(upstream.headers.get('content-length') || 0);
    if (declaredLength > MAX_IMAGE_BYTES) {
      sendText(res, 413, 'The reference image is too large to display in chat.');
      return;
    }

    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      sendText(res, 413, 'The reference image is too large to display in chat.');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(bytes.byteLength));
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(bytes);
  } catch (error) {
    console.error('Chat image relay failed:', error);
    sendText(res, 502, 'Could not load the reference image right now.');
  }
}
