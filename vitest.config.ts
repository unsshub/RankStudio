import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: [
      "packages/*/src/**/*.test.{ts,tsx}",
      "apps/engine/src/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "apps/engine/src/**/*.render.test.ts",
      "e2e/**",
    ],
    testTimeout: 30000,
  },
});
