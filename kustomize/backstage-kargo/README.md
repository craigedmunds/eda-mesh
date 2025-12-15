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

### 3. Analysis Templates

#### `backstage-e2e-verification` (Primary)
Comprehensive verification including:
- **API Health Check**: Verifies `/api/catalog/entities` endpoint
- **Frontend Health**: Confirms UI responsiveness
- **E2E Test Execution**: Runs full Playwright test suite via ConfigMap-mounted Python script

**ConfigMap Integration**: The Python test runner (`post_deployment_e2e.py`) is mounted as a ConfigMap, making it:
- **Maintainable**: Script can be updated and tested independently
- **Testable**: Includes comprehensive unit tests
- **Configurable**: Supports command-line arguments and config files

#### `backstage-health-check` (Basic)
Simple health checks for basic verification

#### `post-promotion-hook` (Alternative)
Lightweight verification using the Node.js automation script

## E2E Test Execution Flow

### 1. Deployment Readiness
- Polls `https://backstage.127.0.0.1.nip.io` until responsive
- Verifies Backstage content is loaded
- Configurable timeout (default: 5 minutes)

### 2. Test Execution
- Runs existing Playwright tests:
  - `tests/acceptance/events.spec.ts`
  - `packages/app/e2e-tests/app.test.ts`
- Generates HTML and JSON reports
- Validates core functionality:
  - Navigation elements
  - Catalog display
  - Entity relationships
  - API responses

### 3. Result Reporting
- Success/failure status reported to Kargo
- Detailed logs available in job pods
- HTML reports generated for debugging

## Configuration

### Environment Variables
- `PLAYWRIGHT_URL`: Target deployment URL
- `CI`: Set to "true" for CI mode
- `NODE_ENV`: Set to "test"

### Resource Limits
- Memory: 512Mi request, 2Gi limit
- CPU: 250m request, 1000m limit
- Timeout: 15 minutes

### Retry Logic
- Health checks: 30 attempts with 10s intervals
- Test execution: Single attempt with detailed logging
- Failure handling: Immediate failure on test errors

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