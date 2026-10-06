<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: Perspectra
## What this product does
A web app for the problem statement "The Blind Spot". A user describes a decision and their reasoning; Gemini returns a structured, non-directive analysis of unstated assumptions, overlooked factors, internal tensions, missing information, alternative perspectives, and premortem questions. Every finding is grounded in the user's own words. The user triages each finding and gets a personal investigation checklist. The app is a THINKING TOOL: it never recommends, ranks, scores or decides. Guests can use everything; logging in (Google) only adds saving.

## Stack (do not change without asking)
Next.js App Router, React, TypeScript, Tailwind CSS. Gemini via @google/genai, server-side only. Next.js route handlers. Firebase Auth (Google sign-in only) and Firestore, added in a later phase. Deployed on Vercel. Only Google services and Vercel are allowed; do not add other third-party services.

## Rules
- Never commit secrets. All secrets live in environment variables documented in .env.example. GEMINI_API_KEY is server-only and never has a NEXT_PUBLIC_ prefix.
- Never use dangerouslySetInnerHTML. Render all AI text as plain text.
- The AI output schema must never contain recommendation, verdict, score, ranking, confidence or best_option fields.
- UI copy and AI output must be tentative and exploratory ("You may be assuming...", "One factor to examine..."), never directive.
- Ask before adding any dependency. Do not add libraries a phase does not list.
- Validate all input and all AI output on the server. The server is the source of truth.
- Never edit a test to make it pass. If a test reveals a bug, report it and fix the code.
- Accessibility basics: semantic landmarks, labelled inputs, visible focus, AA contrast, 44px touch targets, keyboard operability, prefers-reduced-motion.
- Design: calm and editorial, warm off-white, deep ink-blue accent, soft amber highlight, serif headings, no red/green verdict colors.
Git: use only the main branch. Never create, switch to or push other branches, and never open pull requests. Do not run git commit or git push; the developer does that manually
- certaintyBefore must never be included in any request to Gemini.
- README.md must describe only what is implemented. At the end of every phase, update the README feature list, the environment variable list and the Google services status table to match the code.
- The input flow is one question per screen, defined in a single steps config so follow-up screens can be inserted.
- No text below 15px; helper text 16px or more.
- Never read, print, log, copy or modify .env.local or any real secret value. If GEMINI_API_KEY or GEMINI_MODEL are not available when you test, do NOT ask for them and do NOT create .env.local or fake keys. Test everything that does not need Gemini and list the Gemini-dependent checks as "not run: needs key".
- Server-only code lives in lib/server/ and must never be imported by client components. Client code may only use "import type" from lib/schema.ts.
- All logging goes through lib/server/logger.ts. No console.log elsewhere.
- Firestore access only through lib/saved.ts; every document carries the owner's uid; rules are owner-only.
- Every API route must use the shared request guard (method, content type, origin, rate limit, size).
- Automated tests run via Vitest (`npm test` / `npm run test:coverage`). All tests must be meaningful (no snapshot tests, no `.skip`/`.only`, no asserting only on mocks). Coverage on `lib/**` must meet >= 85% lines and >= 80% branches (excluding `server/gemini.ts` which needs a real key).
- PROMPTWARS.md contains developer-supplied facts. Never edit it or add facts to it unless explicitly asked.
## Commands
- Dev: npm run dev | Lint: npm run lint | Typecheck: npm run typecheck | Test: npm test | Test Coverage: npm run test:coverage | Build: npm run build
## End-of-task report (required every time)
Before saying a task is done: run lint, typecheck, tests and build and show the output; list every file changed and why; list anything skipped, stubbed, mocked or hard-coded; list assumptions I should confirm. Do not call work complete if anything fails or is skipped.
## Decisions
See docs/decisions.md. Update it whenever a decision is made.
