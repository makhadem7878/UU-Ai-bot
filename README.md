# Uttara University AI Admission Assistant

Official university data-based AI admission support assistant for **Uttara University, Bangladesh**, powered by **Google Gemini (`@google/genai`)**, a structured **Retrieval-Augmented Generation (RAG)** knowledge base, a responsive **Messenger-inspired React + Tailwind UI**, and dual backend targets (**Node/Express** for local & Cloud Run preview + **Cloudflare Workers** for edge deployment).

---

## Architecture Overview

- **`data/*.json`**: Structured, source-attributed university knowledge base (`university_data.json`, `undergraduate_programs.json`, `graduate_programs.json`, `admission_requirements.json`, `tuition_fees.json`, `scholarship_policy.json`, `departments.json`, `faq.json`, `contact.json`) with `verification_status` (`verified`, `historical`, `needs_review`, `unavailable`), `source_url`, `last_verified`, and `validity_period`.
- **`server/`**:
  - `knowledge-base.ts`: Modular `KnowledgeRepository` ready to swap JSON files for Cloudflare D1 or KV.
  - `retrieval.ts`: Cross-lingual (Bangla Unicode / English / Banglish) intent classifier & RAG context retriever.
  - `security.ts`: Input validation, payload bounds, PII safeguard, sliding-window rate limiter & flood guard, and strict origin checks.
  - `gemini.ts`: Server-side `@google/genai` SDK wrapper (`gemini-4-hydrogen`) with 20s timeout, retry logic, and error classification.
  - `response-handler.ts`: Grounded prompt builder enforcing exact official fallback and anti-hallucination rules.
- **`server.ts`**: Express + Vite full-stack server on port `3000`.
- **`cloudflare/worker.ts` & `wrangler.toml`**: Cloudflare Workers entry point serving `dist/` static assets + `/api/*` edge routes.
- **`src/`**: React 19 + Tailwind CSS v4 frontend with Messenger-style chat, 8 quick-reply topics, Fee Information Cards, Eligibility Checker, Fall 2026 Scholarship Estimator, and Department Comparator.

---

## Local Development & Testing

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure your server-side Gemini API key in `.env` (never commit `.env`):
   ```env
   GEMINI_API_KEY="your_gemini_api_key"
   ```
3. Run the full-stack dev server on port 3000:
   ```bash
   npm run dev
   ```
4. Build and lint-check:
   ```bash
   npm run lint
   npm run build
   ```

---

## Cloudflare Workers Deployment Guide

1. Build the production frontend bundle (`dist/`):
   ```bash
   npm install
   npm run build
   ```
2. Authenticate Wrangler with your Cloudflare account:
   ```bash
   npx wrangler login
   ```
3. Store your Gemini API key securely as a Cloudflare Worker secret:
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```
4. Deploy the Worker and static assets:
   ```bash
   npx wrangler deploy
   ```
5. Custom domain / GitHub integration:
   - Bind a custom domain in Cloudflare Dashboard → **Workers & Pages** → **Settings** → **Domains & Routes**.
   - Set `ALLOWED_ORIGINS` in `wrangler.toml` `[vars]` to your custom production domain.
   - Connect your GitHub repository in Cloudflare Workers Builds (`Build command: npm run build`, `Deploy command: npx wrangler deploy`).

---

## Verification & Testing Checklist

Test the application against the following scenarios:
1. **CSE & BBA Eligibility**: Ask `"What are the CSE and BBA admission requirements?"` or test in the **Eligibility** tab.
2. **Tuition Fees & Unavailable Fees**: Ask about BSc in CSE (`BDT 731,950`), BBA (`BDT 701,100`), BA in English (`BDT 690,200`), and unpublished fees (e.g., Civil/EEE — verifies no fabricated fees and directs to the official ERP Fee Calculator).
3. **Scholarships**: Test Founder Scholarship (double GPA 5.00), +5% female waiver, and 60% cap in both Chat and **Scholarship** tab.
4. **Admission Deadlines & Required Documents**: Verify Fall 2026 (`September–December`) window without fabricated exact closing dates.
5. **Multilingual Support**: Ask in Bangla (`সিএসই ভর্তির যোগ্যতা ও টিউশন ফি কত?`), English, and mixed Bangla-English (`BBA er tuition fee koto ar scholarship ki ache?`).
6. **Out-of-Scope & Historical Policy Guard**: Ask unrelated questions (triggers exact official fallback message) or about old PDF brochures (warns historical records are not current policy).
7. **Security & Resilience**: Confirm `GEMINI_API_KEY` is never present in `dist/` client bundles and rapid duplicate requests trigger `429` rate limiting.
