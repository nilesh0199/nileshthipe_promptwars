# Perspectra Security Architecture & Threat Model

This document outlines the security architecture, threat model, mitigations, known gaps, and manual deployment verification procedures for Perspectra.

---

## 1. Assets

1. **Gemini API Key (`GEMINI_API_KEY`):** Private server-side credential granting access to Google Gemini models.
2. **User Decision Reflections:** Private user text inputs (decisions, reasons, context, and self-reported certainty).
3. **Persisted Analysis Documents in Firestore:** Saved analysis outputs, personal synthesis notes, and triage records.
4. **User Identity & Auth Sessions:** Google OAuth tokens and Firebase user UIDs.
5. **Model Quota & Billing Budget:** Server resource consumption and API call volume on Google Cloud and Vercel.

---

## 2. Entry Points

- `POST /api/analyze`: Main analysis route processing user decision prompts.
- `GET /api/health`: Health status probe.
- Web Application Routes (`/`, `/saved`, `/saved/[id]`): Client-rendered React application.
- Direct Cloud Firestore Web Channel: Browser-to-Firestore queries and documents via the Firebase Web SDK.
- Google Authentication Popup: OAuth 2.0 flow via Firebase Authentication.

---

## 3. Threats and Mitigations

### Prompt Injection & Delimiter Manipulation
- **Threat:** Malicious inputs attempting to override system instructions, force directive recommendations, or exfiltrate prompts.
- **Mitigation:**
  - Strict input sanitisation (Unicode NFC normalization, stripping of control characters, zero-width spaces, and bidirectional-override characters).
  - Robust XML delimiter containment (`<user_decision>`, `<user_reasons>`, `<user_context>`) with character-escaping for literal XML delimiters in user input.
  - Hardened system prompt explicitly instructing Gemini to treat input enclosed in delimiters strictly as untrusted data to analyze, never as operational instructions.
  - Structured output enforcement using strict OpenAPI schema.
  - Post-generation programmatic guard (`lib/server/guard.ts`) scanning for directive advice and recommendation language.

### Broken Access Control in Firestore
- **Threat:** Unauthorized users reading, modifying, or deleting other users' saved analyses.
- **Mitigation:**
  - Owner-only declarative rules (`firestore.rules`): reads, creations, updates, and deletions require `request.auth != null && request.auth.uid == resource.data.uid` (or incoming `request.resource.data.uid`).
  - Immutability of ownership: `request.resource.data.uid == resource.data.uid` enforced on all document updates.
  - Server-side and client-side sanitisation of document models via `buildAnalysisDoc`, ensuring no extraneous fields or undefined properties exist.

### Cross-Site Scripting (XSS)
- **Threat:** Injected script execution via reflected AI outputs or user-supplied answers.
- **Mitigation:**
  - Absolute ban on `dangerouslySetInnerHTML`: all AI responses and user text are rendered strictly as native React text nodes.
  - Strict `Content-Security-Policy` with `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, and restricted connect/script endpoints.
  - Browser headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.

### CSRF & Cross-Origin API Calls
- **Threat:** Malicious third-party websites invoking `/api/analyze` using a user's browser session.
- **Mitigation:**
  - `checkMethod`: Only `POST` is accepted; non-POST requests receive HTTP 405 with an `Allow: POST` header.
  - `checkContentType`: Content-Type must contain `application/json`; form submissions (`multipart/form-data`, `application/x-www-form-urlencoded`) are rejected with HTTP 400.
  - `checkSameOrigin`: If an `Origin` header is present, its host must match the request `Host` or be listed in `ALLOWED_ORIGINS`. Foreign origins receive HTTP 403 `FORBIDDEN`.
  - The API carries no cookies and performs no credential-based ambient state actions.

### Cost Abuse and Denial of Service (DoS)
- **Threat:** Repeated rapid requests exhausting Gemini API quotas or causing runaway serverless compute costs.
- **Mitigation:**
  - Shared request guard enforcing an 8 KB payload cap (`MAX_BODY_BYTES = 8192`) on both `Content-Length` headers and raw body byte length.
  - In-memory rate limiting per server instance (`lib/server/rateLimit.ts`): enforces `RATE_LIMIT_MAX` per `RATE_LIMIT_WINDOW_SECONDS` per client IP (default: 20 per 10 minutes in production, 120 in non-production).
  - Global server instance circuit breaker: `RATE_LIMIT_GLOBAL_MAX` per hour (default: 300) returns 503 `AI_UNAVAILABLE` when exceeded.
  - Request timeouts capped at 25 seconds server-side and `maxDuration = 30` on the Next.js route handler.

### Sensitive Data in Logs and Saved Data
- **Threat:** Leakage of user answers, reflection ratings, or API credentials into application logs or database indices.
- **Mitigation:**
  - `certaintyBefore` is strictly for the user's reflection; it is never sent to Gemini and is rejected with HTTP 400 if included in requests to `/api/analyze`.
  - Structured logger (`lib/server/logger.ts`) logs only metadata (decision type and character length counts). User decision text and raw model prompts are never logged.
  - Sensitive credential keys (`key`, `token`, `secret`, `password`, `authorization`) are automatically redacted in logger output.
  - IP addresses and Origin headers are never logged in rate-limiting or forbidden events.

### Account Enumeration, Weak Passwords & Unverified Emails
- **Threat:** Malicious probing to enumerate registered user email addresses; brute-force attacks against weak passwords; spam/unverified accounts.
- **Mitigation:**
  - Strict anti-enumeration: All credential failure errors (`auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found`) return the identical neutral error message: "Email or password is incorrect."
  - Password reset always responds with "If an account exists for that email, we've sent a reset link." regardless of whether the account exists.
  - Password strength enforcement: client and server validation require at least 8 characters at account creation.
  - Email verification: automated verification links dispatched upon account creation, accompanied by a non-blocking dismissible reminder banner with a 60-second cooldown Resend button.
  - Rate limiting on authentication: Firebase Auth `too-many-requests` returns a calm waiting advisory without exposing internal rate counter metrics.

### Dependency Risks
- **Threat:** Exploitable vulnerabilities in third-party npm packages.
- **Mitigation:**
  - Automated dependency vulnerability audit step (`npm audit --audit-level=high`) in continuous integration (`.github/workflows/ci.yml`).
  - Zero-extra-dependency policy: minimal production dependency set (`@google/genai`, `firebase`, `zod`).

### Secrets Management
- **Threat:** Accidental leakage of `GEMINI_API_KEY` into client bundles or version control.
- **Mitigation:**
  - `GEMINI_API_KEY` has no `NEXT_PUBLIC_` prefix and is only imported and accessed in `lib/server/`.
  - Verified build artifacts confirm zero occurrences of `GEMINI_API_KEY` in `.next/static`.
  - All secrets documented strictly in `.env.example`.

---

## 4. Known Gaps

1. **In-Memory Rate Limiting is Per-Instance:**
   Because Vercel serverless functions spin up and scale across multiple isolated instances, in-memory rate limiting provides best-effort burst defense per instance rather than global cluster enforcement. Distributed Redis rate limiting or Vercel Edge Firewall rules are recommended for enterprise-scale traffic.
2. **Keyword-Based Safety / Crisis Fallback:**
   The crisis-language detector uses conservative first-person regex phrase matching. Automated keyword heuristics cannot catch every nuanced expression of emotional distress or self-harm ideation.
3. **CSP Allows Inline Scripts (`'unsafe-inline'`):**
   Next.js App Router currently relies on inline scripts for hydration bootstrap and font CSS injection without dynamic per-request nonces. Nonce-based CSP middleware represents a planned future hardening milestone.
4. **No External Penetration Testing:**
   The application has undergone automated security testing and threat modeling audits, but has not yet undergone a third-party commercial penetration test.
5. **Client-Side Firestore Writes Depend Entirely on Security Rules:**
   Because guest-first access is prioritized and saving is client-direct, data integrity and write authorization rely completely on Firestore Security Rules being correctly deployed.
6. **No Account or Profile Deletion:**
   Self-service account deletion and Firestore profile document deletion (`allow delete: if false` on `profiles/{uid}`) are intentionally out of scope in this phase.
7. **No Email-Verification Gating:**
   Unverified email accounts are permitted full access to thinking and saving features. Email verification is encouraged via a dismissible banner rather than hard gating.
8. **No Multi-Factor Authentication (MFA):**
   Multi-factor authentication (SMS, TOTP) is not implemented in this phase.

---

## 5. Manual Checks the Developer Must Do

Before deploying to production, complete the following manual checks:

- [ ] **Publish Firestore Rules:** Deploy `firestore.rules` via the Firebase Console or run `firebase deploy --only firestore:rules` to ensure owner-only rules are active in production.
- [ ] **Test Multi-Account Isolation:** Sign into Account A, save an analysis, and verify that Account B cannot read, list, update, or delete Account A's document.
- [ ] **Set Google Cloud Budget Alerts:** In the Google Cloud Console, configure budget alerts and daily quotas on the Gemini API to prevent unexpected billing.
- [ ] **Verify Production Environment Variables:** Verify `GEMINI_API_KEY`, `GEMINI_MODEL`, `NEXT_PUBLIC_FIREBASE_*`, and any custom `RATE_LIMIT_*` or `ALLOWED_ORIGINS` settings in the Vercel Project Settings.
- [ ] **Configure Vercel Firewall / WAF:** Review and enable Vercel Firewall DDoS and Rate Limiting rules at the edge for additional DDoS defense.
- [ ] **Verify Production Build Sign-In & Saving:** Test Google sign-in popup, saving, and auto-save on the live deployed URL to confirm that COOP (`same-origin-allow-popups`) and CSP headers function smoothly with Google Identity services.
