# Kustomize Ingress Build Tests

This directory contains automated tests that validate kustomize build outputs for ingress resources across different overlays. These tests ensure that the ingress management system correctly transforms ingress configurations according to environment-specific requirements.

## Test Structure

### Test Files

- `test_argocd_ingress.py` - Tests ArgoCD ingress transformation in lab overlay
- `test_backstage_ingress.py` - Tests Backstage ingress transformation in local overlay
- `test_kargo_ingress.py` - Tests Kargo ingress preservation (unmanaged resources)
- `base_test.py` - Base test classes and utilities
- `conftest.py` - Pytest configuration and fixtures

### Test Categories

Tests are organized using pytest markers:

- `@pytest.mark.ingress` - All ingress-related tests
- `@pytest.mark.private` - Tests for private ingress resources (internal access only)
- `@pytest.mark.public` - Tests for public ingress resources (internal + external access)
- `@pytest.mark.unmanaged` - Tests for unmanaged ingress resources
- `@pytest.mark.argocd` - ArgoCD-specific tests
- `@pytest.mark.backstage` - Backstage-specific tests
- `@pytest.mark.kargo` - Kargo-specific tests
- `@pytest.mark.lab` - Lab environment tests
- `@pytest.mark.local` - Local environment tests

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   task platform:ingress:test:install
   ```

2. Ensure kustomize is installed:
   ```bash
   kustomize version
   ```

### Local Execution

Run all tests:
```bash
task ingress:test
```

Run specific test suites:
```bash
task ingress:test:argocd    # ArgoCD ingress tests
task ingress:test:backstage # Backstage ingress tests
task ingress:test:kargo     # Kargo ingress tests
```

Run tests with specific markers:
```bash
cd platform/ingress/tests/kustomize
source .venv/bin/activate
python -m pytest -m "private and lab" -v    # Private ingress tests in lab environment
python -m pytest -m "argocd" -v             # All ArgoCD tests
```

### CI/CD Execution

Tests run automatically in GitHub Actions:
- **Backstage workflow**: Runs on changes to `backstage/**` or ingress management components
- **Platform Ingress workflow**: Runs on changes to `platform/kustomize/**` or test files

## Interpreting Test Failures

### Common Failure Patterns

#### 1. Kustomize Build Failures

**Error Pattern:**
```
subprocess.CalledProcessError: Command 'kustomize build ...' returned non-zero exit status 1
```

**Possible Causes:**
- Invalid kustomization.yaml syntax
- Missing referenced files or components
- Circular dependencies in kustomize resources

**Troubleshooting:**
1. Run kustomize build manually:
   ```bash
   kustomize build platform/kustomize/seed/overlays/local/lab
   ```
2. Check kustomization.yaml files for syntax errors
3. Verify all referenced components and resources exist

#### 2. Ingress Not Found

**Error Pattern:**
```
AssertionError: ArgoCD ingress not found in lab overlay
```

**Possible Causes:**
- Ingress resource missing from overlay
- Incorrect ingress name in test
- Kustomize component not applied correctly

**Troubleshooting:**
1. Check if ingress exists in build output:
   ```bash
   kustomize build platform/kustomize/seed/overlays/local/lab | grep -A 20 "kind: Ingress"
   ```
2. Verify ingress name matches test expectations
3. Check if ingress management component is included in overlay

#### 3. Domain Transformation Failures

**Error Pattern:**
```
AssertionError: ArgoCD ingress should have internal domain 'argocd.lab.local.ctoaas.co', got hosts: ['argocd']
```

**Possible Causes:**
- Ingress management component not working
- Missing or incorrect environment configuration
- Label-based selection not matching ingress resources

**Troubleshooting:**
1. Check ingress labels:
   ```bash
   kustomize build platform/kustomize/seed/overlays/local/lab | yq '.metadata.labels' -
   ```
2. Verify environment ConfigMap:
   ```bash
   kustomize build platform/kustomize/seed/overlays/local/lab | grep -A 10 "ingress-environment-config"
   ```
3. Check ingress management component configuration

#### 4. TLS Configuration Issues

**Error Pattern:**
```
AssertionError: TLS hosts should match ingress hosts
```

**Possible Causes:**
- TLS configuration not generated correctly
- Missing cert-manager annotations
- Incorrect secret name generation

**Troubleshooting:**
1. Check TLS configuration in build output:
   ```bash
   kustomize build platform/kustomize/seed/overlays/local/lab | yq '.spec.tls' -
   ```
2. Verify cert-manager annotations are present
3. Check if TLS is enabled in environment configuration

#### 5. Annotation Management Problems

**Error Pattern:**
```
AssertionError: Missing cert-manager annotation
```

**Possible Causes:**
- Environment-specific annotations not applied
- Ingress management component configuration issues
- Overlay-specific annotation patches missing

**Troubleshooting:**
1. Check annotations in build output:
   ```bash
   kustomize build platform/kustomize/seed/overlays/local/lab | yq '.metadata.annotations' -
   ```
2. Verify environment configuration includes required annotations
3. Check if annotation patches are applied correctly

### Test Output Analysis

#### Successful Test Output
```
✅ All platform ingress kustomize tests passed successfully!

The ingress management system is working correctly across all tested overlays.

What was tested:
- ArgoCD ingress transformation in lab overlay
- Kargo ingress preservation (unmanaged)
- Domain generation and TLS configuration
- Kustomize component integration
```

#### Failed Test Output
```
❌ Some platform ingress tests failed.

Individual Test Results:
- Matrix Tests: failure
- All Tests: failure

Troubleshooting:
1. Check the test artifacts for detailed failure information
2. Run tests locally: `task ingress:test`
3. Check kustomize build output: `kustomize build platform/kustomize/seed/overlays/local/lab`
4. Verify ingress management component configuration
```

### Debugging Steps

1. **Run tests locally** with verbose output:
   ```bash
   cd platform/ingress/tests/kustomize
   source .venv/bin/activate
   python -m pytest -v --tb=long
   ```

2. **Check kustomize build output** manually:
   ```bash
   kustomize build platform/kustomize/seed/overlays/local/lab --enable-helm
   ```

3. **Validate specific ingress resources**:
   ```bash
   kustomize build platform/kustomize/seed/overlays/local/lab | yq 'select(.kind == "Ingress")'
   ```

4. **Check component integration**:
   ```bash
   # Verify component is included
   cat platform/kustomize/seed/overlays/local/lab/kustomization.yaml
   
   ```

5. **Review test artifacts**:
   - `test-results.xml` - JUnit test results
   - `test-report.html` - Detailed HTML test report with failure details

## Test Maintenance

### Adding New Tests

1. Create test methods following the naming convention `test_*`
2. Use appropriate pytest markers to categorize tests
3. Follow the base test class patterns for consistency
4. Update this documentation with new test descriptions

### Updating Test Expectations

When ingress management system behavior changes:

1. Update test assertions to match new expected behavior
2. Verify changes work across all environments
3. Update documentation to reflect new behavior
4. Run full test suite to ensure no regressions

### Environment-Specific Tests

Tests are designed to work with specific overlay configurations:

- **Lab overlay**: `platform/kustomize/seed/overlays/local/lab`
- **Local overlay**: `backstage/kustomize/overlays/local`

When adding new overlays, create corresponding test methods and update the test matrix in GitHub Actions.