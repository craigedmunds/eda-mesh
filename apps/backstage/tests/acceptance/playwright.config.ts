import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Backstage acceptance tests
 * Optimized for fast execution in Kargo verification environment
 * 
 * Centralized Environment Variables (provided by test runner):
 * - PLAYWRIGHT_ARTIFACTS_DIR: Base artifacts directory
 * - PLAYWRIGHT_SCREENSHOTS_DIR: Screenshot storage path
 * - PLAYWRIGHT_VIDEOS_DIR: Video storage path  
 * - PLAYWRIGHT_TRACES_DIR: Trace storage path
 * - PLAYWRIGHT_HTML_REPORT_DIR: HTML report output path
 * - TEST_RUN_ID: Unique test run identifier
 * 
 * Plugin tests should use these environment variables for consistent artifact storage.
 */
export default defineConfig({
  testDir: '../../',

  /* Test discovery patterns - updated for preserved directory structure */
  testMatch: [
    // Central acceptance tests
    'tests/acceptance/*.spec.ts',
    'tests/acceptance/*.test.ts',
    // Plugin tests with preserved structure
    'plugins/*/tests/acceptance/*.spec.ts',
    'plugins/*/tests/acceptance/*.test.ts'
  ],

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  // retries: process.env.CI ? 2 : 0,
  retries: 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['line'],
    ['json', { outputFile: process.env.TEST_RESULTS_DIR ? `${process.env.TEST_RESULTS_DIR}/results.json` : 'test-results/results.json' }],
    ['html', { 
      outputFolder: process.env.PLAYWRIGHT_HTML_REPORT_DIR || (process.env.TEST_RESULTS_DIR ? `${process.env.TEST_RESULTS_DIR}/html-report` : 'test-results/html-report'), 
      open: 'never' 
    }],
    // JUnit XML reporter for CI integration
    ['junit', { 
      outputFile: process.env.TEST_RESULTS_DIR ? `${process.env.TEST_RESULTS_DIR}/results.xml` : 'test-results/results.xml'
    }],
    // Note: Custom screenshots now handled by screenshot-helper.ts
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:7007',

    /* Ignore HTTPS certificate errors */
    ignoreHTTPSErrors: true,

    /* Collect trace only on failure to minimize auto-generated artifacts */
    trace: 'retain-on-failure',

    /* Take screenshot only on failure to minimize auto-generated artifacts */
    screenshot: 'only-on-failure',

    /* Video recording only on failure to minimize auto-generated artifacts */
    video: 'retain-on-failure',

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
            
            // Certificate and SSL handling
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--ignore-urlfetcher-cert-requests',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
    },
  ],

  /* Configure test artifact naming to be cleaner */
  // testIdAttribute: 'data-testid', // This property doesn't exist in Playwright config

  /* Note: Global teardown not needed with new screenshot helper approach */

  /* Global timeout for the entire test run */
  globalTimeout: 10 * 60 * 1000, // 10 minutes

  /* Timeout for each test */
  timeout: 2 * 60 * 1000, // 2 minutes per test

  /* Output directories - use centralized environment variables */
  outputDir: process.env.PLAYWRIGHT_ARTIFACTS_DIR || (process.env.TEST_RESULTS_DIR ? `${process.env.TEST_RESULTS_DIR}/artifacts` : 'test-results/artifacts'),
});