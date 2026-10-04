import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html", "json-summary"],
      include: [
        "lib/**",
        "app/api/**",
        "components/Workspace.tsx",
        "components/safety/SupportCard.tsx",
        "components/results/**",
        "components/auth/**",
        "components/Header.tsx",
      ],
      // Excluded from coverage per Phase 7 specification:
      // lib/server/gemini.ts requires a real key and live network access.
      // lib/types.ts is purely type definitions with no runtime executable code.
      exclude: [
        "lib/server/gemini.ts",
        "lib/types.ts",
      ],
      thresholds: {
        "lib/**": {
          lines: 85,
          branches: 80,
        },
      },
    },
  },
});
