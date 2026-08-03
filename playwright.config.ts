import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", fullyParallel: true, workers: 2, retries: process.env.CI ? 2 : 0, reporter: process.env.CI ? "github" : "list", timeout: 45000,
  use: { baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000", trace: "on-first-retry", screenshot: "only-on-failure" },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run dev", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, timeout: 120000 },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
