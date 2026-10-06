<img src="public/brand/logo-mark.png" alt="Perspectra logo" width="72" height="72" />

# Perspectra

**A wider view of every decision.**

Because every decision deserves another perspective. A thinking tool that shows you the assumptions, blind spots and open questions in your own reasoning, and never decides for you.

[Live demo](https://nileshthipe-promptwars.vercel.app/) • [PromptWars story](./PROMPTWARS.md) • [Documentation](./docs/)

---

## Built for PromptWars

Built solo for the in-person PromptWars at St. Vincent Pallotti College of Engineering and Technology (SVPCET) on 4 October 2026, addressing the problem statement "The Blind Spot" in a 3-hour build. The score, rank, and competition story are documented in [PROMPTWARS.md](./PROMPTWARS.md). The competition score applies to the version submitted on the day, not necessarily to the current code.

## The problem and the approach

People often decide based on the information most visible to them and may overlook important factors, rely on unstated assumptions, or fail to recognise conflicts within their own reasoning. The challenge was to build an AI-powered solution that helps users identify blind spots in their reasoning when considering a decision, encouraging them to examine their assumptions and explore questions that could lead to a more informed decision. The system must not make the decision for the user.

### What makes it different

- **Findings tied to the user's own words and verified on the server:** Every finding's evidence quote is checked verbatim against the user's input text on the server. Ungrounded quotes are dropped or downgraded to inferred before reaching the client.
- **No verdict, score or recommendation fields in the schema:** The server-facing schema strictly excludes verdict, recommendation, score, ranking, confidence, or best-option keys, reinforced by a server-side language neutrality guard that rejects directive phrasing.
- **The user triages each finding and builds their own investigation list:** Instead of receiving an automated prescription, the user evaluates each finding as "Worth investigating", "Noted", or "Dismissed" to construct a personal checklist.
- **Guests can use everything with optional private saving:** Full access to the interview flow, analysis generation, card triage, and plain-text note copying is available to guests without registration; signing in merely adds persistent cloud storage.
- **Inferred and unknown items are labelled:** Items without direct textual grounding are visibly tagged as inferred, and open questions are treated as unknowns to investigate rather than established facts.

## Features

### Input flow
- **One question per screen:** Step-by-step interview flow with progress indicators, back navigation, and inline character counts.
- **Eight structured decision types:** Contextual framing across Career, Education, Relocation, Finance, Relationship, Health & Lifestyle, Projects & Creative, and Other without imposing rigid rules.
- **Built-in realistic examples:** Pre-populated scenarios allowing immediate exploration without typing.
- **Optional context and baseline certainty:** Context and baseline certainty rating prompts that can be completed or skipped.
- **Continuous local draft preservation:** Form state is saved to browser session storage (`perspectra_workspace_v2`) so work is preserved across refreshes.

### Analysis
- **Structured cognitive decomposition:** Explores five distinct categories: unstated assumptions, overlooked factors, internal tensions, missing information, and alternative perspectives.
- **Premortem scenario questions:** Probes potential future failure modes before committing to a decision.
- **Server-side grounding verifier:** Validates that every evidence quote exists verbatim in the user's input text.
- **Server-side language neutrality guard:** Rejects directive advice and re-prompts automatically if prescriptive wording is generated.
- **High-stakes consideration detection:** Detects financial, legal, health, or academic decisions and displays a neutral advisory reflection note.
- **Upstream resilience & fallback model failover:** Handles upstream 429 quota exhaustion (`AI_QUOTA` with `Retry-After: 30`) and 5xx transient overload with single retry and optional fallback model failover.

### Results
- **Two-column masonry layout on desktop:** Balanced two-column findings cards (`columns-1 lg:columns-2`) with expandable disclosures for grounded evidence, reflection questions, and checks.
- **Mobile fixed bottom navigation:** Dedicated bottom bar (screens below 1024px) keeping section navigation in thumb reach with live count badges.
- **Three-way mutual exclusivity triage:** Findings are triaged into "Worth investigating", "Noted", or "Dismissed" with live tally feedback.
- **Quote highlighting:** Links directly to the "In your words" tab with background quote emphasis.
- **Dynamic investigation checklist:** Collects all items marked "Worth investigating" into a structured action list on the Next steps tab.
- **Certainty reflection prompt:** Compares post-analysis mindset against baseline certainty without making value judgements.
- **Plain-text note export:** Pure, deterministic note formatter (`formatNotes()`) with one-click clipboard copying and fallback manual textarea.

### Accounts and saving
- **Full guest experience:** Guests can use every reflection and analysis tool without creating an account.
- **Firebase Authentication:** Supports Google sign-in and email/password accounts with display name management.
- **Private Cloud Firestore persistence:** Analyses and profiles are stored under owner-only security rules keyed strictly to the user UID.
- **Seamless guest-to-account saving:** Guests clicking "Save" sign in and immediately have their active reflection and triage state saved.
- **Complete sign-out reset:** Cancels pending debounced writes, purges all client storage keys, and resets in-memory application state.
- **Profile management:** Profile page (`/profile`) allowing users to view and update their display name.

### Safety and privacy
- **Server-side API key isolation:** `GEMINI_API_KEY` is server-only, never prefixed with `NEXT_PUBLIC_`, and never bundled in client code.
- **Shared request guard:** Verifies POST method, `application/json` Content-Type, same-origin host matching, and an 8 KB payload cap on all API routes.
- **In-memory rate limiting:** Enforces per-IP burst limits and global hourly instance caps.
- **Text sanitisation:** Normalises input text to Unicode NFC and strips control characters and bidirectional overrides.
- **Crisis-language interceptor:** Halts model execution when explicit first-person self-harm text is detected, returning verified helpline resources (Tele-MANAS for India, local emergency services) without logging user text.
- **Owner-only database access:** Firestore security rules restrict reads, writes, and deletes to the authenticated owner.
- **Certainty rating privacy:** Baseline certainty (`certaintyBefore`) is strictly for user reflection and is rejected with HTTP 400 if included in requests to `/api/analyze`.

### Accessibility
- **WCAG AA contrast:** All foreground and background pairings meet contrast requirements.
- **Minimum 44px touch targets:** All interactive buttons, tabs, chips, and controls satisfy the 44px minimum target standard.
- **Keyboard operability:** Full keyboard navigation with logical tab ordering, arrow-key tab list switching, and visible focus rings.
- **Semantic landmarks & ARIA announcements:** Proper semantic HTML structure with ARIA live regions for screen readers.
- **Editorial colour scheme:** Warm off-white (`#faf8f5`), deep ink-blue (`#18263e`), and soft amber (`#b46b19`), completely avoiding red/green verdict indicators.
- **Reduced motion support:** Respects `prefers-reduced-motion` settings across pulsing and transition animations.
- **Legible typography:** All body copy is 15px or larger, with helper text 16px or larger.

## How it works

```text
[ Browser Client ]
       │
       ▼  (POST JSON payload, max 8 KB)
[ Shared Request Guard ] ──(Invalid method / Origin / Oversized)──> [ HTTP 400 / 403 / 405 / 413 ]
       │
       ▼
[ Text Sanitiser ] (Unicode NFC, strip control / bidi chars)
       │
       ▼
[ Crisis Language Check ] ──(First-person self-harm text)─────────> [ Support Screen & Helplines ]
       │                                                            (No AI call, zero logging)
       ▼
[ Gemini 2.5 API ] (Server-side @google/genai, structured JSON schema, ThinkingConfig)
       │  (Upstream 429 quota / 5xx retry / fallback model failover)
       ▼
[ Schema & Neutrality Guard ] ──(Directive phrasing detected)─────> [ Automatic Retry Attempt 2 ]
       │
       ▼
[ Grounding Verifier ] (Verbatim quote match against user input; drop ungrounded quotes)
       │
       ▼
[ Audit Receipt & JSON Response ] ───> [ Browser Results View ]

[ Optional Saving Flow ]
[ Browser ] ───> [ Firebase Auth (Google / Email) ] ───> [ Cloud Firestore ]
                                                           (Owner-only security rules)
```

1. When a user submits their reflection, the browser sends an HTTP POST request to `/api/analyze` where the shared request guard verifies origin, headers, content type, and rate limits.
2. The server sanitises input text to Unicode NFC and runs an immediate crisis-language scan to intercept self-harm expressions before any external service is invoked.
3. If safe, the server constructs a delimited prompt with category-specific reflection lenses and invokes the Gemini API using `@google/genai` with a strict JSON schema and configurable thinking budget.
4. If upstream quota limits or transient server overloads occur, the server manages backoff delays and transparently switches to an optional fallback model if configured.
5. The raw model output is validated against the schema and passed through a neutrality guard that re-prompts if directive phrasing is detected, followed by a grounding verifier that confirms every quoted passage exists verbatim in the user's input.
6. The client receives a clean analysis accompanied by a verifiable neutrality receipt, and authenticated users can optionally persist the record to Cloud Firestore under owner-only security rules.

## Tech stack

| Layer | Technology | Role |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Server-rendered structure, React 19 client components, route handlers |
| Language | TypeScript 5 | Strict typing across schemas, API contracts, and components |
| Styling | Tailwind CSS 4 | Utility-first styling, calm editorial design, responsive layouts |
| Testing | Vitest & React Testing Library | Unit tests, component integration tests, v8 coverage enforcement |
| Hosting | Vercel | Production deployment and edge routing |

### Google services

| Service | Purpose | Status |
| --- | --- | --- |
| Google Gemini API (`@google/genai`) | Server-side structured analysis, thinking budget, and cognitive decomposition | Implemented |
| Firebase Authentication | Google sign-in and email/password user authentication | Implemented |
| Cloud Firestore | Private, owner-scoped document storage for saved analyses and user profiles | Implemented |

*Note: Vercel (hosting) and GitHub (version control) are third-party services and are not Google services.*

## Security and privacy

- **Server-side API key isolation:** `GEMINI_API_KEY` is server-only, never prefixed with `NEXT_PUBLIC_`, and never leaked to client bundles.
- **Defense-in-depth request guards:** All API routes enforce POST methods, `application/json` Content-Type, same-origin host verification, and an 8 KB payload cap.
- **Multi-tier rate limiting:** In-memory burst rate limiting per IP address paired with an hourly instance-wide ceiling.
- **Strict input sanitisation:** Normalises input to Unicode NFC and purges ASCII/Unicode control codes and bidirectional overrides.
- **Owner-only data access:** Firestore security rules enforce strict ownership checks (`request.auth.uid == resource.data.ownerUid`), preventing unauthorized cross-user reading, writing, or deletion.
- **Clean session reset:** Explicit sign-out cancels active write timers and purges all application keys from `sessionStorage` and `localStorage`.
- **Crisis safety interceptor:** Halts processing of self-harm queries on the server without logging user text and presents verified helpline contact information.
- **Non-directive constraint:** Output schema prohibits scores, rankings, or recommendations, backed by automated language verification.
- For complete STRIDE analysis, threat models, and identified gaps, see [docs/security.md](./docs/security.md).

## Testing

The project uses Vitest with React Testing Library and v8 coverage analysis. Tests run fully offline without live API keys.

```bash
# Run automated tests
npm test

# Run tests with coverage threshold report
npm run test:coverage
```

### Verified test metrics

- **Test files:** 21 passed (21 total)
- **Tests:** 171 passed (171 total)
- **Overall line coverage:** 86.77% (4,608 / 5,310; threshold: >= 85%)
- **Overall branch coverage:** 82.15% (875 / 1,065; threshold: >= 80%)
- **`lib/**` line coverage:** 94.56% (1,686 / 1,783; threshold: >= 85%)
- **`lib/**` branch coverage:** 83.37% (376 / 451; threshold: >= 80%)

### Mocking boundaries

- **What is mocked:** Upstream network calls to the Gemini API (`lib/server/gemini.ts`) to enable offline testing without API credentials; Next.js router hooks; and Firebase client auth triggers in component tests.
- **What is never mocked:** Input validation rules, JSON schema validators, request guards, quote grounding algorithms, neutrality verifiers, rate limiting logic, note formatters, or client storage clearing routines.
- For comprehensive testing policies, see [docs/testing.md](./docs/testing.md).

## Getting started

### Prerequisites

- Node.js 20 or higher
- npm 10 or higher

### Installation

```bash
git clone https://github.com/nilesh0199/nileshthipe_promptwars.git
cd nileshthipe_promptwars
npm install
```

### Environment setup

```bash
cp .env.example .env.local
```

### Available commands

- `npm run dev`: Start local development server on `http://localhost:3000`
- `npm run build`: Build production application with Next.js Turbopack
- `npm run lint`: Run ESLint checks
- `npm run typecheck`: Run TypeScript type checking (`tsc --noEmit`)
- `npm test`: Run automated Vitest test suite
- `npm run test:coverage`: Run test suite with full v8 coverage metrics

### Environment variables

| Variable | Required / Optional | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Required for live analysis | Server-side Google Gemini API key (server-only, never public) |
| `GEMINI_MODEL` | Optional | Gemini model ID (server-only; defaults to `gemini-2.5-flash`) |
| `GEMINI_FALLBACK_MODEL` | Optional | Fallback model ID on 429 quota or persistent 5xx overload (e.g. `your-fallback-model-id`; use a stable model ID listed in Google AI Studio) |
| `GEMINI_THINKING_LEVEL` | Optional | Thinking budget: `low`, `medium`, or `high` (defaults to `medium`) |
| `RATE_LIMIT_MAX` | Optional | Max requests per IP window (defaults to 20 in production, 120 in development) |
| `RATE_LIMIT_WINDOW_SECONDS` | Optional | Rate limit window duration in seconds (defaults to 600) |
| `RATE_LIMIT_GLOBAL_MAX` | Optional | Hourly global cap on analysis calls per serverless instance (defaults to 300) |
| `ALLOWED_ORIGINS` | Optional | Comma-separated list of allowed cross-origin hostnames |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Optional (Required for saving) | Firebase client API key for authentication and Firestore |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Optional (Required for saving) | Firebase authentication domain for Google sign-in |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Optional (Required for saving) | Firebase project ID for Firestore database connection |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Optional (Required for saving) | Firebase web application identifier |

## Project structure

```text
.github/workflows/   Continuous integration configuration (lint, typecheck, tests, build)
app/                 Next.js App Router: landing page, /api/analyze, /api/health, /saved, /profile
components/          React UI components: Workspace interview, Header, InfoTabs, ProductPreview
components/auth/     Authentication modal, AuthProvider context, Google and email/password forms
components/results/  Results page: ResultsView, FindingsTab, InYourWordsTab, PremortemTab, NextStepsTab
components/safety/   Crisis-language SupportCard component with verified helpline information
docs/                Architecture decisions, threat model, manual test cases, testing guidelines
lib/                 Client schemas, steps configuration, note formatter, client state reset
lib/server/          Server-only modules: request guard, sanitiser, prompt, gemini, analyze, grounding
public/              Static assets, brand emblem (logo-mark.png), favicon, and metadata icons
tests/               Automated test suite (unit, API routes, and component integration tests)
```

## Documentation index

| Document | Description |
| --- | --- |
| [docs/decisions.md](./docs/decisions.md) | Architecture Decision Records (ADRs D1 to D38) documenting design choices and trade-offs. |
| [docs/security.md](./docs/security.md) | Comprehensive threat model, STRIDE security analysis, defense-in-depth architecture, and checklist. |
| [docs/test-inputs.md](./docs/test-inputs.md) | Structured manual test inputs spanning diverse decision domains, edge cases, and safety checks. |
| [docs/testing.md](./docs/testing.md) | Testing architecture, coverage standards, mocking boundaries, and verification procedures. |
| [AGENTS.md](./AGENTS.md) | Single source of truth defining architectural invariants, product rules, and assistant instructions. |
| [PROMPTWARS.md](./PROMPTWARS.md) | Competition background, hackathon facts, score breakdown, and takeaways from PromptWars at SVPCET. |

## Known limitations and roadmap

- **In-memory rate limiting:** Rate limiting state is held in memory and resets on serverless cold starts or multi-instance scaling; distributed rate limiting (e.g. Upstash Redis) is planned for larger deployments.
- **Keyword-based crisis detection:** Relies on explicit first-person distress phrase matching; context-aware semantic screening is planned.
- **No self-service account deletion:** Users cannot delete their accounts or bulk-purge saved data directly from the web interface.
- **No Firestore rules emulator automated test harness:** Firestore rules are validated structurally but lack local `@firebase/rules-unit-testing` CI runs.
- **Single-format export:** Notes export is currently plain text only; PDF and JSON formats are not yet supported.

### Not built yet

- Self-service account and data deletion in `/profile`
- PDF export of the investigation checklist
- Automated Firestore rules test harness using Firebase Local Emulator
- Multi-language localisation for decision interviews

## Author

Built by Nilesh Thipe.

## License

No license has been chosen yet. All rights reserved.
