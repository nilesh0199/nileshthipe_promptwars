# Second Look

Status: work in progress

"See your decision from where you're not standing."

A thinking tool that helps you see what you might be missing in a decision. It never decides for you.

## Problem Statement: The Blind Spot

People make decisions based on the information most visible to them, frequently overlooking subtle factors, relying on unstated assumptions, or missing internal tensions in their own reasoning. Second Look is designed as an exploratory thinking tool to help individuals examine their own thought processes with clarity. It surfaces cognitive blind spots and open questions without ever deciding, ranking, scoring, or recommending what choice the person should make.

## What It Does Today

- Compact landing page fitted to desktop viewports (1280x720 / 1366x768) with Fraunces serif display heading, abstract decorative product preview, and four accessible info tabs ("What it does", "How it works", "Our promise", "Privacy") supporting roving tabindex and keyboard navigation.
- Five structured decision types (`study`, `career`, `money`, `life`, `other`) providing domain reflection lenses, concrete placeholders, and realistic examples, plus a quiet advisory line for money decisions.
- Guided one-question-per-screen interview flow defined in a single steps configuration (`lib/flow.ts`) with four data fields: `decision` (min 3 chars, max 300), `reasons` (min 3 chars, max 600), `context` (optional, max 800), and self-reported `certaintyBefore` (optional rating 1-5).
- "So far" interactive summary chips displaying answers given so far, allowing users to jump back to any previous question without losing entered text.
- Certainty-before rating: an accessible 1 to 5 radio group with keyboard arrow navigation, strictly isolated for the user only and never sent to the AI.
- Input validation: inline messages on required questions when submitted empty or below minimum length, linked via `aria-describedby` with no red error colors.
- Character countdown counters appearing only when 100 or fewer characters remain, indicating "Limit reached" at the boundary.
- Example loading with inline overwrite confirmation when the user has already entered text.
- Session persistence: stores the active screen and draft data in browser `sessionStorage` under `second_look_workspace_v2`, cleanly ignoring obsolete or invalid schemas on reload.
- Analysis route handler (`POST /api/analyze`): strict server validation via Zod, delimiter attack neutralization, structured prompt assembly with decision-type reflection lenses, server-side timeout/retry management, verbatim substring quote verification, basis downgrading (`inferred`), and programmatic neutrality receipts.
- Developer results preview (`components/DeveloperPreview.tsx`): calm loading view with 2.5s rotating status copy, cancelation via AbortController, error handling with preserves answers, and developer inspection view rendering structured analysis JSON and audit receipt.
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
- `zod` ^4.6.5 (server and schema validation)
- ESLint 9 with `eslint-config-next` 16.3.8

## Google Services

| Service | Purpose in this project | Status |
| :--- | :--- | :--- |
| Google Fonts via next/font | Display (Fraunces) and UI (Inter) typography (fetched at build time, self-hosted) | Implemented |
| Gemini API | Structured, non-directive analysis of user reasoning via `@google/genai` | Implemented |
| Firebase Authentication | Optional Google sign-in for saving | Planned |
| Cloud Firestore | Optional private saved analyses | Planned |

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

### Verification Commands
```bash
npm run lint
npm run typecheck
npm run build
```

### Environment Variables
Environment variables documented in `.env.example`:
- `GEMINI_API_KEY`: Server-side API key for Google Gemini model invocations (server-only, required for live analysis).
- `GEMINI_MODEL`: Model identifier for Gemini invocations (server-only; default: `gemini-2.5-flash`).
- `GEMINI_THINKING_LEVEL`: Reasoning budget level for thinking-capable models (`low`, `medium`, `high`; default: `medium`).
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase API key for client-side authentication (Planned; not read by code today).
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase authentication domain (Planned; not read by code today).
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID for Firestore (Planned; not read by code today).
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase application ID (Planned; not read by code today).

*Note: In the absence of `GEMINI_API_KEY`, frontend navigation, input validation, sessionStorage persistence, and `/api/health` work completely offline. Calls to `/api/analyze` return a graceful 500 error.*

## Project Structure

```text
.github/workflows/   GitHub Actions CI workflow (ci.yml)
app/                 App Router layout, global styles, page, /api/health, and /api/analyze
components/          Workspace interview flow, DeveloperPreview, InfoTabs, ProductPreview
docs/                Architecture decisions (decisions.md) and manual test cases (test-inputs.md)
lib/                 Client schemas, steps configuration, limits, types, and decision configs
lib/server/          Server-only modules: env, logger, prompt, guard, grounding, gemini, analyze
AGENTS.md            Project memory, rules, constraints, and architecture guidelines
.env.example         Example environment variable template
```

## Not Built Yet

- Results view with interactive findings triage cards and personalized investigation checklist (Phase 4)
- Optional Google sign-in (Firebase Auth) and cloud saving (Cloud Firestore)
- Follow-up question generation and dynamic screen insertion
- Automated test suite (unit and end-to-end tests)
- Production deployment to Vercel
