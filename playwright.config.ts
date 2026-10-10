import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = vals.join("=").trim();
      }
    }
  }
}

/**
 * Playwright Configuration — Birthday Vibes
 *
 * - Automatically starts the Next.js dev server before running tests.
 * - Tests run against the local dev server on port 3000.
 * - The test suite targets isolated test routes only (no production Supabase data).
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 0,
  fullyParallel: false,

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /**
   * webServer: starts `npm run dev` automatically before the test run.
   * `reuseExistingServer: true` means if a dev server is already running
   * on port 3000 (e.g., you started it manually), Playwright will reuse it
   * rather than starting a second instance.
   */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
