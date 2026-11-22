import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["apps/engine/src/**/*.render.test.ts"],
    testTimeout: 180000,
  },
});
