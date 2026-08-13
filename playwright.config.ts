import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", fullyParallel: true, workers: 2, retries: process.env.CI ? 2 : 0, reporter: process.env.CI ? "github" : "list", timeout: 45000,
  use: { baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000", trace: "on-first-retry", screenshot: "only-on-failure" },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: process.env.CI ? "npx next start" : "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport:{width:1440,height:900} } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
    { name: "mobile-430", use: { ...devices["Desktop Chrome"], viewport:{width:430,height:932}, isMobile:true, hasTouch:true } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport:{width:768,height:1024}, hasTouch:true } },
  ],
});
