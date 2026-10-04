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