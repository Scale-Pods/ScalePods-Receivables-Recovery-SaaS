/**
 * Server-side relay for the assistant widget.
 *
 * Keeping the n8n call behind a same-origin `/api/ai-chat` endpoint means the
 * browser never depends on the webhook's CORS configuration and can reliably
 * read the reply text before rendering it in the chat card.
 */

const DEFAULT_CHAT_WEBHOOK_URL =
  'https://n8n.srv1711190.hstgr.cloud/webhook/8adb3b4b-d2f6-4976-bd6b-48aece71d865';

const PLACEHOLDER_REPLIES = new Set([
  'workflow was started',
  'workflow started',
  'ok',
  'success',
  'true',
  'received',
]);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

const URL_SCAN = /https?:\/\/[^\s"<>\\]+/gi;

/** Find every URL in any field of a webhook response, including nested ones. */
function collectUrls(value) {
  const found = [];

  const visit = (node) => {
    if (typeof node === 'string') {
      for (const match of node.matchAll(URL_SCAN)) {
        const url = match[0].replace(/[.,;:!?)\]]+$/, '');
        if (url && !found.includes(url)) found.push(url);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node && typeof node === 'object') {
      Object.values(node).forEach(visit);
    }
  };

  visit(value);
  return found;
}

/**
 * n8n "Respond to Webhook" may return plain text, a JSON object, an array of
 * objects, or nested fields such as `{ output: { text: "..." } }`. Normalize all
 * of those into a single display string.
 */
export function extractChatReply(raw) {
  if (raw === null || raw === undefined) return '';

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
      return extractChatReply(JSON.parse(trimmed));
    } catch {
      return PLACEHOLDER_REPLIES.has(trimmed.toLowerCase()) ? '' : trimmed;
    }
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const reply = extractChatReply(item);
      if (reply) return reply;
    }
    return '';
  }

  if (typeof raw === 'object') {
    const preferredKeys = [
      'reply',
      'output',
      'response',
      'answer',
      'chatOutput',
      'text',
      'message',
      'content',
      'result',
      'image',
      'image_url',
      'imageUrl',
      'images',
      'attachments',
      'url',
      'link',
      'data',
    ];

    const parts = [];
    for (const key of preferredKeys) {
      if (!(key in raw)) continue;
      const reply = extractChatReply(raw[key]);
      if (reply && !parts.includes(reply)) parts.push(reply);
    }

    const reply = parts.join('\n');
    // Surface Drive/file links even when the workflow's text says it can't
    // send the image directly.
    const extraUrls = collectUrls(raw)
      .filter((url) => !reply.includes(url))
      .slice(0, 5);

    return extraUrls.length
      ? `${reply}${reply ? '\n' : ''}${extraUrls.join('\n')}`
      : reply;
  }

  return '';
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Guard against accidentally large payloads.
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export default async function handler(req, res, env = process.env) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed. Use POST to send a chat message.' });
    return;
  }

  let payload;
  try {
    payload = JSON.parse((await readBody(req)) || '{}');
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body.' });
    return;
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message) {
    sendJson(res, 400, { error: 'A non-empty message is required.' });
    return;
  }

  const webhookUrl =
    env.AI_CHAT_WEBHOOK_URL ||
    env.VITE_AI_CHAT_WEBHOOK_URL ||
    DEFAULT_CHAT_WEBHOOK_URL;

  const history = Array.isArray(payload.history) ? payload.history.slice(-10) : [];
  const uid = [
    payload.customer_uid,
    payload.customerUid,
    payload.uid,
    payload.userId,
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find(Boolean) || '';

  const upstreamPayload = {
    message,
    chatInput: message,
    input: message,
    text: message,
    history,
    // Forward the user identity in every field name n8n workflows commonly use.
    customer_uid: uid,
    customerUid: uid,
    uid,
    userId: uid,
    sessionId:
      (typeof payload.sessionId === 'string' && payload.sessionId) ||
      `scalepods-web-chat:${uid || 'guest'}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(upstreamPayload),
    });

    const rawText = await upstream.text();
    const reply = extractChatReply(rawText);

    if (!upstream.ok) {
      sendJson(res, 502, {
        error: reply || `Assistant webhook returned ${upstream.status}.`,
      });
      return;
    }

    if (!reply) {
      sendJson(res, 200, { reply: '' });
      return;
    }

    sendJson(res, 200, { reply });
  } catch (error) {
    console.error('AI chat webhook relay failed:', error);
    sendJson(res, 502, {
      error: error?.message || 'Could not reach the assistant. Please try again.',
    });
  }
}
