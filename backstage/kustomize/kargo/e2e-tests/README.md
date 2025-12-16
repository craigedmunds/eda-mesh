# Backstage Kargo E2E Tests

This directory contains end-to-end tests for the Backstage Kargo promotion pipeline.

## Overview

The E2E test validates the complete promotion flow:

1. **Freight Creation** - Warehouse discovers new images and creates freight
2. **Promotion Execution** - Promotion runs through all steps:
   - `git-clone` - Clone the repository
   - `kustomize-set-image` - Update image tag in kustomization
   - `git-commit` - Commit the changes
   - `git-push` - Push to target branch
   - `argocd-update` - Trigger ArgoCD refresh
   - `argocd-wait-for-sync` - Wait for ArgoCD to sync
3. **ArgoCD Deployment** - ArgoCD picks up changes and deploys
4. **Application Validation** - Backstage application is updated and responding

## Requirements

- Node.js 18+
- kubectl configured with cluster access
- Kargo resources deployed in `backstage-kargo` namespace
- Backstage application deployed in `backstage` namespace

## Running the Tests

### Quick Start

```bash
./run-e2e-test.sh
```

### Manual Execution

```bash
# Install dependencies
npm install

# Run the test
npm run test
```

### Watch Mode (for development)

```bash
npm run test:watch
```

## Test Structure

The E2E test follows the testing standards:

- **Real System Validation**: Tests against actual deployed Kargo and ArgoCD
- **User Perspective**: Tests the complete promotion flow from freight to deployment
- **Comprehensive Coverage**: Validates all critical steps in the pipeline
- **Clear Output**: Provides detailed logging of each validation step

## Success Criteria

The test passes when:

1. ✅ Kargo project, warehouse, and stage are ready
2. ✅ Freight exists (either existing or newly created)
3. ✅ Promotion can be created successfully
4. ✅ Promotion completes with "Succeeded" status
5. ✅ ArgoCD application syncs and becomes healthy
6. ✅ Backstage deployment is ready and responding

## Troubleshooting

### Common Issues

**Promotion Creation Fails**
- Check if Kargo admission webhook is working
- Verify stage has promotion steps defined
- Check Kargo controller logs
- **Note**: In Kargo v1.8.4, promotions require explicit `steps` in their spec - they don't inherit from stage's `promotionTemplate`

**Promotion Execution Fails**
- Check Git credentials are configured
- Verify target branch exists
- Check ArgoCD connectivity

**ArgoCD Sync Fails**
- Verify ArgoCD application exists
- Check repository access
- Validate kustomization syntax

**Backstage Deployment Issues**
- Check image pull secrets
- Verify resource limits
- Check application logs

### Debug Commands

```bash
# Check Kargo resources
kubectl get projects,warehouses,stages,freight,promotions -n backstage-kargo

# Check ArgoCD application
kubectl get application backstage -n argocd

# Check Backstage deployment
kubectl get deployment,pods -n backstage

# View logs
kubectl logs -n kargo -l app.kubernetes.io/name=kargo
kubectl logs -n backstage deployment/backstage
```

## Integration with CI/CD

This E2E test can be integrated into CI/CD pipelines as a final validation step:

```yaml
# Example GitHub Actions step
- name: Run Backstage Kargo E2E Test
  run: |
    cd backstage/kustomize/kargo/e2e-tests
    ./run-e2e-test.sh
```

The test will exit with code 0 on success and code 1 on failure, making it suitable for automated pipelines.