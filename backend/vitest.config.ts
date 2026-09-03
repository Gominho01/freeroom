import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integration suites share one Postgres instance and reset it in
    // beforeEach; running test files in parallel races those resets
    // against each other. Keep files sequential (tests within a file
    // still run in order, which they already relied on).
    fileParallelism: false,
  },
});
