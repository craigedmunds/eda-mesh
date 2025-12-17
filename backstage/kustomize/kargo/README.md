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
  - `backstage/app/tests/acceptance/**/*.spec.ts` - Central platform tests  
  - `backstage/app/plugins/**/tests/acceptance/**/*.spec.ts` - Plugin-specific tests
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
  - `backstage/app/tests/acceptance/**/*.spec.ts` - Central platform tests
  - `backstage/app/plugins/**/tests/acceptance/**/*.spec.ts` - Plugin-specific tests

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

#### Test Filtering and Listing

**IMPORTANT:** When passing arguments to the test scripts, you must use the double dash (`--`) separator:

```bash
# ✅ CORRECT: List all tests
npm run test:docker -- --list

# ✅ CORRECT: List tests matching a pattern
npm run test:docker -- --grep "should handle registry unavailability gracefully" --list

# ✅ CORRECT: Run specific tests
npm run test:docker -- --grep "should authenticate"

# ✅ CORRECT: Filter by plugin
npm run test:docker -- --filter image-factory

# ❌ INCORRECT: Missing double dash (arguments will be ignored)
npm run test:docker --list
npm run test:docker --grep "pattern" --list
```

**Available Filtering Options:**
- `--list`: List all tests without running them
- `--grep "pattern"`: Run only tests matching the pattern
- `--filter plugin-name`: Run tests for specific plugin (image-factory, eda, etc.)
- `--verbose`: Enable detailed logging
- `--url https://example.com`: Test against custom URL

**Examples:**
```bash
# List all available tests
npm run test:docker -- --list

# List tests for image factory plugin
npm run test:docker -- --filter image-factory --list

# Run specific test and show verbose output
npm run test:docker -- --grep "registry unavailability" --verbose

# Test against custom deployment
npm run test:docker -- --url https://my-backstage.example.com
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
- Leverages automation scripts in `backstage/kustomize/kargo/scripts/`

### With CI/CD
- Compatible with GitHub Actions
- Provides structured logging
- Returns appropriate exit codes

## Troubleshooting

### Test Execution Reliability Issues

#### Detecting Duplicate Executions

**Symptoms:**
- Multiple artifact directories with same promotion ID but different suffixes
- Example: `backstage-acceptance-20251217-212005-add69fd1-ea0` and `backstage-acceptance-20251217-212351-add69fd1-ea0`

**Investigation Steps:**

1. **Check artifact directory pattern:**
   ```bash
   ls -la .backstage-acceptance-artifacts/ | grep -E "add69fd1|7efcfd78"
   ```
   Multiple directories with same suffix indicate retries

2. **Review execution logs for retry warnings:**
   ```bash
   grep -r "RETRY DETECTED" .backstage-acceptance-artifacts/*/execution-metadata/
   ```

3. **Check Kargo job creation:**
   ```bash
   kubectl get jobs -n backstage-kargo --sort-by=.metadata.creationTimestamp
   ```
   Multiple jobs for same promotion indicate configuration issue

4. **Examine AnalysisRun status:**
   ```bash
   kubectl get analysisrun -n backstage-kargo -o yaml | grep -A 10 -B 10 "phase:"
   ```

**Root Causes and Solutions:**

1. **Missing `restartPolicy: Never`**
   - **Cause:** Kubernetes automatically restarts failed pods
   - **Fix:** Ensure AnalysisTemplate has `restartPolicy: Never` in job spec
   - **Validation:** Check `backstage-verification.yaml`

2. **Incorrect `failureLimit` setting**
   - **Cause:** Kargo retries failed verifications
   - **Fix:** Set `failureLimit: 1` in AnalysisTemplate
   - **Validation:** Verify failed tests fail the promotion without retry

3. **Missing `failureCondition`**
   - **Cause:** Failed jobs not recognized as failures, triggering retries
   - **Fix:** Add `failureCondition: "result.phase == Failed"`
   - **Validation:** Test with intentional failure

4. **Timeout-based retries**
   - **Cause:** Test execution exceeds timeout, triggering new job
   - **Fix:** Increase timeout or optimize test execution time
   - **Validation:** Monitor test execution duration

#### Investigating Retry Causes

**Step 1: Examine execution metadata**
```bash
# Check retry information in metadata
cat .backstage-acceptance-artifacts/*/execution-metadata/environment.json | jq '.retry_attempt, .is_retry'
```

**Step 2: Review Kargo promotion history**
```bash
# Check promotion attempts
kubectl get promotions -n backstage-kargo --sort-by=.metadata.creationTimestamp
```

**Step 3: Analyze job failure patterns**
```bash
# Check job completion status
kubectl get jobs -n backstage-kargo -o wide
```

**Step 4: Review AnalysisTemplate configuration**
```bash
# Verify retry prevention settings
kubectl get analysistemplate backstage-acceptance-verification -n backstage-kargo -o yaml | grep -A 5 -B 5 "failureLimit\|restartPolicy\|count"
```

#### Validating Single Execution Behavior

**Test Procedure:**

1. **Clean slate test:**
   ```bash
   # Clear existing artifacts
   rm -rf .backstage-acceptance-artifacts/backstage-acceptance-*
   
   # Trigger promotion
   kargo promote --project backstage-kargo --stage local
   ```

2. **Monitor execution:**
   ```bash
   # Watch job creation
   kubectl get jobs -n backstage-kargo -w
   
   # Monitor AnalysisRun
   kubectl get analysisrun -n backstage-kargo -w
   ```

3. **Verify single artifact creation:**
   ```bash
   # Should see exactly one directory
   ls -la .backstage-acceptance-artifacts/ | grep backstage-acceptance | wc -l
   ```

4. **Check for retry warnings:**
   ```bash
   # Should return no results
   grep -r "RETRY DETECTED" .backstage-acceptance-artifacts/
   ```

**Expected Results:**
- ✅ One job created per promotion
- ✅ One AnalysisRun per promotion
- ✅ One artifact directory per promotion
- ✅ No retry warnings in logs
- ✅ Consistent artifact naming pattern

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

4. **Artifact Naming Inconsistencies**
   - Check promotion ID extraction logic in `post_deployment_e2e.py`
   - Verify environment variables are set correctly
   - Review artifact directory naming function

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

# Check for duplicate jobs
kubectl get jobs -n backstage-kargo --sort-by=.metadata.creationTimestamp

# Verify AnalysisTemplate configuration
kubectl get analysistemplate -n backstage-kargo -o yaml

# Monitor real-time job creation
kubectl get jobs,analysisruns -n backstage-kargo -w
```

## Requirements Validation

This integration addresses all E2E testing requirements:

- **3.1**: ✅ Verifies platform accessibility after deployment
- **3.2**: ✅ Confirms navigation elements functionality
- **3.3**: ✅ Validates catalog entity display
- **3.4**: ✅ Tests entity relationships and links
- **3.5**: ✅ Provides detailed pass/fail reporting

## Test Execution Reliability

### Preventing Duplicate Test Runs

The Kargo verification system is configured to prevent duplicate test executions and ensure single execution per promotion:

#### AnalysisTemplate Configuration

The `backstage-verification.yaml` template includes critical settings to prevent retries:

```yaml
spec:
  metrics:
    - name: acceptance-tests
      provider:
        job:
          spec:
            template:
              spec:
                restartPolicy: Never  # Prevents pod restarts
      successCondition: "result.phase == Succeeded"
      failureCondition: "result.phase == Failed"  # Explicit failure recognition
      failureLimit: 1    # Do not retry on failure
      interval: 60s      # Status check interval (not execution frequency)
      count: 1           # Run exactly once
```

**Key Settings:**
- `restartPolicy: Never` - Prevents Kubernetes from automatically restarting failed pods
- `failureLimit: 1` - Tells Kargo to fail the verification after one failure, not retry
- `count: 1` - Specifies that the metric should be evaluated exactly once
- `interval: 60s` - How often to check job status (not how often to run the job)
- `failureCondition` - Ensures failed jobs are recognized as failures, not triggers for retry

### Artifact Naming Strategy

Test artifacts are named consistently based on Kargo promotion metadata:

**Format:** `backstage-acceptance-{timestamp}-{short_id}`

Where:
- `timestamp`: Execution time in format `YYYYMMDD-HHMMSS`
- `short_id`: First 12 characters of the promotion UUID

**Examples:**
- Kargo execution: `backstage-acceptance-20251218-104716-174985a1d5e4`
- Local execution: `backstage-e2e-20251218-104716-test-run`

This naming strategy provides:
- **Traceability**: Clear mapping to specific Kargo promotions
- **Uniqueness**: Timestamp + promotion ID prevents collisions
- **Consistency**: Same format across all executions
- **Debuggability**: Easy to identify which promotion generated which artifacts

### Retry Detection

The test execution script includes automatic retry detection:

```python
def detect_retry_attempt(self) -> int:
    """Detect if this execution is a retry by checking for existing artifacts."""
    # Scans artifact directory for existing directories matching promotion ID
    # Logs warnings if retries are detected
    # Returns retry count (0 for first execution, 1+ for retries)
```

**When retries are detected:**
- ⚠️ Warning logged prominently in execution logs
- Retry count included in execution metadata
- Investigation recommended to identify configuration issues

### Log Artifact Collection

All test execution logs are captured and made available through the Kargo UI:

**Implementation:**
```bash
# In AnalysisTemplate job spec
exec > >(tee /artifacts/verification.log) 2>&1
# ... run tests ...
sync  # Ensure log is flushed
```

**Stage Configuration:**
```yaml
verification:
  artifacts:
    - name: verification-logs
      path: /artifacts/verification.log
```

**Benefits:**
- Logs accessible through Kargo UI without kubectl access
- Complete execution history preserved
- Debugging information readily available
- No need for direct pod access

### Execution Metadata

Comprehensive metadata is collected for every test execution:

**Metadata Includes:**
- Kargo promotion ID and freight ID
- Kubernetes pod name and job name
- Execution timestamp and duration
- Retry attempt number
- Execution environment (Kargo vs local)
- Artifact directory path
- Test results summary

**Location:** `/artifacts/{artifact-dir}/execution-metadata/`

### Validation Steps

To verify single execution behavior:

1. **Check artifact directory count:**
   ```bash
   ls -la .backstage-acceptance-artifacts/ | grep backstage-acceptance
   ```
   Should see one directory per promotion

2. **Review execution logs:**
   ```bash
   grep "RETRY DETECTED" .backstage-acceptance-artifacts/*/verification.log
   ```
   Should return no results

3. **Monitor Kargo jobs:**
   ```bash
   kubectl get jobs -n backstage-kargo -w
   ```
   Should see one job per promotion

4. **Check AnalysisRun status:**
   ```bash
   kubectl get analysisrun -n backstage-kargo
   ```
   Should show single run per promotion

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