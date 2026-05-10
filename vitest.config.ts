import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // *.slow.test.ts files are excluded from the default suite — they take
    // tens of seconds and are run explicitly via `npm run test:slow`.
    exclude: ["e2e/**", "node_modules/**", "**/*.slow.test.ts"],
  },
});
