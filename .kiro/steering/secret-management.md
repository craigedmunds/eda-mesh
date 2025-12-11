# Secret Management Best Practices

## Rule: Never Create Secrets Manually

**NEVER** create or modify secrets manually. Always use automated systems (kyverno/ESO) to sync from central secret locations.

## Central Secret Management

All secrets must be managed centrally and distributed automatically:

- **Source**: Central namespace with master secrets (e.g., `backstage/ghcr-creds`)
- **Distribution**: Automated sync to namespaces that need them
- **Consistency**: All environments use the same credential sources
- **Security**: Credentials are managed centrally, not duplicated

## Why This Matters

1. **Security**: Single source of truth for credentials
2. **Consistency**: All environments use identical credentials
3. **Maintainability**: Update once, propagate everywhere
4. **Automation**: No manual intervention required
5. **Auditability**: Clear credential lifecycle and usage

## What NOT to Do

- ❌ Create secrets manually with `kubectl create secret`
- ❌ Copy/paste credentials between namespaces
- ❌ Hardcode credentials in manifests or scripts
- ❌ Hardcode credentials in kyverno policies
- ❌ Create environment-specific credential variations

## What TO Do

- ✅ Use central secret management
- ✅ Automate secret distribution
- ✅ Use consistent labeling for secret identification
- ✅ Implement proper secret rotation processes

## Action Required

Ensure all secrets are managed centrally before proceeding with any deployments.