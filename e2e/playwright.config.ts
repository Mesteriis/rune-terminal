import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: "../test-results/playwright",
  use: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    trace: "retain-on-failure",
  },
});
