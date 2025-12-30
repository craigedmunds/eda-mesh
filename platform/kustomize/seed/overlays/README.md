# Environment Overlays

This directory contains environment-specific overlays for the consolidated seed structure.

## Available Environments

### Local Environments

- **`local/pi/`** - Full capability deployment for Pi environment (targets `feature/pi` branch)
- **`local/craig/`** - Deployment excluding Image Factory capability (targets `feature/backstage-events` branch)
- **`local/niv/`** - Minimal configuration for Niv environment (targets `main` branch)

### Production Environment

- **`production/`** - Production deployment with core components only

## Branch Targeting

The branch targeting mechanism allows all ArgoCD applications to track a specific Git branch for isolated feature development.

### Default Behavior

By default, all applications track the `main` branch as specified in their individual application definitions. No additional configuration is needed.

### Feature Branch Development

To target all applications to a feature branch, add the branch targeting component to an existing overlay:

```yaml
# Example: Add to local/craig/kustomization.yaml
components:
  - ../../../../_common/components/argocd-branch-targetrevision

configMapGenerator:
  - name: argocd-branch-targetrevision
    behavior: add
    literals:
      - targetRevision=feature/my-feature-branch
```

### How It Works

1. **Component**: The `argocd-branch-targetrevision` component uses Kustomize replacements to override the `targetRevision` field
2. **Label Selector**: Only applications with the `repo=argocd-eda` label are affected
3. **Multi-Source Support**: Works with both single-source and multi-source ArgoCD applications
4. **ApplicationSet Support**: Also works with ApplicationSet resources

### Usage

1. **Deploy with feature branch targeting**:
   ```bash
   kubectl apply -k platform/kustomize/seed/overlays/local/craig-feature-branch
   ```

2. **All labeled applications will now track the specified branch**

3. **To return to main branch**, remove the component and configMapGenerator from the overlay and redeploy

### Requirements

Applications must have the following label to be affected by branch targeting:
```yaml
metadata:
  labels:
    repo: argocd-eda
```

Applications may also have an `argocd-branch-targetrevision-strategy` label to control how targeting is applied:
- No label or `argocd-branch-targetrevision-strategy notin (multisource)`: Single-source application
- `argocd-branch-targetrevision-strategy in (multisource)`: Multi-source application