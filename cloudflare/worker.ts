import admissionRequirements from '../data/admission_requirements.json';
import contact from '../data/contact.json';
import departments from '../data/departments.json';
import faq from '../data/faq.json';
import graduatePrograms from '../data/graduate_programs.json';
import scholarshipPolicy from '../data/scholarship_policy.json';
import tuitionFees from '../data/tuition_fees.json';
import undergraduatePrograms from '../data/undergraduate_programs.json';
import universityData from '../data/university_data.json';
import spring2027Dataset from '../public/assets/aistudio/uttara_university_admission_fees_spring_2027_bb0329e0.json';
// @ts-expect-error Bundled as Text via wrangler.toml [[rules]]
import leadershipCsv from '../public/assets/aistudio/uttara_university_photo_enabled_leadership_directory_2026-11-22_b18e136d.csv';
// @ts-expect-error Bundled as Text via wrangler.toml [[rules]]
import leadershipUpdatedCsv from '../public/assets/aistudio/uttara_university_photo_enabled_leadership_directory_updated_2026-11-22_6b97897b.csv';
import { GeminiServiceError } from '../server/gemini';
import { KnowledgeRepository, type KnowledgeBundle } from '../server/knowledge-base';
import { mergeLeadershipLists, parseLeadershipCsv } from '../server/leadership-loader';
import { handleChatRequest } from '../server/response-handler';
import { isAllowedOrigin, SlidingWindowRateLimiter, validateChatInput } from '../server/security';
import type { KnowledgeRecord, Spring2027Dataset } from '../server/types';

export interface Env {
  GEMINI_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

const bundle: KnowledgeBundle = {
  universityData: universityData as KnowledgeRecord[],
  undergraduatePrograms: undergraduatePrograms as KnowledgeRecord[],
  graduatePrograms: graduatePrograms as KnowledgeRecord[],
  admissionRequirements: admissionRequirements as KnowledgeRecord[],
  tuitionFees: tuitionFees as KnowledgeRecord[],
  scholarshipPolicy: scholarshipPolicy as KnowledgeRecord[],
  departments: departments as KnowledgeRecord[],
  faq: faq as KnowledgeRecord[],
  contact: contact as KnowledgeRecord[],
  spring2027Dataset: spring2027Dataset as unknown as Spring2027Dataset,
  leadershipDirectory: mergeLeadershipLists(
    parseLeadershipCsv(String(leadershipCsv)),
    parseLeadershipCsv(String(leadershipUpdatedCsv))
  ),
};

const repo = new KnowledgeRepository(bundle);
const rateLimiter = new SlidingWindowRateLimiter(20, 60_000, 4);

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || undefined;
    const allowedOrigins = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (url.pathname.startsWith('/api/')) {
      if (origin && !isAllowedOrigin(origin, allowedOrigins)) {
        return jsonResponse({ error: 'Origin not allowed.' }, 403);
      }

      const corsHeaders: Record<string, string> = origin
        ? {
            'Access-Control-Allow-Origin': origin,
            Vary: 'Origin',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        : {};

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      if (url.pathname === '/api/health' && request.method === 'GET') {
        return jsonResponse(
          {
            status: 'ok',
            service: 'Uttara University AI Admission Assistant (Cloudflare Workers)',
            knowledgeRecords: repo.getVerificationSummary(),
          },
          200,
          corsHeaders
        );
      }

      if (url.pathname === '/api/knowledge' && request.method === 'GET') {
        return jsonResponse(
          {
            bundle: repo.getBundle(),
            summary: repo.getVerificationSummary(),
          },
          200,
          corsHeaders
        );
      }

      if (url.pathname === '/api/chat' && request.method === 'POST') {
        const contentLength = Number(request.headers.get('content-length') || '0');
        if (contentLength > 32 * 1024) {
          return jsonResponse({ error: 'Request payload too large.' }, 413, corsHeaders);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: 'Invalid JSON request body.' }, 400, corsHeaders);
        }

        const validation = validateChatInput(body);
        if (!validation.valid || !validation.sanitizedMessage) {
          return jsonResponse(
            { error: validation.error || 'Invalid request.' },
            400,
            corsHeaders
          );
        }

        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rate = rateLimiter.check(clientIp, validation.sanitizedMessage);
        if (!rate.allowed) {
          return jsonResponse(
            { error: rate.reason || 'Rate limit exceeded.' },
            429,
            {
              ...corsHeaders,
              ...(rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {}),
            }
          );
        }

        try {
          const result = await handleChatRequest({
            repo,
            apiKey: env.GEMINI_API_KEY,
            message: validation.sanitizedMessage,
            history: validation.sanitizedHistory || [],
            piiWarning: validation.piiWarning,
          });
          return jsonResponse(result, 200, corsHeaders);
        } catch (err) {
          if (err instanceof GeminiServiceError) {
            return jsonResponse(
              { error: err.message, code: err.code },
              err.statusCode,
              corsHeaders
            );
          }
          return jsonResponse(
            { error: 'An unexpected server error occurred.' },
            500,
            corsHeaders
          );
        }
      }

      return jsonResponse({ error: 'API route not found.' }, 404, corsHeaders);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Static assets binding not configured.', { status: 404 });
  },
};
