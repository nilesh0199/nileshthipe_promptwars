# Architecture & Product Decisions

## D1: Guest-First Access
- **Context:** Users facing decisions need immediate thinking assistance without upfront friction.
- **Decision:** No login wall before completing analysis. Guests can access all analytical features immediately; saving is an optional capability added later.
- **Consequence:** Eliminates onboarding drop-off while requiring client-side and session storage to handle unauthenticated workflows gracefully.

## D2: Unified Findings Array
- **Context:** Gemini produces multiple cognitive categories (assumptions, tensions, blind spots, missing information).
- **Decision:** Use a single unified `findings` array in the AI schema with a `type` discriminator; the UI groups them visually, and the action checklist is built directly from each finding's `investigation_item`.
- **Consequence:** Simplifies schema parsing and type safety while giving the UI total flexibility in rendering and triage filtering.

## D3: Programmatic Neutrality Enforcement
- **Context:** The product must strictly avoid recommending, choosing, or judging outcomes for the user.
- **Decision:** Neutrality is strictly enforced by schema (prohibiting verdict/score/ranking fields), a server-side regex/phrase guard against directive language, and a server-computed neutrality receipt. Model self-attestation is never trusted.
- **Consequence:** Eliminates directive AI hallucinations and ensures compliance even if the underlying model drifts.

## D4: Grounded User Substring Quotes
- **Context:** Generic AI feedback often feels detached from the user's specific context or hallucinates premises.
- **Decision:** Every finding must cite a quote from the user's input; the server verifies all quotes are genuine verbatim substrings of the user's submitted text and drops any findings that fail verification.
- **Consequence:** Guarantees that every finding is provably grounded in the user's actual words and eliminates ungrounded feedback.

## D5: Constrained Service Perimeter
- **Context:** Minimizing complexity, third-party vendor risks, and external point failures during the solo build.
- **Decision:** Use only Google services (Gemini API, Firebase Auth/Firestore) and Vercel for hosting. No Redis, Sentry, or third-party monitoring/state tools.
- **Consequence:** Drastically reduced architectural surface area, fewer environment variables, and predictable deployment guarantees.

## D6: Best-Effort In-Memory Rate Limiting
- **Context:** Protecting serverless API routes against spam without introducing external key-value databases like Redis.
- **Decision:** Implement best-effort in-memory rate limiting per serverless function instance and document the limitation.
- **Consequence:** Avoids external dependencies while providing basic burst mitigation across running serverless lambdas.

## D7: Decision Type Lenses
- **Context:** Different categories of decisions (study, career, money, life) have characteristic blind spots.
- **Decision:** Decision type changes what the AI is asked to look for via lens hints; lenses are applied only where relevant.
- **Consequence:** Provides more relevant, nuanced examination while keeping the analysis structured and non-directive.

## D8: Self-Reported Certainty Isolation
- **Context:** Users may want to track how certain they felt before the analysis versus after.
- **Decision:** certaintyBefore is self-reported, optional, never sent to the AI, to avoid nudging the analysis.
- **Consequence:** Preserves pure neutrality in AI prompts and prevents anchoring biases.

D9: Single main branch. Solo, short competition. Work is committed by the developer and pushed once the project is ready.

## D11: Guided Input Flow
- **Context:** The previous multi-field form showed several equal text boxes at once, leading to overlapping input (facts, doubts, constraints) and feeling like a homework worksheet.
- **Decision:** Guided input: one question per screen with four data fields (decision, reasons, context, certaintyBefore). The old facts/doubts/constraints fields overlapped and made the form feel like homework. AI follow-up questions will be added later as extra screens only when needed.
- **Consequence:** Provides a focused, calm interview pace, cleaner data extraction, and an easily extensible screen pipeline.

## D12: Typography Scale
- **Context:** Small text (12-14px) strained readability and weakened the editorial aesthetic.
- **Decision:** Type scale: body 17px, inputs 18px, nothing below 15px.
- **Consequence:** Guarantees effortless readability, meets strict AA contrast across all viewport sizes, and elevates the product's visual presence.

## D13: Structured JSON Schema via generateContent
- **Context:** Structured, reliable analysis output is required from Gemini without using unstable or changing experimental APIs.
- **Decision:** Use `ai.models.generateContent` with OpenAPI 3.0 structured JSON schema (`responseMimeType: "application/json"`, `responseSchema`) instead of the experimental Interactions API.
- **Consequence:** Stable, type-safe execution conforming to official `@google/genai` SDK contracts and strict server validation.

## D14: Server-Assigned IDs and Quote Verification
- **Context:** The model could hallucinate non-unique identifiers or quote passages not present in user input.
- **Decision:** Findings returned by the model do not contain IDs; the server assigns IDs sequentially (`r1..`, `f1..`) after validating and verifying quotes against verbatim normalized substrings of the input text. Quotes not found in the input are dropped; findings without surviving quotes are cleanly downgraded to `basis: "inferred"`.
- **Consequence:** Zero hallucinated quotes reach the user, IDs are deterministic and clean, and findings remain grounded in reality.

## D15: Server-Computed Neutrality Receipt
- **Context:** Trusting self-reported AI neutrality or unverified compliance can fail silently if the model hallucinates neutrality.
- **Decision:** The server, not the model, evaluates non-directive compliance via phrase scanning and audits grounding coverage, returning a transparent audit trail (`receipt`) with every analysis response.
- **Consequence:** Model self-attestation is bypassed; client and auditing systems obtain deterministic proof of compliance and quote grounding.

## D16: Configurable Thinking Level
- **Context:** Complex human decisions require deliberate, deep reasoning, but latency and cost needs may vary across deployment environments.
- **Decision:** Pass `ThinkingConfig` with a configurable thinking level (`low`, `medium`, `high`, defaulting to `medium`) to Gemini 2.5 thinking-capable models via `GEMINI_THINKING_LEVEL`.
- **Consequence:** Ensures thorough, unhurried reasoning across unstated assumptions and cognitive tensions while allowing operational tuning.

## D17: Strict Request and Response Schemas
- **Context:** Input tampering, accidental leakage of private reflection states (like `certaintyBefore`), or unexpected model keys could corrupt analysis.
- **Decision:** Input schema is strict (`.strict()`): unknown keys, including `certaintyBefore`, are rejected with HTTP 400. Model output is validated against a strict Zod schema that forbids recommendation, score, or ranking fields.
- **Consequence:** Ironclad non-directive compliance, complete protection of user reflection privacy, and guaranteed payload integrity.

## D18: Final Results Experience and Grounded Evidence Linking
- **Context:** The developer preview JSON needed replacement with a polished, trustworthy results screen allowing users to triage blind spots and formulate personal next steps.
- **Decision:** Provide four accessible tabs (Findings, In your words, Premortem, Next steps) with client-side mutually exclusive triage ("Worth investigating", "Already considered", "Not relevant"), bidirectional navigation between findings and annotated verbatim evidence spans, personal synthesis textarea, and exportable checklist notes. Saving remains an explicit stub until authentication is built.
- **Consequence:** Users retain complete agency over their thinking, zero directive advice is given, and every observation remains grounded in the user's verified text.

## D19: Product Rebrand to Perspectra
- **Context:** The product needed a distinctive, evocative brand identity reflecting its core purpose of illuminating overlooked angles and ranges of perspective.
- **Decision:** Renamed the product from Second Look to Perspectra. The name combines 'perspective' and 'spectra' (a range of views), matching the product's purpose of showing a wider view of a decision.
- **Consequence:** Rebranded user-facing copy, headers, monogram, storage keys, and documentation to Perspectra while retaining strict non-directive reflection architecture.

## D20: Client-Direct Private Saving via Owner-Only Firestore
- **Context:** Guests should be able to use the entire product without friction, while signed-in users can securely persist and update analyses.
- **Decision:** Guest-first with optional Google sign-in; saving writes directly from the client to Firestore, protected by owner-only rules; there are no server-side writes.
- **Consequence:** Full guest functionality is preserved without requiring account creation, backend complexity is minimized, and user documents remain strictly isolated under authenticated user UIDs.

## D21: Client-Side Sorting of Saved Analyses
- **Context:** Querying Firestore with combined `where` and `orderBy` on different fields requires creating composite indexes.
- **Decision:** The saved list is sorted in client code to avoid needing a composite Firestore index.
- **Consequence:** Eliminates index deployment prerequisites while safely ordering user analyses up to the query limit.

## D22: Type Picker Confirmation, Brand Navigation, and Responsive Desktop Layout
- **Context:** User testing indicated that defaulting the type picker pre-selected "career", which misled users. Furthermore, users navigating via the brand logo needed a smooth way to return to the landing page without losing their draft, and large screens had cramped single-column workspaces.
- **Decision:** Type picker: no default selection; the check mark is a 900ms confirmation, then auto-advance. Brand link returns to the landing view without clearing the draft. Desktop workspace aligned to the header width with a two-column question layout. Results view expands to max-w-6xl with 2-column finding cards on desktop (xl:grid-cols-2).
- **Consequence:** Eliminates unintentional default bias, preserves user draft state across navigation, improves readability on standard desktop monitors (1366x768 and 1280x720) without requiring scrolling, and retains comfortable single-column ergonomics on mobile.

## D23: Best-effort in-memory rate limiting with generous defaults, because judges may share an IP and the limit is per instance.
- **Context:** Automated abuse can drain Gemini token quotas or burden serverless instances, while hackathon judges or teams in an office may share a single public IP.
- **Decision:** In-memory rate limiting per server instance with generous defaults (20 requests per 10 minutes in production, 120 in non-production) and a global per-instance hourly ceiling (300).
- **Consequence:** Prevents runaway compute and rapid abuse on individual instances without blocking legitimate evaluation or multi-user shared IPs, documented honestly as best-effort on serverless.

## D24: Same-origin and content-type checks instead of CSRF tokens, since the API takes JSON and carries no cookies.
- **Context:** Protecting API endpoints from cross-site invocation without introducing unnecessary stateful anti-CSRF token ceremonies.
- **Decision:** Enforce JSON Content-Type validation and strict same-origin verification (comparing Origin header host against request Host and optional ALLOWED_ORIGINS), permitting missing Origin headers for local/curl testing.
- **Consequence:** Neutralizes cross-origin browser form hijacking and ambient script attacks efficiently without cookie or token overhead.

## D25: The server returns the sanitised text that evidence spans refer to.
- **Context:** Stripping control and invisible zero-width characters prior to validation and grounding could cause client text indices to misalign with server evidence spans.
- **Decision:** The server sanitises inputs (Unicode NFC and character removal) before validation, and returns `{ kind: "analysis", analysis, receipt, input: { decision, reasons, context } }` containing the exact sanitised text.
- **Consequence:** Guaranteed character-offset alignment for visual highlight marks in the "In your words" tab without visual text corruption.

## D26: Crisis-language fallback: no model call, no analysis, no saving; helpline details verified.
- **Context:** Users experiencing acute emotional distress or self-harm ideation need genuine human care and verified support rather than an AI decision thinking tool.
- **Decision:** Intercept explicit first-person crisis language on the server before Gemini is invoked. Return a calm support card with verified free helplines (Tele-MANAS for India and local emergency directions) with no analysis UI, no saving options, and no model calls.
- **Consequence:** Protects vulnerable individuals immediately while respecting privacy (texts are never logged or stored anywhere).

## D27: CSP with unsafe-inline scripts as a documented compromise.
- **Context:** Content Security Policy helps mitigate XSS, but Next.js App Router relies on inline scripts for hydration bootstrap without runtime nonces.
- **Decision:** Allow 'unsafe-inline' for scripts in CSP as a documented compromise, while disallowing object-src, frame-ancestors, and restricting connect-src and frame-src to verified Google domains.
- **Consequence:** Maintains full compatibility with Next.js hydration and Google OAuth popups while documenting nonce-based CSP as a planned future improvement.

## D28: Test Suite Overhaul with Vitest and Branch Coverage Thresholds
- **Context:** The initial testing relied on a single runner file with limited assertions. Robust verification of product principles (non-directive advice guard, grounding verification, exclusion of certaintyBefore from Gemini payloads, and request guards) required a standard, comprehensive test suite.
- **Decision:** Adopt Vitest with v8 coverage provider and React Testing Library in jsdom. Enforce coverage thresholds (>= 85% lines, >= 80% branches for `lib/**`), excluding `server/gemini.ts` which requires a live API key and live network access. Validate tests using mutation sanity checks across 5 core safety invariants.
- **Consequence:** Provides fast, high-confidence regression prevention (97 tests across 13 suites) and automated CI gating on `npm run test:coverage`.

## D29: Brand mark: two-faces emblem (warm and cool halves) representing two perspectives, shown as a rounded dark badge so it works on the light header.
- **Context:** The placeholder letter "P" monogram was temporary. A distinctive visual identity was needed to reinforce Perspectra's core metaphor: examining decisions through dual complementary perspectives.
- **Decision:** Replace text monograms in the Header and SignInModal with a unified emblem image (`public/brand/logo-mark.png`, 256x256 square dark badge with rounded corners). Keep the image decorative (`alt=""`) because the surrounding elements already provide accessible screen-reader names ("Perspectra, home" / "Perspectra Account"). Utilize Next.js App Router file-based metadata (`app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`) for crisp multi-resolution favicons and tab icons without manual `<link>` tags.
- **Consequence:** Provides immediate brand recognition, crisp rendering at standard and high-DPI displays (100% and 200% zoom), and preserves strict accessibility landmarks and layout stability.

## D30: Email/password and Google sign-in; the name is collected at sign-up; an optional profile (name, age, profession) lives in profiles/{uid}; no photos; profile data is never sent to the AI.
- **Context:** While Google sign-in was convenient, users without Google accounts or wishing to remain decoupled from Google OAuth requested direct email/password access. Furthermore, users wanted to personalize their account name and optional profile metadata (age, profession) without exposing personal data to AI models.
- **Decision:** Support email/password accounts alongside Google sign-in in an accessible two-mode AuthModal ("Log in" and "Create account"). Capture the user's name during sign-up and enforce password strength (minimum 8 characters). Store optional profile details in `profiles/{uid}` in Firestore. Strict product boundary: profile metadata is strictly account-only and is NEVER included in `/api/analyze` request payloads, prompts, or saved analysis documents. Profile photos are explicitly omitted (photoURL is never loaded or rendered).
- **Consequence:** Broadens user access, provides personalized identity and private profile management, and strictly maintains user privacy by guaranteeing zero profile data transmission to AI models.

## D31: All credential failures show the same message to avoid account enumeration.
- **Context:** Distinct error messages for non-existent emails versus wrong passwords allow malicious actors to probe and enumerate registered user accounts.
- **Decision:** Map all credential failures (`auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found`) to the identical calm message: "Email or password is incorrect." Password reset queries always announce "If an account exists for that email, we've sent a reset link." regardless of whether the account exists.
- **Consequence:** Neutralizes account enumeration and brute-force targeting while maintaining a calm, clear user experience.

## D32: Sign-out clears all user-scoped client state and cancels pending writes; user-specific state is keyed by user id so accounts never bleed into each other.
- **Context:** In shared or public device scenarios (libraries, shared family computers, Internet cafes), signing out of an account must immediately and completely eliminate all private draft data, pending background saves, and cached Firestore results. If unhandled, debounced background writes could flush user A's edits into user B's account after sign-in, and lingering client storage (`perspectra_workspace_v2`, `perspectra_pending_save_v1`) would expose sensitive decision notes to the next user.
- **Decision:** Establish a centralized client state reset mechanism in `lib/clientState.ts` (`clearUserScopedClientState()`, `cancelPendingWriteTimers()`). On `signOut()`, AuthProvider cancels all pending debounced timers, signs out of Firebase Auth, purges all client storage keys, increments a provider-level `sessionEpoch` to force remounting of in-memory workspace and results state, redirects to `/`, and announces sign-out in an `aria-live="polite"` region. Additionally, all user-specific pages (`/saved`, `/saved/[id]`, `/profile`) bind state lifecycle to `user?.uid`, resetting private datasets immediately whenever the active user changes or signs out.
- **Consequence:** Eliminates cross-account data leakage and race conditions on shared workstations while preserving guest workflows up until explicit sign-out.

## D33: Email verification removed for now: no feature depends on a verified address, and the flow was unreliable. Revisit if a feature requires verified accounts.
- **Context:** Automated email verification links dispatching upon account creation added user friction and deliverability edge cases. No product feature (thinking tool, guest workflows, private cloud saving, or profiles) requires or gates on verified email addresses.
- **Decision:** Remove the verification email dispatch on sign-up, remove the resend verification cooldown mechanism, delete the verification reminder banner component, and remove unverified badge indicators from the UI. Keep password reset intact with neutral messaging that never reveals whether an account exists.
- **Consequence:** Simplifies account onboarding and improves reliability while maintaining account security; can be revisited if future features strictly require verified email identities.

## D37: Pending-save hardening: metadata, 10-minute expiry, strict single-execution guard, dismissal clearing
- **Context:** When a guest user clicks "Save this analysis", the pending payload is held in browser `sessionStorage` until sign-in completes. Without strict controls, an abandoned modal or subsequent sign-in from a different flow (such as the header button) on a shared workstation could cause a subsequent user to inadvertently claim and persist the previous guest's private decision data. Additionally, React StrictMode or concurrent rendering could trigger duplicate save executions.
- **Decision:** Harden the pending-save lifecycle:
  1. Payload metadata: The stored item in `sessionStorage["perspectra_pending_save_v1"]` carries `{ data, createdAt: timestamp, initiatedBySave: true }`.
  2. Save-flow origin binding: Only sign-ins initiated explicitly from the Save flow (`isSaveInitiatedRef` guard) can consume the pending payload; opening the modal from the Header or any other route immediately purges or ignores pending saves.
  3. Immediate dismissal clearing: Closing the modal without signing in ("Not now" button, Close "X" button, Escape key, or backdrop click) immediately purges the pending payload from `sessionStorage` and cancels save initiation.
  4. 10-minute expiry: Payloads older than 10 minutes (`PENDING_SAVE_EXPIRY_MS = 600,000`) are rejected, purged from storage, and never saved.
  5. Single-execution guard: An in-flight consumption lock (`isConsumingRef`) guarantees that upon sign-in, `saveAnalysis` is invoked exactly once, preventing race conditions or duplicate document creation under React StrictMode double mounts.
  6. Failure resilience: If saving fails due to network or Firestore errors, the payload is preserved until the 10-minute expiry and an error message with a "Try again" button is displayed so the user never loses their reflection data.
  7. Sign-out purging: Explicit sign-out continues to purge all application storage keys.
- **Consequence:** Eliminates stale payload claiming and cross-user data leakage on shared workstations, protects against duplicate Firestore writes, and preserves user data through network retries.

## D34: Results redesign: compact two-column findings with expandable details on desktop (masonry), a bottom navigation bar and compact cards on mobile, certainty-after moved to Next steps
- **Context:** The previous results view presented findings in a tall single column, requiring excessive vertical scrolling to triage cards. Additionally, on mobile viewports, top tabs competed with header space and were difficult to reach with one hand. The post-analysis certainty prompt also distracted from the immediate findings in the header.
- **Decision:** Redesign results layout:
  1. Desktop (>= 1024px): 2-column masonry layout (`columns-1 lg:columns-2 gap-4 [column-fill:_balance]`), compact finding cards showing title, basis tag, clamped 3-line observation, and 3 min-44px triage buttons with checkmark (`✓`) and ink-blue fill on selection. Expand button reveals full grounded evidence, paraphrase, "Why it matters", "A question to sit with", and "What you could check".
  2. Mobile (< 1024px): Replace top tabs with a fixed bottom navigation bar (`<nav aria-label="Results sections">` with `<div role="tablist">`), 24px inline SVG icons, text labels >= 15px, 3px top active indicator, and live count badges for findings and checklist items. Filter chips collapse into a native `<select>` dropdown labelled "Show:".
  3. Header & Certainty: Summary title clamped to 2 lines on desktop / 3 lines on mobile with "Read more" / "Show less" toggle. Neutrality receipt compressed to a single slim line. "How sure do you feel right now?" moved into the Next steps tab, showing an "Earlier: X / 5" badge, 1-5 selector, and non-directive advisory copy.
- **Consequence:** Substantially reduces scrolling, places navigation in thumb zone on mobile, keeps header editorial and calm, and aligns with mobile accessibility guidelines.

## D35: Analysis reliability: single in-flight request, separate handling of upstream quota (AI_QUOTA) and overload with one retry, optional fallback model
- **Context:** Rapid double-clicks on submit could fire duplicate requests to `/api/analyze`. Upstream Gemini responses can fail due to temporary rate limits/quota (HTTP 429) or transient server overload (HTTP 503/5xx). Treating 429 like 503 by immediately retrying the same model burns remaining tokens and quota needlessly.
- **Decision:**
  1. Client single-flight guard: An `isSubmittingRef` ref and disabled button states prevent double submissions from double clicks or key repeats.
  2. Differentiated upstream errors: Distinguish `AIQuotaError` (status 429) from `AIUnavailableError` (status 5xx).
  3. Upstream 429 quota: Never retried on the same model. If an optional `GEMINI_FALLBACK_MODEL` is configured and budget remains (>= 8s), attempts the fallback model once with `{ model_fallback_used: true }`. Otherwise, returns HTTP 503 with code `AI_QUOTA`, header `Retry-After: 30`, and user copy: "The AI service has reached its limit for now. Please wait a minute and try again."
  4. Upstream 5xx overload: Retried once after 1.5s delay if remaining request time >= 9.5s. If both attempts fail and `GEMINI_FALLBACK_MODEL` is configured with remaining time >= 8s, attempts the fallback model once. Otherwise throws `AIUnavailableError` (HTTP 503 `AI_UNAVAILABLE`).
- **Consequence:** Prevents duplicate request storms, protects upstream quota, gracefully degrades through fallback models when available, and provides informative retry feedback.

## D36: Copy notes format is a pure function with numbered items and explicit empty states
- **Context:** Users need to export their decision reflection and checklist for offline use or pasting into personal notes apps. Markdown or HTML formatting copies awkwardly into plain text editors and email clients.
- **Decision:** Implement `formatNotes()` in `lib/notes.ts` as a pure, deterministic function producing clean plain text with double newline separation. Sections include: title, decision summary, numbered checklist of items triaged as "Worth investigating" (with parenthesized finding title), notes from "Where my thinking is now", and closing thought. Any section without content produces an explicit, calm fallback ("Nothing selected. I haven't marked any finding as worth investigating yet." / "Nothing written yet."). Zero markdown syntax or HTML tags are emitted.
- **Consequence:** 100% testable in isolation without DOM or clipboard dependencies, clean formatting across all destination editors, and clear attribution of the user's reflection.

## D38: Opaque site header and sticky results tab bar alignment; fallback model documentation without hard-coded defaults
- **Context:** Semi-transparency and backdrop blur on the sticky site header allowed page text and cards to bleed through during scrolling. Furthermore, on the results page, the desktop tab bar must stay pinned directly under the site header without gaps or overlaps across desktop resolutions (such as 1366x768 and 1920x1080). In configuration documentation, specific deprecated or changing model identifiers in fallback examples risk obsolescence.
- **Decision:**
  1. Header opacity & geometry: Make `<header>` fully opaque (`bg-[#faf8f5]`, no transparency, no `backdrop-blur-*`), with sticky behaviour, 1px bottom border (`border-b border-[#dbd4c7]`), and explicit 64px height (`h-16`).
  2. Desktop results tab bar: Position with `sticky top-16 z-20 bg-[#faf8f5]` and 1px bottom border, seamlessly meeting the header bottom border with zero gap and zero overlap at all desktop resolutions.
  3. Fallback model examples: Replace specific model examples with `your-fallback-model-id` and comment `use a stable model ID listed in Google AI Studio` in `.env.example` and `README.md`. No specific model name is hard-coded as a default in fallback code.
- **Consequence:** Clean, calm editorial reading experience without text bleeding on scroll, reliable desktop tab positioning, and clear model configuration instructions.

## D39: Removal of 1–5 certainty rating scale; prominent landing CTA ('Examine my decision'); end-of-tab sequential navigation
- **Context:**
  1. The 1–5 confidence rating was asked before analysis (`certaintyBefore`) and again after analysis (`certaintyAfter`). The before-rating was never used as input to Gemini (and strictly rejected at the API boundary), serving solely to compute an "Earlier: X / 5" badge. In practice, the post-analysis prompt was easily overlooked in the final tab, added unnecessary friction, and did not contribute to analytical inquiry.
  2. The landing page CTA "Start exploring" sounded passive and did not clearly convey the tool's core purpose of examining an impending decision.
  3. On the results page, users had to scroll back up to the top tab bar to advance to the next section after finishing reading a tab's content.
- **Decision:**
  1. Primary CTA: Renamed to "Examine my decision" with larger, bolder typography and generous touch target size (52–56px height, `text-[18px] sm:text-[20px] font-bold`), immediately drawing focus.
  2. Streamlined interview flow: Removed the 5th certainty screen from `WORKSPACE_SCREENS`. The interview now consists of 4 focused screens (Decision area, Stated decision, Drawing reasons, Additional context). On the context screen, "Show me another perspective" triggers analysis directly, and "Skip" allows proceeding without optional context.
  3. Removed certainty rating from results: Removed the 1–5 slider and "Before analysis" badge from `NextStepsTab`. Retained the prioritized investigation checklist, personal reflections textarea, and note export.
  4. End-of-tab sequential navigation: Added prominent forward navigation buttons at the bottom of each tab panel (Findings &rarr; Your words &rarr; Premortem &rarr; Next steps) and previous navigation buttons, smoothly scrolling to top and focusing headings on change.
- **Consequence:** Faster path from prompt to analysis, zero artificial metric distractions, improved reading ergonomics on long findings pages, and clear call-to-action on the landing screen.