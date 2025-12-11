# ArgoCD Development Workflow

## Development Approach: Pause ArgoCD for Local Testing

When iterating on Kubernetes configurations managed by ArgoCD, it's much more efficient to temporarily pause ArgoCD sync and apply changes directly for rapid testing.

## Workflow Steps

### 1. Pause ArgoCD Sync
```bash
# Disable automated sync to prevent conflicts
kubectl patch application <app-name> -n argocd --type='merge' -p='{"spec":{"syncPolicy":{"automated":null}}}'
```

### 2. Apply Kustomize Directly
```bash
# Apply changes directly for immediate testing
kubectl apply -k path/to/kustomize/
```

### 3. Iterate and Test
- Make configuration changes locally
- Apply directly with `kubectl apply -k`
- Test functionality immediately
- Ensure there's an e2e test that verifiees the thing is actally working
- If necessary, delete the namespace and re-apply
- No need for Git commit/push cycles during development

### 4. Resume ArgoCD Sync (when ready)
```bash
# Re-enable automated sync
kubectl patch application <app-name> -n argocd --type='merge' -p='{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'

# Or manually sync once
kubectl patch application <app-name> -n argocd --type='merge' -p='{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'
```

## Benefits

- **Rapid Iteration**: No Git commit/push overhead during development
- **Immediate Feedback**: Changes applied instantly for testing
- **Conflict Prevention**: Avoids ArgoCD overriding local changes
- **Efficient Development**: Focus on functionality, not Git workflow

## When to Use

- Developing new Kargo configurations
- Testing AnalysisTemplates and verification workflows
- Debugging Kubernetes resource issues
- Prototyping complex configurations

## When NOT to Use

- Production environments
- Shared development environments
- When changes need to be preserved in Git immediately
- Final validation before deployment

## Example: Kargo Verification Development

```bash
# 1. Pause ArgoCD sync
kubectl patch application backstage-kargo -n argocd --type='merge' -p='{"spec":{"syncPolicy":{"automated":null}}}'

# 2. Apply and test changes
kubectl apply -k kustomize/backstage-kargo/

# 3. Iterate on AnalysisTemplate
# Edit backstage-e2e-verification.yaml
kubectl apply -k kustomize/backstage-kargo/

# 4. Test verification
# Create promotion and observe AnalysisRuns

# 5. When satisfied, commit to Git and resume ArgoCD
git add . && git commit -m "Add Kargo verification"
git push
kubectl patch application backstage-kargo -n argocd --type='merge' -p='{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'
```

## Best Practices

- Always document what you're testing
- Resume ArgoCD sync when development is complete
- Commit working configurations to Git
- Use this approach for development, not production changes
- Test that ArgoCD can successfully sync the final configuration