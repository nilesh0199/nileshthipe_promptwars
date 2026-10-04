# Perspectra

Status: work in progress

"A wider view of every decision."

A thinking tool that helps you see what you might be missing in a decision. It never decides for you.

## Problem Statement: The Blind Spot

People make decisions based on the information most visible to them, frequently overlooking subtle factors, relying on unstated assumptions, or missing internal tensions in their own reasoning. Perspectra is designed as an exploratory thinking tool to help individuals examine their own thought processes with clarity. It surfaces cognitive blind spots and open questions without ever deciding, ranking, scoring, or recommending what choice the person should make.

## What It Does Today

- Compact landing page fitted to desktop viewports (1280x720 / 1366x768) with Fraunces serif display heading, abstract decorative product preview, and four accessible info tabs ("What it does", "How it works", "Our promise", "Privacy") supporting roving tabindex and keyboard navigation.
- Five structured decision types (`study`, `career`, `money`, `life`, `other`) with deliberate selection (no default pre-selection, 900ms confirmation with check mark before auto-advancing), domain reflection lenses, concrete placeholders, and realistic examples, plus a quiet advisory line for money decisions.
- Guided one-question-per-screen interview flow defined in a single steps configuration (`lib/flow.ts`) with responsive two-column layout on desktop viewports (1024px+), four data fields: `decision` (min 3 chars, max 300), `reasons` (min 3 chars, max 600), `context` (optional, max 800), and self-reported `certaintyBefore` (optional rating 1-5).
- Brand header navigation: monogram and wordmark button returns to the landing view without wiping the draft in progress, supporting browser history forward/back navigation.
- "So far" interactive summary chips displaying answers given so far, allowing users to jump back to any previous question without losing entered text.
- Certainty-before rating: an accessible 1 to 5 radio group with keyboard arrow navigation, strictly isolated for the user only and never sent to the AI.
- Input validation: inline messages on required questions when submitted empty or below minimum length, linked via `aria-describedby` with no red error colors.
- Character countdown counters appearing only when 100 or fewer characters remain, indicating "Limit reached" at the boundary.
- Example loading with inline overwrite confirmation when the user has already entered text.
- Session persistence: stores the active screen and draft data in browser `sessionStorage` under `perspectra_workspace_v2`, cleanly ignoring obsolete or invalid schemas on reload.
- Analysis route handler (`POST /api/analyze`): strict server validation via Zod, delimiter attack neutralization, structured prompt assembly with decision-type reflection lenses, server-side timeout/retry management, verbatim substring quote verification, basis downgrading (`inferred`), and programmatic neutrality receipts.
- Production results experience (`components/results/ResultsView.tsx`): 4 accessible tabs ("Findings", "In your words", "Premortem", "Next steps") with desktop-optimized wide layout (`max-w-6xl` with 2-column finding cards on `xl:`), grouped finding cards, verbatim grounded quote blocks, bidirectional evidence linking, client-side triage ("Worth investigating", "Already considered", "Not relevant to me"), premortem reflection questions, structural reasoning map, personal synthesis notes, copyable export checklist, neutrality audit receipt, and post-analysis certainty reflection.
- Optional Google sign-in: client-only Firebase Auth (`components/auth/AuthProvider.tsx`, `components/auth/SignInModal.tsx`) using `signInWithPopup` with `GoogleAuthProvider`. Guest-first access remains fully functional without an account.
- Private cloud saving: saves analyses directly to Cloud Firestore (`lib/saved.ts`) under owner-only security rules (`firestore.rules`). Seamless debounced auto-saving (~1s) on triage, notes, and certainty updates. Pending guest saves survive in `sessionStorage` and persist automatically upon sign-in.
- Saved analyses dashboard (`/saved`): client-side sorted list of private analyses displaying titles, timestamps, and investigation counters, featuring inline-confirmed single item deletion and batched delete-all.
- Saved analysis view (`/saved/[id]`): deep links restoring full analysis, triage decisions, and notes directly into the production `ResultsView`.
- Accessibility: semantic landmarks (`header`, `main`, `footer`), skip link, 44px minimum touch targets, visible focus indicators, `aria-live` screen reader announcements, radio arrow key navigation, all text at or above 15px (helpers 16px or more), and `prefers-reduced-motion` CSS animation suppression.
- Health check endpoint: dynamic `GET /api/health` route returning `{ "status": "ok" }` with HTTP 200.
- Continuous integration: GitHub Actions workflow (`.github/workflows/ci.yml`) validating lint, typecheck, and build on Node.js 22.

## Design Principles

- Non-directive contract: the product never recommends an option, scores choices, declares a verdict, ranks alternatives, or decides for the user.
- Exploratory language: UI copy and AI prompts use tentative phrasing ("You may be assuming...", "One factor to examine..."), never directive statements.
- Sole decision-maker: the user remains in complete control of their evaluation and next steps.

## Tech Stack

- Next.js 16.3.8 (App Router)
- React 19.2.8 & React DOM 19.2.8
- TypeScript 5
- Tailwind CSS 4 with `@tailwindcss/postcss`
- `@google/genai` ^2.27.0 (server-side Gemini integration)
- `firebase` ^12.19.0 (client-side Google Auth and Cloud Firestore)
- `zod` ^4.6.5 (server and schema validation)
- ESLint 9 with `eslint-config-next` 16.3.8

## Google Services

| Service | Purpose in this project | Status |
| :--- | :--- | :--- |
| Google Fonts via next/font | Display (Fraunces) and UI (Inter) typography (fetched at build time, self-hosted) | Implemented |
| Gemini API | Structured, non-directive analysis of user reasoning via `@google/genai` | Implemented |
| Firebase Authentication | Optional Google sign-in for saving private analyses | Implemented |
| Cloud Firestore | Client-direct, owner-only private storage and updates of analyses | Implemented |

*Other platforms note: Vercel (hosting) and GitHub (source control and CI) are not Google services.*

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation & Run
```bash
npm install
cp .env.example .env.local
npm run dev
```

### Verification & Test Commands
```bash
npm run lint
npm run typecheck
npm test
npm run test:watch
npm run test:coverage
npm run build
```

### Automated Tests
Automated test suite executed via [Vitest](https://vitest.dev/) with v8 coverage and React Testing Library (97 tests across 13 test files):
1. **Unit tests (`tests/unit/`, 65 tests):**
   - `schema.test.ts` (10 tests): Rejects `certaintyBefore` and unknown fields, enforces string limits, validates all 5 decision types and AI output schema.
   - `guard.test.ts` (5 tests): Flags 15 directive advice categories in output while preserving tentative inquiry phrases.
   - `grounding.test.ts` (8 tests): Verifies grounded evidence spans against user input, drops hallucinated quotes, normalizes punctuation, handles international non-Latin scripts (Hindi and Marathi), and handles edge cases.
   - `sanitizer-safety-rateLimit.test.ts` (13 tests): Control character stripping, crisis/self-harm detection without model calls, and sliding-window rate limiting with LRU eviction.
   - `requestGuard-env-logger.test.ts` (12 tests): Method whitelisting, Content-Type enforcement, 8 KB body size caps, same-origin verification, environment variable loading, and credential log redaction.
   - `prompt.test.ts` (4 tests): Assembles prompts across all decision types without ever leaking `certaintyBefore`.
   - `saved.test.ts` (12 tests): Firestore document construction with owner uid, recursive sanitization, client-side sorting, and batched account deletion.
   - `analyze.test.ts` (7 tests): Analysis orchestration, retry recovery on soft errors, upstream quota error fast-fail, and deadline timeouts.
2. **API route tests (`tests/api/`, 12 tests):**
   - `analyze-route.test.ts` (11 tests): POST enforcement (405), Content-Type checks (400), payload size limits (413), same-origin blocking (403), rate limiting (429), crisis responses, and successful analyses.
   - `health-route.test.ts` (1 test): Verifies 200 OK liveness check with ISO timestamp.
3. **Component integration tests (`tests/components/`, 14 tests):**
   - `type-picker-and-workspace.test.tsx` (7 tests): Unselected fresh state, 900ms confirmation timer, keyboard navigation, required field validation, and payload verification ensuring `certaintyBefore` is never sent to the API.
   - `results-and-safe-rendering.test.tsx` (5 tests): Triage mutual exclusivity, dynamic Next Steps filtering, grounded `<mark>` highlights, safe plain-text rendering preventing XSS, and basis badge labels.
   - `auth-and-brand.test.tsx` (2 tests): `SignInModal` focus trap and keyboard dismissal, and Header brand navigation preserving user drafts.

**Coverage (v8):**
- `lib/**` Lines: **92.15%** (threshold: >= 85%)
- `lib/**` Branches: **83.33%** (threshold: >= 80%)
- Overall project statements/lines: **79.22%** (3,142 / 3,966)
- Excluded modules: `lib/server/gemini.ts` (requires live API key; tested via mocks) and `lib/types.ts` (pure TypeScript types).
- Detailed documentation and mutation check verification available in [docs/testing.md](docs/testing.md).

### Security Architecture

- **Shared Request Guard:** Every API route verifies HTTP method (POST only with 405 Allow header), Content-Type (`application/json`), same-origin header verification against request Host and `ALLOWED_ORIGINS`, and an 8 KB request size ceiling.
- **In-Memory Rate Limiting:** Best-effort per-instance burst limiting by client IP (`RATE_LIMIT_MAX` requests per `RATE_LIMIT_WINDOW_SECONDS`) with an hourly instance cap (`RATE_LIMIT_GLOBAL_MAX`).
- **Input Sanitisation:** Normalises text to Unicode NFC and strips control characters, zero-width spaces, and bidirectional-override characters before validation, prompt assembly, or grounding.
- **Crisis-Language Fallback:** Server-side interceptor halts model calls when explicit first-person self-harm or suicidal intent is detected, returning a non-judgmental support screen with verified helplines (Tele-MANAS for India, local emergency services) without logging user text or persisting data.
- **HTTP Security Headers:** Comprehensive defense headers configured in `next.config.ts`, including Content-Security-Policy (with Google services and dev hot-reload allowances), Strict-Transport-Security (HSTS), X-Content-Type-Options (`nosniff`), X-Frame-Options (`DENY`), and Cross-Origin-Opener-Policy (`same-origin-allow-popups`).
- **Threat Model:** Documented in detail in `docs/security.md`.

### Environment Variables
Environment variables documented in `.env.example`:
- `GEMINI_API_KEY`: Server-side API key for Google Gemini model invocations (server-only, required for live analysis).
- `GEMINI_MODEL`: Model identifier for Gemini invocations (server-only; default: `gemini-2.5-flash`).
- `GEMINI_THINKING_LEVEL`: Reasoning budget level for thinking-capable models (`low`, `medium`, `high`; default: `medium`).
- `RATE_LIMIT_MAX`: Optional maximum requests per window per IP (production default: 20; non-production default: 120).
- `RATE_LIMIT_WINDOW_SECONDS`: Optional rate limit window in seconds (default: 600).
- `RATE_LIMIT_GLOBAL_MAX`: Optional global per-instance cap on analysis calls per hour (default: 300).
- `ALLOWED_ORIGINS`: Optional comma-separated list of allowed cross-origin origins (e.g. `https://perspectra.vercel.app`).
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase API key for client-side authentication and Firestore.
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase authentication domain for Google sign-in.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID for Firestore database.
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase web application ID.

*Note: In the absence of `GEMINI_API_KEY` or Firebase environment variables, frontend navigation, input validation, sessionStorage persistence, guest flows, and `/api/health` work completely offline with graceful fallbacks.*

## Project Structure

```text
.github/workflows/   GitHub Actions CI workflow (ci.yml running lint, typecheck, audit, test:coverage, and build)
app/                 App Router layout, global styles, page, /api/health, /api/analyze, /saved, and /saved/[id]
components/          Workspace interview flow, Header, InfoTabs, ProductPreview
components/auth/     AuthProvider, SignInModal
components/results/  Production results view: ResultsView, ResultsHeader, FindingsTab, InYourWordsTab, PremortemTab, NextStepsTab
components/safety/   SupportCard crisis-language fallback component
docs/                Architecture decisions (decisions.md), threat model (security.md), testing guide (testing.md), manual test inputs (test-inputs.md)
lib/                 Client schemas, steps configuration, limits, types, safety, savedDoc pure functions, and decision configs
lib/server/          Server-only modules: env, logger, prompt, guard, grounding, gemini, analyze, rateLimit, requestGuard, sanitize
tests/               Automated test suite (unit/, api/, components/, setup.ts; 97 tests via Vitest)
firestore.rules      Owner-only Cloud Firestore security rules
vitest.config.ts     Vitest test runner and v8 coverage threshold configuration
AGENTS.md            Project memory, rules, constraints, and architecture guidelines
.env.example         Example environment variable template
```

## Not Built Yet

- Follow-up question generation and dynamic screen insertion
- Production deployment to Vercel
