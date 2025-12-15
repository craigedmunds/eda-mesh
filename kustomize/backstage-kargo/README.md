# Backstage Kargo Integration with E2E Testing

This directory contains Kargo configuration for automated Backstage deployments with comprehensive post-deployment E2E testing.

## Overview

The Kargo integration provides:
1. **Automatic image detection** from `ghcr.io/craigedmunds/backstage`
2. **GitOps promotion** to update Kubernetes manifests
3. **ArgoCD synchronization** for deployment
4. **Post-deployment E2E verification** to ensure functionality

## Architecture

```
New Image → Warehouse → Stage → Promotion → ArgoCD → Deployment → E2E Tests
```

## Components

### 1. Warehouse (`warehouse.yaml`)
- Monitors `ghcr.io/craigedmunds/backstage` for new images
- Semver constraint: `>=0.6.0`
- Automatically detects new releases

### 2. Stage (`stage-local.yaml`)
- Defines the promotion pipeline
- Updates Kustomize overlays with new image tags
- Commits changes to Git repository
- Triggers ArgoCD sync
- Waits for deployment completion
- Runs E2E verification

### 3. Consolidated Verification Template

#### `backstage-verification` (Unified Approach)
The consolidated verification template provides a single comprehensive E2E test execution that includes:

- **Integrated Health Check**: Built into the Python script - validates deployment readiness
- **Unified Test Discovery**: Uses Playwright glob patterns to discover and run tests from:
  - `apps/backstage/tests/acceptance/**/*.spec.ts` - Central platform tests  
  - `apps/backstage/plugins/**/tests/acceptance/**/*.spec.ts` - Plugin-specific tests
- **Single Verification Step**: Combines health checking and E2E testing in one execution
- **External Script Management**: Scripts stored in dedicated files (not embedded in ConfigMaps)
- **Consolidated Reporting**: HTML, JUnit XML, and JSON results with comprehensive artifact collection

**Key Benefits:**
- **Simplicity**: Single verification step handles all testing needs
- **Consistency**: Same test execution approach locally and in Kargo
- **Scalability**: Unified test discovery automatically includes new plugin tests
- **Maintainability**: External scripts following GitOps best practices
- **Debuggability**: Comprehensive artifact collection and reporting

## E2E Test Execution Flow

### 1. Health Check
- Built into the Python script - validates deployment readiness
- Polls target URL until responsive
- Verifies Backstage content is loaded
- Configurable timeout (default: 5 minutes)

### 2. Test Setup
- Creates unified test environment with proper directory structure
- Sets up test configuration from mounted ConfigMaps
- Installs dependencies and prepares Playwright environment

### 3. Test Discovery
- Uses Playwright glob patterns to find all relevant tests
- Discovers tests from both central and plugin directories automatically
- Ensures comprehensive coverage across the entire platform

### 4. Test Execution
- Runs all discovered tests using Playwright with unified configuration
- Generates HTML, JUnit XML, and JSON reports
- Validates core functionality:
  - Navigation elements
  - Catalog display
  - Entity relationships
  - API responses
  - Plugin-specific functionality

### 5. Artifact Collection
- Stores results, screenshots, traces, and reports
- Organizes artifacts by type for easy debugging
- Copies all artifacts to mounted volume for persistence

## Configuration

### Verification Template Configuration
The consolidated verification template uses:

```yaml
verification:
  analysisTemplates:
    - name: backstage-verification
  args:
    - name: backstage-url
      value: http://backstage.backstage.svc.cluster.local:7007
```

**Configuration Files:**
- `test-config/package.json` - Unified test dependencies and scripts
- `test-config/playwright.config.ts` - Playwright configuration with glob patterns for test discovery
- `scripts/post_deployment_e2e.py` - Main test execution script with unified test discovery

### Environment Variables
- `PLAYWRIGHT_BASE_URL`: Target deployment URL (set automatically)
- `BACKSTAGE_URL`: Fallback URL for older configurations
- `CI`: Set to "true" for CI mode
- `PLAYWRIGHT_BROWSERS_PATH`: Browser installation path
- `KARGO_PROMOTION_ID`: Promotion identifier (set by Kargo)
- `KARGO_FREIGHT_ID`: Freight identifier (set by Kargo)

### Resource Limits
- Memory: 512Mi request, 2Gi limit
- CPU: 250m request, 1000m limit
- Timeout: 10 minutes for test execution

### Test Discovery
- Uses Playwright glob patterns to automatically discover tests from:
  - `apps/backstage/tests/acceptance/**/*.spec.ts` - Central platform tests
  - `apps/backstage/plugins/**/tests/acceptance/**/*.spec.ts` - Plugin-specific tests

## Usage

### Local E2E Testing

For local development and testing, convenient npm scripts are available:

```bash
# Run E2E tests in Docker (recommended - matches Kargo environment)
npm run test:docker

# Run E2E tests in Docker with verbose output
npm run test:docker:verbose

# Open interactive shell in Docker container for debugging
npm run test:docker:shell

# Run E2E tests locally (requires local Python environment)
npm run test:local

# Run E2E tests locally with verbose output
npm run test:local:verbose
```

**Docker vs Local Testing:**
- **Docker** (`test:docker`): Uses the same container image as Kargo verification, ensuring identical environment
- **Local** (`test:local`): Runs directly on your machine, faster but may have environment differences

**Custom URL Testing:**
```bash
# Test against a different URL
npm run test:docker -- --url https://my-backstage.example.com

# Get help for all available options
npm run test:docker -- --help
```

### Manual Promotion
```bash
# Trigger promotion via Kargo CLI
kargo promote --project backstage-kargo --stage local
```

### Automatic Promotion
Promotions trigger automatically when:
1. New image published to `ghcr.io/craigedmunds/backstage`
2. Image meets semver constraint `>=0.6.0`
3. Warehouse detects the new image

### Monitoring
```bash
# Check promotion status
kubectl get stages -n backstage-kargo

# View analysis results
kubectl get analysisruns -n backstage-kargo

# Check E2E test logs
kubectl logs -n backstage-kargo -l job-name=backstage-e2e-tests
```

## Integration Points

### With ArgoCD
- Stage waits for ArgoCD sync completion
- Deployment status monitored before E2E execution
- Rollback possible if E2E tests fail

### With Existing Tests
- Uses current Playwright configuration
- Integrates with existing test suites
- Leverages automation scripts in `apps/backstage/scripts/`

### With CI/CD
- Compatible with GitHub Actions
- Provides structured logging
- Returns appropriate exit codes

## Troubleshooting

### Common Issues

1. **E2E Tests Timeout**
   - Check deployment status: `kubectl get pods -n backstage`
   - Verify URL accessibility: `curl https://backstage.127.0.0.1.nip.io`
   - Review job logs: `kubectl logs -n backstage-kargo job/backstage-e2e-tests`

2. **Image Detection Issues**
   - Verify warehouse status: `kubectl get warehouse -n backstage-kargo`
   - Check image registry connectivity
   - Confirm semver constraint matches

3. **Promotion Failures**
   - Review stage status: `kubectl describe stage local -n backstage-kargo`
   - Check Git repository access
   - Verify ArgoCD application health

### Debug Commands
```bash
# View detailed stage status
kubectl describe stage local -n backstage-kargo

# Check warehouse freight
kubectl get freight -n backstage-kargo

# Review analysis results
kubectl get analysisrun -n backstage-kargo -o yaml

# E2E test job logs
kubectl logs -n backstage-kargo -l job-name=backstage-e2e-tests --tail=100
```

## Requirements Validation

This integration addresses all E2E testing requirements:

- **3.1**: ✅ Verifies platform accessibility after deployment
- **3.2**: ✅ Confirms navigation elements functionality
- **3.3**: ✅ Validates catalog entity display
- **3.4**: ✅ Tests entity relationships and links
- **3.5**: ✅ Provides detailed pass/fail reporting

## Security Considerations

- Uses read-only Git access for repository cloning
- Runs in isolated Kubernetes jobs
- No persistent storage of sensitive data
- Resource limits prevent resource exhaustion

## Local Testing

### Test Execution Modes

The E2E testing system supports both clean and verbose output modes:

#### Clean Mode (Default)
```bash
npm run test:docker
# or
npm run test:local
```
- Clean, focused output showing test progress and results
- Minimal logging for production-like execution
- Artifact organizer messages and test summaries only

#### Verbose Mode (Debugging)
```bash
npm run test:docker:verbose
# or  
npm run test:local:verbose
```
- Detailed Playwright debug logs (`pw:browser*`, `pw:api*`)
- Browser launch commands and network activity
- Detailed logging from all components
- Useful for debugging test failures or browser issues

#### Interactive Shell Mode
```bash
npm run test:docker:shell
```
- Opens interactive shell inside Docker container
- Allows manual test execution and debugging
- Full access to test environment for troubleshooting

### Output Control

The verbose mode is controlled by:
- **Playwright Debug Logs**: `DEBUG=pw:browser*,pw:api*` environment variable
- **Python Logging**: `--verbose` flag sets logging level to DEBUG
- **Test Framework**: Additional diagnostic output when needed

Use verbose mode only when debugging issues, as the output can be quite extensive.