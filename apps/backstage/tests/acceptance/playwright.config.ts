import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Backstage acceptance tests
 * Optimized for fast execution in Kargo verification environment
 */
export default defineConfig({
  testDir: './',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }]
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:7007',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on',

    /* Take screenshot always for debugging - force in headless mode */
    screenshot: 'on',

    /* Video recording */
    video: 'on',

    /* Timeout for each action */
    actionTimeout: 10000,

    /* Timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Add Chrome args for container environment
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',

            '--disable-gpu',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list'
          ]
        }
      },
    },
  ],

  /* Global timeout for the entire test run */
  globalTimeout: 10 * 60 * 1000, // 10 minutes

  /* Timeout for each test */
  timeout: 2 * 60 * 1000, // 2 minutes per test

  /* Output directories */
  outputDir: 'test-results/artifacts',
});