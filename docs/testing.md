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
   - Server environment: validates parsing, production vs development defaults, thinking levels, custom rate limits, origin whitelist, fallback model validation, and error shielding.
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
8. **`notes.test.ts` (6 tests)**
   - Verifies deterministic plain text format for personal decision exports.
   - Asserts numbered checklist for items triaged as "Worth investigating" with parenthesized finding title.
   - Asserts explicit empty state messages for unselected checklist and blank thinking notes.
   - Verifies zero HTML or Markdown formatting in copied text.
9. **`analyze.test.ts` (10 tests)**
   - Simulates end-to-end analysis orchestration with mocked Gemini responses.
   - Tests retry recovery when initial attempt contains directive language or malformed JSON.
   - Verifies upstream 429 quota error throws `AIQuotaError` immediately without retrying the same model.
   - Verifies upstream 5xx overload is retried once after 1.5s delay when time permits, throwing `AIUnavailableError` if both fail.
   - Verifies transparent fallback model invocation on 429 or exhausted 5xx when `GEMINI_FALLBACK_MODEL` is configured and budget remains (>= 8s), marking `model_fallback_used: true` in audit receipt.
   - Verifies 28-second deadline abort handling and skipped retry when remaining time is under 8 seconds.

### B. API Route Tests (`tests/api/`)
1. **`analyze-route.test.ts` (13 tests)**
   - Enforces POST only (returns 405 Method Not Allowed with `Allow: POST` header for GET, PUT, DELETE, OPTIONS).
   - Enforces `application/json` Content-Type (returns 400).
   - Rejects payloads exceeding 8 KB limit (returns 413).
   - Enforces same-origin policy (returns 403 Forbidden for foreign Origins).
   - Enforces rate limiting (returns 429 with `Retry-After`).
   - Upstream 429 quota handling: returns HTTP 503 with error code `AI_QUOTA`, header `Retry-After: 30`, and user advisory message.
   - Upstream 5xx overload handling: returns HTTP 503 with error code `AI_UNAVAILABLE`.
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
   - Verifies grounded citations are rendered with `<mark>` tags in the "Your words" tab.
   - Verifies safe HTML escaping without script injection or DOM element generation.
   - Verifies badge labels for `inferred` and `unknown` basis findings.
3. **`results-redesign.test.tsx` (11 tests)**
   - Verifies single-flight submission guard in `Workspace`: rapid double-clicks on submit invoke `/api/analyze` exactly once.
   - Verifies compact finding card rendering: title, type, basis tag, clamped observation, and 3 min-44px triage buttons with checkmark (`✓`) on selection.
   - Verifies expandable card details with `aria-expanded` and `aria-controls`.
   - Verifies "View highlighted in text" link navigates directly to the "Your words" tab and focuses evidence.
   - Verifies desktop filter chips with non-zero counts and `aria-pressed`, and mobile native `<select>` dropdown.
   - Verifies Next steps numbered `<ol>` checklist of investigation items and explicit empty state when none are marked.
   - Verifies mobile bottom navigation (`<nav aria-label="Results sections">`), count badges, and keyboard arrow switching.
   - Verifies "Copy my notes" clipboard integration, formatted plain text, 2s "Copied" alert, and manual copy textarea fallback.
4. **`auth-and-brand.test.tsx` (3 tests)**
   - Tests accessibility and keyboard navigation in `SignInModal` (focus trapping and Escape restoration).
   - Verifies Header brand link navigates back to landing view without clearing draft answers in `sessionStorage`.
   - Verifies brand mark logo image (`/brand/logo-mark.png`) renders with decorative alt attributes in both Header and `SignInModal`.
5. **`auth-modal-and-profile.test.tsx` (8 tests)**
   - Verifies auth modal mode switching, password visibility toggle, and input validations.
   - Verifies sign-up creates user, sets display name, and creates profile document without email verification calls.
6. **`pending-save-hardening.test.tsx` (9 tests)**
   - Verifies 10-minute pending-save expiry, save-flow origin binding, and single-execution guard.
   - Verifies save failure resilience with "Try again" retry.
7. **`sign-out-reset.test.tsx` (6 tests)**
   - Verifies sign-out cancellation of debounced write timers, clearing of browser state, and auth modal layout.

---

## 3. Test Coverage & Thresholds

Coverage thresholds are defined in `vitest.config.ts` for `lib/**`:
- **Line Coverage Target:** $\ge 85\%$
- **Branch Coverage Target:** $\ge 80\%$

### Current Verified Coverage Results
- **Statements:** $\mathbf{86.24\%}$ (4,578 / 5,308)
- **Branches:** $\mathbf{82.03\%}$ (872 / 1,063)
- **Lines:** $\mathbf{86.24\%}$ (4,578 / 5,308)
- **Functions:** $\mathbf{75.53\%}$ (142 / 188)
- **Total Tests:** 169 passing tests across 21 test files (0 failures).

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
