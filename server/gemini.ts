import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { ChatTurn } from './types';

export type GeminiErrorCode =
  | 'MISSING_API_KEY'
  | 'API_KEY_INVALID'
  | 'QUOTA_EXCEEDED'
  | 'TIMEOUT'
  | 'UPSTREAM_ERROR';

export class GeminiServiceError extends Error {
  readonly code: GeminiErrorCode;
  readonly statusCode: number;

  constructor(code: GeminiErrorCode, message: string, statusCode = 502) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

const REQUEST_TIMEOUT_MS = 45_000;
const MODEL_NAME = 'gemini-4-hydrogen';

function classifyGeminiError(err: unknown): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('timeout') || lower.includes('aborted')) {
    return new GeminiServiceError(
      'TIMEOUT',
      'The AI service took too long to respond. Please try again shortly.',
      504
    );
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return new GeminiServiceError(
      'QUOTA_EXCEEDED',
      'AI service quota is currently reached. Please try again later or contact the Admission Office at 09640 888272.',
      429
    );
  }
  if (
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('403') ||
    lower.includes('401') ||
    lower.includes('api key')
  ) {
    return new GeminiServiceError(
      'API_KEY_INVALID',
      'AI service credentials could not be verified. Please verify GEMINI_API_KEY configuration.',
      503
    );
  }
  return new GeminiServiceError(
    'UPSTREAM_ERROR',
    'Unable to reach the AI response engine right now. Please try again or contact the Admission Office.',
    502
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateGroundedReply(params: {
  apiKey: string | undefined;
  systemInstruction: string;
  userMessage: string;
  history: ChatTurn[];
}): Promise<string> {
  const { apiKey, systemInstruction, userMessage, history } = params;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiServiceError(
      'MISSING_API_KEY',
      'GEMINI_API_KEY is not configured on the server. Please add a valid key in Settings > Secrets.',
      503
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const conversationContents = [
    ...history.map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    })),
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT_MS)
      );

      const apiPromise = ai.models.generateContent({
        model: MODEL_NAME,
        contents: conversationContents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const response = await Promise.race([apiPromise, timeoutPromise]);
      const text = response.text?.trim();
      if (!text) {
        throw new Error('Empty response from Gemini model');
      }
      return text;
    } catch (err) {
      lastError = err;
      console.error(`[Gemini attempt ${attempt + 1} error]:`, err instanceof Error ? err.message : err);
      const classified = classifyGeminiError(err);
      // Do not retry auth or quota errors
      if (
        classified.code === 'API_KEY_INVALID' ||
        classified.code === 'QUOTA_EXCEEDED' ||
        classified.code === 'MISSING_API_KEY'
      ) {
        throw classified;
      }
      if (attempt === 0) {
        await sleep(600);
      }
    }
  }

  throw classifyGeminiError(lastError);
}
