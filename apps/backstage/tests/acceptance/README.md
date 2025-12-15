# Backstage Unified Acceptance Tests

This directory contains the unified acceptance test system for Backstage E2E verification, designed for use in Kargo verification workflows. It discovers and runs tests from both central and plugin locations using a single Playwright installation.

## Purpose

The unified test system provides:
- **Unified test discovery** - Automatically finds tests in central and plugin directories
- **Single Playwright installation** - Avoids conflicts between multiple test setups
- **Fast execution** - Minimal dependencies, optimized for container environments
- **Kargo integration** - Designed to run in Kargo AnalysisRun verification
- **Comprehensive reporting** - Produces test reports, screenshots, and traces for debugging

## Unified Test Discovery

The system automatically discovers and runs tests from:

### Central Tests
- Location: `apps/backstage/tests/acceptance/*.spec.ts`
- Purpose: Core Backstage functionality tests
- Maintained by: Platform team

### Plugin Tests  
- Location: `apps/backstage/plugins/*/tests/acceptance/*.spec.ts`
- Purpose: Plugin-specific functionality tests
- Maintained by: Individual plugin teams

## How It Works

1. **Discovery**: The system scans both central and plugin directories for test files
2. **Unification**: All tests are copied to a single writable location (`/tmp/unified-tests/`)
3. **Execution**: Tests run using the single Playwright installation from the central directory
4. **Reporting**: All results are consolidated into unified reports and artifacts

## Structure

```
acceptance/
├── package.json          # Lightweight test dependencies
├── playwright.config.ts  # Unified Playwright configuration
├── tsconfig.json        # TypeScript configuration
├── basic.spec.ts        # Central acceptance tests
├── lib/                 # Shared utilities for all tests
│   └── auth-helper.ts   # Authentication utilities
├── plugins/             # Copied plugin tests (runtime only)
│   ├── eda/
│   └── image-factory/
└── README.md           # This file
```

## Plugin Test Integration

### For Plugin Developers

To add acceptance tests to your plugin:

1. **Create the test directory structure**:
   ```
   apps/backstage/plugins/your-plugin/
   └── tests/
       └── acceptance/
           └── your-plugin.spec.ts
   ```

2. **Write your test using Playwright and shared utilities**:
   ```typescript
   import { test, expect } from '@playwright/test';
   import { authenticateWithBackstage, suppressConsoleNoise, navigateAfterAuth } from '../../tests/acceptance/lib/auth-helper';

   test.describe('Your Plugin Tests', () => {
     test.beforeEach(async ({ page }) => {
       suppressConsoleNoise(page);
       await page.goto('/');
       await authenticateWithBackstage(page);
     });

     test('should test your plugin functionality', async ({ page }) => {
       await navigateAfterAuth(page, '/your-plugin');
       // Your test logic here
     });
   });
   ```

3. **Use standard Playwright patterns**:
   - Use `page.screenshot()` for debugging screenshots
   - Use `expect()` for assertions
   - Use `test.beforeEach()` for setup
   - Follow the existing test patterns in other plugins

4. **Test locally**:
   ```bash
   cd apps/backstage/tests/acceptance
   npm install
   npm run test
   ```

### Screenshot and Artifact Management

The system provides a custom screenshot helper that saves screenshots directly into Playwright's output directory structure, ensuring they appear alongside auto-generated artifacts in the HTML report.

#### Using the Screenshot Helper

Import the screenshot helper functions:
```typescript
import { takeStepScreenshot, takeNamedScreenshot, takeCustomScreenshot } from '../../tests/acceptance/lib/screenshot-helper';
```

**Available Functions:**
- `takeStepScreenshot(page, testInfo, stepNumber, description)` - For numbered step screenshots
- `takeNamedScreenshot(page, testInfo, description)` - For descriptive screenshots with timestamps  
- `takeCustomScreenshot(page, testInfo, filename, options)` - Low-level screenshot function

**Example Usage:**
```typescript
test('should demonstrate screenshot functionality', async ({ page }, testInfo) => {
  // Take a step screenshot
  await takeStepScreenshot(page, testInfo, '01', 'login-page');
  
  // Take a named screenshot
  await takeNamedScreenshot(page, testInfo, 'error-state-detected');
  
  // Take a custom screenshot with options
  await takeCustomScreenshot(page, testInfo, 'custom-screenshot', { 
    fullPage: true,
    clip: { x: 0, y: 0, width: 800, height: 600 }
  });
});
```

**Benefits:**
- ✅ Screenshots appear in same folder as Playwright's auto-generated artifacts
- ✅ Compatible with HTML reporter (no conflicts)
- ✅ Automatic attachment to test results
- ✅ Clean, descriptive filenames with proper sanitization
- ✅ No custom reporter needed

## Usage

### Local Development
```bash
cd apps/backstage/tests/acceptance
npm install
npm run test                    # Run all tests (central + plugins)
npm run test -- --list         # List all discovered tests
npm run test -- plugins/eda/   # Run only EDA plugin tests
```

### Test Filtering (from kustomize/backstage-kargo)
```bash
# Run specific plugin tests
npm run test:docker -- --filter image-factory
npm run test:docker -- --filter eda

# Run tests by functionality
npm run test:docker -- --filter enrollment
npm run test:docker -- --filter navigation
npm run test:docker -- --filter catalog

# Use grep patterns for specific test names
npm run test:docker -- --grep "should authenticate"

# Combine filters
npm run test:docker -- --filter image-factory --grep enrollment

# Available filters:
# - image-factory: All Image Factory plugin tests
# - eda: All EDA plugin tests  
# - enrollment: Tests containing 'enrollment'
# - navigation: Tests containing 'navigation'
# - catalog: Tests containing 'catalog'
# - registry: Tests containing 'registry'
# - pipeline: Tests containing 'pipeline'
```

### In Kargo Verification
The tests are automatically executed by the `post_deployment_e2e.py` script during Kargo verification. The script:

1. Creates a unified test environment in `/tmp/unified-tests/`
2. Copies central tests and discovers plugin tests
3. Copies all plugin tests to the unified location
4. Installs dependencies once (single Playwright installation)
5. Runs all tests using the unified configuration
6. Generates consolidated reports and artifacts

## Shared Libraries

The `lib/` directory contains common utilities for all plugin tests:

### Authentication Helper (`lib/auth-helper.ts`)
Provides robust authentication handling for all tests:
- **Multiple authentication strategies**: Guest login, direct access, alternative selectors
- **Retry logic**: Automatic retries with different approaches if initial auth fails
- **Console noise suppression**: Filters out React warnings and framework noise
- **Navigation helpers**: Safe navigation with authentication verification

Usage:
```typescript
import { authenticateWithBackstage, suppressConsoleNoise, navigateAfterAuth } from '../../tests/acceptance/lib/auth-helper';

test.beforeEach(async ({ page }) => {
  suppressConsoleNoise(page);
  await page.goto('/');
  await authenticateWithBackstage(page);
});
```

### Screenshot Helper (`lib/screenshot-helper.ts`)
Provides custom screenshot functionality that integrates seamlessly with Playwright's artifact system:
- **Step screenshots**: Numbered screenshots for test flow documentation
- **Named screenshots**: Descriptive screenshots with automatic timestamps
- **Custom screenshots**: Full control over screenshot options and naming
- **Automatic attachment**: Screenshots are both saved to disk AND attached to test results
- **HTML report integration**: Screenshots appear alongside Playwright's auto-generated artifacts

Usage:
```typescript
import { takeStepScreenshot, takeNamedScreenshot } from '../../tests/acceptance/lib/screenshot-helper';

test('example test', async ({ page }, testInfo) => {
  // Document test steps
  await takeStepScreenshot(page, testInfo, '01', 'initial-page-load');
  
  // Capture specific states
  await takeNamedScreenshot(page, testInfo, 'error-dialog-displayed');
});
```

## Benefits of Unified System

**Before (Multiple Playwright Installations)**: 
- Conflicts between different Playwright versions
- Tests failed due to "Requiring @playwright/test second time" errors
- Inconsistent artifact organization
- Authentication failures across different tests
- Difficult to run all tests together

**After (Unified System)**:
- Single Playwright installation eliminates conflicts
- All tests run together seamlessly
- Unified artifact collection and reporting
- Shared authentication utilities prevent login failures
- Easy to add new plugin tests
- Consistent test execution environment
- Test filtering capabilities for focused testing

## Test Configuration

The `playwright.config.ts` is optimized for:
- **Unified test discovery** - Finds tests in both central and plugin locations
- **Single browser (Chromium)** for speed and consistency
- **Container-friendly timeouts** for Kubernetes environment
- **Comprehensive artifact collection** - screenshots, traces, videos, reports
- **Environment variable configuration** for flexible deployment

## Environment Variables

- `PLAYWRIGHT_BASE_URL` - Target Backstage URL (set by verification script)
- `TEST_RESULTS_DIR` - Directory for all test artifacts
- `PLAYWRIGHT_HTML_REPORT` - Location for HTML test reports
- `KARGO_PROMOTION_ID` - Promotion ID for artifact naming
- `KARGO_FREIGHT_ID` - Freight ID for artifact naming

## Troubleshooting

### Tests Not Discovered
- Ensure test files end with `.spec.ts` or `.test.ts`
- Check that tests are in the correct directory structure
- Run `npm run test -- --list` to see discovered tests

### Screenshot Issues
- Don't create custom screenshot directories in tests
- Use `await page.screenshot({ path: '1-login.png' })` 
- Screenshots automatically go to the unified artifact directory

### Playwright Conflicts
- The unified system should eliminate these
- If you see "Requiring @playwright/test second time", the unified system isn't working
- Check that you're running from the central acceptance directory