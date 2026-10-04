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