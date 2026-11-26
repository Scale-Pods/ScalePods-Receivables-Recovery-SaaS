/**
 * Client helper for the floating assistant widget.
 * Uses the same-origin relay first (Vite dev middleware / Vercel function) and
 * falls back to a direct webhook call on hosts without the relay.
 */

import { STORAGE_KEY_USER, type UserAccount } from '@/types/auth';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_HISTORY_KEY_PREFIX = 'recovr_ai_chat_history_';
const MAX_STORED_TURNS = 50;

/** Resolve the signed-in user's UID from the same localStorage record the app uses. */
export function getCurrentUserUid(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    if (!stored) return '';
    const account = JSON.parse(stored) as UserAccount;
    const raw = account.customer_uid || account.uid || account.id || '';
    return String(raw);
  } catch {
    return '';
  }
}

function historyKey(uid: string): string {
  return `${CHAT_HISTORY_KEY_PREFIX}${uid || 'guest'}`;
}

/** Restore a user's saved conversation so sent text survives reloads. */
export function loadChatHistory(uid: string): ChatTurn[] {
  try {
    const stored = localStorage.getItem(historyKey(uid));
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (turn): turn is ChatTurn =>
          Boolean(
            turn &&
              typeof turn === 'object' &&
              (turn as ChatTurn).role !== undefined &&
              typeof (turn as ChatTurn).content === 'string',
          ),
      )
      .map((turn): ChatTurn => ({
        role: turn.role === 'assistant' ? 'assistant' : 'user',
        content: turn.content,
      }))
      .slice(-MAX_STORED_TURNS);
  } catch {
    return [];
  }
}

/** Persist sent/received text locally, scoped to the signed-in UID. */
export function saveChatHistory(uid: string, turns: ChatTurn[]): void {
  try {
    localStorage.setItem(
      historyKey(uid),
      JSON.stringify(turns.slice(-MAX_STORED_TURNS)),
    );
  } catch {
    // Storage can be disabled (private mode / quota); chat still works in memory.
  }
}

export function clearChatHistory(uid: string): void {
  try {
    localStorage.removeItem(historyKey(uid));
  } catch {
    // Ignore storage failures.
  }
}

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

/** Normalize the many response shapes an n8n webhook can return into one string. */
export function extractChatReply(raw: unknown): string {
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
    const record = raw as Record<string, unknown>;
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
      'data',
    ];

    for (const key of preferredKeys) {
      if (!(key in record)) continue;
      const reply = extractChatReply(record[key]);
      if (reply) return reply;
    }
  }

  return '';
}

export async function sendChatMessage(
  message: string,
  history: ChatTurn[] = [],
  signal?: AbortSignal,
  uid = '',
): Promise<string> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error('Please type a message first.');

  const resolvedUid = uid || getCurrentUserUid();
  const payload = {
    message: trimmed,
    chatInput: trimmed,
    input: trimmed,
    text: trimmed,
    history: history.slice(-10),
    // Send the UID under every common n8n field name so the workflow can pick
    // whichever one it expects.
    customer_uid: resolvedUid,
    customerUid: resolvedUid,
    uid: resolvedUid,
    userId: resolvedUid,
    sessionId: `scalepods-web-chat:${resolvedUid || 'guest'}`,
    timestamp: new Date().toISOString(),
  };

  // 1. Same-origin relay: avoids CORS issues and works in dev + Vercel.
  let relayError: Error | null = null;
  try {
    const proxyRes = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    const isJson = (proxyRes.headers.get('content-type') || '').includes('application/json');
    if (isJson) {
      const data = (await proxyRes.json()) as { reply?: unknown; error?: unknown };
      if (typeof data.reply === 'string') return data.reply;
      // The relay already reached the webhook, so surface its error instead of
      // firing a second request directly from the browser.
      if (typeof data.error === 'string' && data.error) {
        relayError = new Error(data.error);
      }
    }
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error;
    }
    // Relay unavailable (e.g. static host): try the webhook directly below.
  }
  if (relayError) throw relayError;

  // 2. Direct webhook fallback.
  const webhookUrl = import.meta.env.VITE_AI_CHAT_WEBHOOK_URL || DEFAULT_CHAT_WEBHOOK_URL;
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(
      extractChatReply(rawText) ||
        `The assistant is unavailable right now (${res.status}). Please try again.`,
    );
  }

  const reply = extractChatReply(rawText);
  if (!reply) {
    throw new Error("The assistant didn't return a readable reply. Please try again.");
  }

  return reply;
}
