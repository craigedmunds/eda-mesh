# Backstage Acceptance Tests

This directory contains lightweight acceptance tests for Backstage E2E verification, specifically designed for use in Kargo verification workflows.

## Purpose

These tests are optimized for:
- **Fast execution** - Minimal dependencies, only what's needed for testing
- **Kargo integration** - Designed to run in Kargo AnalysisRun verification
- **Artifact generation** - Produces test reports and screenshots for debugging

## Structure

```
acceptance/
├── package.json          # Lightweight test dependencies only
├── playwright.config.ts  # Optimized Playwright configuration
├── tsconfig.json        # TypeScript configuration for tests
├── events.spec.ts       # Main acceptance test
└── README.md           # This file
```

## Dependencies

This package.json contains only the essential dependencies for running tests:
- `@playwright/test` - Test framework
- `typescript` - TypeScript support
- `@types/node` - Node.js type definitions

## Usage

### Local Development
```bash
cd apps/backstage/tests/acceptance
npm install
npm run test
```

### In Kargo Verification
The tests are automatically executed by the `post_deployment_e2e.py` script during Kargo verification. The script:

1. Clones only the acceptance tests directory (sparse checkout)
2. Installs lightweight dependencies (much faster than full Backstage)
3. Runs tests against the deployed Backstage instance
4. Generates artifacts for debugging

## Benefits Over Previous Approach

**Before**: 
- Cloned entire repository (~500MB+)
- Installed all Backstage dependencies (5+ minutes)
- Heavy resource usage

**After**:
- Sparse checkout of tests only (~5MB)
- Minimal test dependencies (30-60 seconds)
- Lightweight and fast execution

## Test Configuration

The `playwright.config.ts` is optimized for:
- Single browser (Chromium) for speed
- Appropriate timeouts for Kubernetes environment
- Artifact collection (screenshots, traces, reports)
- CI-friendly settings

## Environment Variables

- `PLAYWRIGHT_BASE_URL` - Target Backstage URL (set by verification script)
- `KARGO_PROMOTION_ID` - Promotion ID for artifact naming
- `KARGO_FREIGHT_ID` - Freight ID for artifact naming