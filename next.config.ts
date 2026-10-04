import type { NextConfig } from "next";

/**
 * Builds the Content-Security-Policy header string with explicit dev/production differences.
 *
 * NOTE ON KNOWN COMPROMISE:
 * 'unsafe-inline' for script-src is a known compromise required for Next.js inline scripts
 * and font/hydration tags until nonce-based CSP middleware is implemented.
 * This is documented as a known gap in docs/security.md.
 */
function buildContentSecurityPolicy(): string {
  const isProd = process.env.NODE_ENV === "production";

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'", // Known compromise for Next.js inline hydration scripts
    "https://apis.google.com",
    !isProd ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const connectSrc = [
    "'self'",
    "https://*.googleapis.com",
    "https://*.firebaseapp.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firestore.googleapis.com",
    !isProd ? "ws://localhost:* http://localhost:*" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const directives: Record<string, string> = {
    "default-src": "'self'",
    "script-src": scriptSrc,
    "style-src": "'self' 'unsafe-inline'",
    "img-src": "'self' data:",
    "font-src": "'self' data:",
    "connect-src": connectSrc,
    "frame-src": "https://accounts.google.com https://*.firebaseapp.com",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'none'",
  };

  return Object.entries(directives)
    .map(([key, val]) => `${key} ${val}`)
    .join("; ");
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
