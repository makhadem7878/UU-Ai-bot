import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GeminiServiceError } from './server/gemini';
import { KnowledgeRepository, type KnowledgeBundle } from './server/knowledge-base';
import { mergeLeadershipLists, parseLeadershipCsv } from './server/leadership-loader';
import { handleChatRequest } from './server/response-handler';
import { isAllowedOrigin, SlidingWindowRateLimiter, validateChatInput } from './server/security';
import type { KnowledgeRecord, Spring2027Dataset } from './server/types';

function loadJsonData<T>(...relativeParts: string[]): T {
  const filePath = path.resolve(process.cwd(), ...relativeParts);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function loadTextData(...relativeParts: string[]): string {
  const filePath = path.resolve(process.cwd(), ...relativeParts);
  return fs.readFileSync(filePath, 'utf-8');
}

const bundle: KnowledgeBundle = {
  universityData: loadJsonData<KnowledgeRecord[]>('data', 'university_data.json'),
  undergraduatePrograms: loadJsonData<KnowledgeRecord[]>('data', 'undergraduate_programs.json'),
  graduatePrograms: loadJsonData<KnowledgeRecord[]>('data', 'graduate_programs.json'),
  admissionRequirements: loadJsonData<KnowledgeRecord[]>('data', 'admission_requirements.json'),
  tuitionFees: loadJsonData<KnowledgeRecord[]>('data', 'tuition_fees.json'),
  scholarshipPolicy: loadJsonData<KnowledgeRecord[]>('data', 'scholarship_policy.json'),
  departments: loadJsonData<KnowledgeRecord[]>('data', 'departments.json'),
  faq: loadJsonData<KnowledgeRecord[]>('data', 'faq.json'),
  contact: loadJsonData<KnowledgeRecord[]>('data', 'contact.json'),
  spring2027Dataset: loadJsonData<Spring2027Dataset>(
    'public',
    'assets',
    'aistudio',
    'uttara_university_admission_fees_spring_2027_bb0329e0.json'
  ),
  leadershipDirectory: mergeLeadershipLists(
    parseLeadershipCsv(
      loadTextData(
        'public',
        'assets',
        'aistudio',
        'uttara_university_photo_enabled_leadership_directory_2026-11-22_b18e136d.csv'
      )
    ),
    parseLeadershipCsv(
      loadTextData(
        'public',
        'assets',
        'aistudio',
        'uttara_university_photo_enabled_leadership_directory_updated_2026-11-22_6b97897b.csv'
      )
    )
  ),
};

const repo = new KnowledgeRepository(bundle);
const rateLimiter = new SlidingWindowRateLimiter(20, 60_000, 4);

const allowedOrigins = [
  process.env.APP_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []),
].filter((v): v is string => Boolean(v));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));

  // CORS & Security Headers for /api/*
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin, allowedOrigins)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    } else if (origin) {
      res.status(403).json({ error: 'Origin not allowed.' });
      return;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Uttara University AI Admission Assistant',
      knowledgeRecords: repo.getVerificationSummary(),
    });
  });

  // Public read-only knowledge base endpoint for interactive checkers & comparators
  app.get('/api/knowledge', (_req, res) => {
    res.json({
      bundle: repo.getBundle(),
      summary: repo.getVerificationSummary(),
    });
  });

  app.post('/api/chat', async (req, res) => {
    const validation = validateChatInput(req.body);
    if (!validation.valid || !validation.sanitizedMessage) {
      res.status(400).json({ error: validation.error || 'Invalid request.' });
      return;
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rate = rateLimiter.check(clientIp, validation.sanitizedMessage);
    if (!rate.allowed) {
      if (rate.retryAfterSec) {
        res.setHeader('Retry-After', String(rate.retryAfterSec));
      }
      res.status(429).json({
        error: rate.reason || 'Rate limit exceeded. Please try again shortly.',
      });
      return;
    }

    try {
      const result = await handleChatRequest({
        repo,
        apiKey: process.env.GEMINI_API_KEY,
        message: validation.sanitizedMessage,
        history: validation.sanitizedHistory || [],
        piiWarning: validation.piiWarning,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }
      res.status(500).json({
        error: 'An unexpected server error occurred. Please contact the Admission Office at 09640 888272.',
      });
    }
  });

  // Vite dev middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Uttara University AI Admission Assistant running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
