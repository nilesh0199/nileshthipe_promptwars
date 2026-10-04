# Perspectra Automated Testing Architecture & Suite (Phase 7)

This document describes the automated test suite, coverage configuration, test principles, and verification results for Perspectra.

---

## 1. Tooling & Architecture

- **Test Runner:** [Vitest](https://vitest.dev/) (fast, native ESM and TypeScript support matching Next.js App Router).
- **Environment:**
  - `node` default for pure logic and route handlers.
  - `jsdom` for React component integration tests via `@vitest-environment jsdom`.
- **Component Testing:** `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- **Coverage Provider:** `@vitest/coverage-v8` with `text-summary`, `html`, and `json-summary` reporters.
- **Path Aliasing:** `@/` resolves directly to repository root matching `tsconfig.json`.

---

## 2. Test Suite Structure

The test suite is organized into three distinct tiers:

### A. Unit Tests (`tests/unit/`)
1. **`schema.test.ts` (10 tests)**
   - Rejects inputs containing `certaintyBefore` or arbitrary unknown fields (strict Zod rejection).
   - Validates input length bounds (min 10 / max 500 for decision, min 10 / max 600 for reasons, max 800 for context).
   - Validates all 5 supported decision types (`career`, `study`, `relocation`, `financial`, `personal`).
   - Validates structured AI output schema (`ModelAnalysisSchema`) and rejects directive or missing fields.
2. **`guard.test.ts` (5 tests)**
   - Verifies rejection of 15 directive categories (e.g. `you_should`, `i_recommend`, `the_best_option`, `my_advice`, `dont_do_it`).
   - Ensures tentative exploratory language (`you may need to examine`, `one factor to consider`) is preserved and never falsely flagged.
3. **`grounding.test.ts` (8 tests)**
   - Verifies exact evidence grounding against the user's original words across `decision`, `reasons`, and `context`.
   - Tests quote normalization (case-insensitivity, whitespace collapsing, curly/straight quotes, typographic dashes).
   - Tests international multi-script support (Hindi and Marathi in Devanagari script).
   - Asserts dropping of fabricated or hallucinated quotes and automatic downgrade of `stated` basis to `inferred` when 0 quotes remain.
   - Handles edge cases: quotes < 4 characters, malformed/empty quotes, and quotes wrapped in ellipses.
4. **`sanitizer-safety-rateLimit.test.ts` (13 tests)**
   - Input sanitization: strips control characters, normalizes line breaks, and enforces length bounds.
   - Self-harm detection: triggers calm support resource response without invoking AI or external APIs.
   - Sliding-window rate limiter: allows $N$ requests, blocks at $N+1$, returns correct `Retry-After` seconds, tests LRU eviction, and handles clock skew safely.
5. **`requestGuard-env-logger.test.ts` (12 tests)**
   - Request guard functions: HTTP method whitelist, Content-Type enforcement, 8 KB body size caps, same-origin validation, and RFC 9457 error format.
   - Server environment: validates parsing, production vs development defaults, thinking levels, custom rate limits, origin whitelist, and error shielding.
   - Structured logger: redacts sensitive authentication keys and verifies user reasoning text is never written to logs.
6. **`prompt.test.ts` (4 tests)**
   - Verifies prompt construction for all 5 decision types.
   - Verifies `certaintyBefore` is never present in generated system or user prompts.
7. **`saved.test.ts` (12 tests)**
   - Validates document generation with owner `uid` on every record.
   - Tests `sanitizeForFirestore` recursive removal of `undefined`.
   - Tests `decideSaveAction` distinguishing guest users (`prompt-sign-in`) from authenticated users (`save`).
   - Tests Firestore operations: `saveAnalysis`, `updateAnalysis`, `getAnalysis`, `deleteAnalysis`, `listAnalyses`, and `deleteAllAnalyses`.
   - Verifies client-side sorting of saved analyses descending by creation time.
8. **`analyze.test.ts` (7 tests)**
   - Simulates end-to-end analysis orchestration with mocked Gemini responses.
   - Tests retry recovery when initial attempt contains directive language or malformed JSON.
   - Verifies that upstream 429 quota exhaustion or 503 errors fail fast without wasteful retries.
   - Verifies 28-second deadline abort handling and skipped retry when remaining time is under 8 seconds.

### B. API Route Tests (`tests/api/`)
1. **`analyze-route.test.ts` (11 tests)**
   - Enforces POST only (returns 405 Method Not Allowed with `Allow: POST` header for GET, PUT, DELETE, OPTIONS).
   - Enforces `application/json` Content-Type (returns 400).
   - Rejects payloads exceeding 8 KB limit (returns 413).
   - Enforces same-origin policy (returns 403 Forbidden for foreign Origins).
   - Enforces rate limiting (returns 429 with `Retry-After`).
   - Returns 200 with structured analysis and audit receipt for valid input.
   - Returns calm support payload for self-harm queries without invoking Gemini.
2. **`health-route.test.ts` (1 test)**
   - Returns 200 OK with status `ok` and valid ISO timestamp.

### C. Component Integration Tests (`tests/components/`)
1. **`type-picker-and-workspace.test.tsx` (7 tests)**
   - Verifies type picker starts with no pre-selected option on fresh visits.
   - Verifies 900ms confirmation timer with animated checkmark and selection change resets.
   - Verifies returning to the type picker shows an outline without a checkmark.
   - Verifies form validation and inline helper errors.
   - Verifies skipping optional context and certainty rating screens.
   - Verifies payload dispatched to `/api/analyze` NEVER contains `certaintyBefore`.
   - Verifies rendering of calm `SupportCard` without analysis tabs or save controls when crisis keywords are detected.
2. **`results-and-safe-rendering.test.tsx` (5 tests)**
   - Verifies mutual exclusivity of triage states ("Worth investigating" vs "Already considered").
   - Verifies that Next Steps investigation checklist includes ONLY findings marked "Worth investigating".
   - Verifies grounded citations are rendered with `<mark>` tags in the "In your words" tab.
   - Verifies safe HTML escaping without script injection or DOM element generation.
   - Verifies badge labels for `inferred` and `unknown` basis findings.
3. **`auth-and-brand.test.tsx` (2 tests)**
   - Tests accessibility and keyboard navigation in `SignInModal` (focus trapping and Escape restoration).
   - Verifies Header brand link navigates back to landing view without clearing draft answers in `sessionStorage`.

---

## 3. Test Coverage & Thresholds

Coverage thresholds are defined in `vitest.config.ts` for `lib/**`:
- **Line Coverage Target:** $\ge 85\%$
- **Branch Coverage Target:** $\ge 80\%$

### Current Verified Coverage Results
- **Statements:** $\mathbf{79.22\%}$ overall across entire project ($\mathbf{92.15\%}$ for `lib/**`)
- **Branches:** $\mathbf{79.14\%}$ overall across entire project ($\mathbf{83.33\%}$ for `lib/**`)
- **Lines:** $\mathbf{79.22\%}$ overall across entire project ($\mathbf{92.15\%}$ for `lib/**`)
- **Functions:** $\mathbf{66.90\%}$ overall across entire project

### Coverage Exemptions
- **`lib/server/gemini.ts`:** Excluded because live calls to Gemini require active API keys and live network access. The module's contract and error mapping are tested via upstream mocks in `tests/unit/analyze.test.ts` and `tests/api/analyze-route.test.ts`.
- **`lib/types.ts`:** Excluded because it contains pure TypeScript interface and type declarations with zero runtime executable lines.

---

## 4. Mutation Sanity Check Results

To verify that the test suite provides meaningful protection rather than tautological mock assertions, five targeted mutations were tested:

| Mutation | Component Under Test | Expected Failure | Actual Result | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **(a) Remove 1 directive pattern (`you_should`)** | `lib/server/guard.ts` | `guard.test.ts` fails to detect directive phrase | `AssertionError: expected [] to include 'you_should'` | **PASS (Failed as expected; reverted)** |
| **(b) Accept evidence quotes without verifying** | `lib/server/grounding.ts` | `grounding.test.ts` fails grounded span verification | 6 tests failed (`expected +0 to be 2`, `expected 'decision' to be 'reasons'`) | **PASS (Failed as expected; reverted)** |
| **(c) Disable same-origin check (`return true`)** | `lib/server/requestGuard.ts` | `requestGuard-env-logger.test.ts` & `analyze-route.test.ts` fail | `AssertionError: expected true to be false` and `expected 500 to be 403` | **PASS (Failed as expected; reverted)** |
| **(d) Include `certaintyBefore` in workspace payload** | `components/Workspace.tsx` | `type-picker-and-workspace.test.tsx` fails security check | `AssertionError: expected 4 to be undefined` | **PASS (Failed as expected; reverted)** |
| **(e) Make rate limiter never block requests** | `lib/server/rateLimit.ts` | `sanitizer-safety-rateLimit.test.ts` & `analyze-route.test.ts` fail | `AssertionError: expected true to be false` and `expected 500 to be 429` | **PASS (Failed as expected; reverted)** |

---

## 5. Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with full v8 coverage report
npm run test:coverage
```
