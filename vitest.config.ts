import { defineConfig } from "vitest/config";

// Only this project's tests. Without this, vitest also runs the test suites of the
// external projects cloned into repos/, which takes many minutes and fails here.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"] },
});
