import type { ChatRequestBody, ChatTurn } from './types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedMessage?: string;
  sanitizedHistory?: ChatTurn[];
  piiWarning?: boolean;
}

const MAX_MESSAGE_LENGTH = 1500;
const MAX_HISTORY_ITEMS = 12;
const MAX_HISTORY_ITEM_LENGTH = 2000;

// Detect if user accidentally pastes sensitive PII (NID number / passport / password)
const SENSITIVE_PII_PATTERN = /\b\d{10,17}\b|password\s*[:=]|পাসওয়ার্ড/i;

export function validateChatInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid JSON request payload.' };
  }

  const payload = body as Partial<ChatRequestBody>;
  if (typeof payload.message !== 'string') {
    return { valid: false, error: 'Message field must be a string.' };
  }

  const cleaned = payload.message
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

  if (!cleaned) {
    return { valid: false, error: 'Please enter a question before sending.' };
  }

  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message is too long (maximum ${MAX_MESSAGE_LENGTH} characters).`,
    };
  }

  const sanitizedHistory: ChatTurn[] = [];
  if (Array.isArray(payload.history)) {
    for (const item of payload.history.slice(-MAX_HISTORY_ITEMS)) {
      if (
        item &&
        typeof item === 'object' &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string'
      ) {
        const cleanTurn = item.content
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
          .slice(0, MAX_HISTORY_ITEM_LENGTH);
        if (cleanTurn.trim()) {
          sanitizedHistory.push({ role: item.role, content: cleanTurn });
        }
      }
    }
  }

  return {
    valid: true,
    sanitizedMessage: cleaned,
    sanitizedHistory,
    piiWarning: SENSITIVE_PII_PATTERN.test(cleaned),
  };
}

interface RateBucket {
  timestamps: number[];
  recentMessages: Array<{ text: string; at: number }>;
}

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, RateBucket>();
  private readonly maxRequestsPerWindow: number;
  private readonly windowMs: number;
  private readonly maxDuplicateBursts: number;

  constructor(
    maxRequestsPerWindow = 20,
    windowMs = 60_000,
    maxDuplicateBursts = 4
  ) {
    this.maxRequestsPerWindow = maxRequestsPerWindow;
    this.windowMs = windowMs;
    this.maxDuplicateBursts = maxDuplicateBursts;
  }

  check(clientId: string, normalizedMessage?: string): { allowed: boolean; retryAfterSec?: number; reason?: string } {
    const now = Date.now();
    const bucket = this.buckets.get(clientId) || { timestamps: [], recentMessages: [] };

    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < this.windowMs);
    bucket.recentMessages = bucket.recentMessages.filter((m) => now - m.at < 20_000);

    if (bucket.timestamps.length >= this.maxRequestsPerWindow) {
      const oldest = bucket.timestamps[0];
      const retryAfterSec = Math.max(1, Math.ceil((this.windowMs - (now - oldest)) / 1000));
      return {
        allowed: false,
        retryAfterSec,
        reason: 'Too many requests in a short period. Please wait a few seconds and try again.',
      };
    }

    if (normalizedMessage) {
      const lower = normalizedMessage.toLowerCase();
      const sameCount = bucket.recentMessages.filter((m) => m.text === lower).length;
      if (sameCount >= this.maxDuplicateBursts) {
        return {
          allowed: false,
          retryAfterSec: 15,
          reason: 'Repeated identical requests detected. Please wait briefly before retrying.',
        };
      }
      bucket.recentMessages.push({ text: lower, at: now });
    }

    bucket.timestamps.push(now);
    this.buckets.set(clientId, bucket);

    // Opportunistic cleanup to keep memory bounded
    if (this.buckets.size > 2000) {
      for (const [key, val] of this.buckets.entries()) {
        if (val.timestamps.length === 0 || now - val.timestamps[val.timestamps.length - 1] > this.windowMs) {
          this.buckets.delete(key);
        }
      }
    }

    return { allowed: true };
  }
}

export function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true; // Same-origin or server-to-server requests without Origin header
  try {
    const parsed = new URL(origin);
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname.endsWith('.run.app') ||
      parsed.hostname.endsWith('.workers.dev')
    ) {
      return true;
    }
    return allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}
