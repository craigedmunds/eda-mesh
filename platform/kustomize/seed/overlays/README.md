# Environment Overlays

This directory contains environment-specific overlays for the consolidated seed structure.

## Available Overlays

### Local Environments

#### Pi Environment (`local/pi/`)
- **Full capability set**: Includes all capabilities and supporting applications
- **Components**: ArgoCD, EDA, Backstage, Image Factory, Supporting Applications
- **Usage**: `kubectl apply -k platform/kustomize/seed/overlays/local/pi/`

#### Craig Environment (`local/craig/`)
- **Reduced capability set**: Excludes Image Factory capability
- **Components**: ArgoCD, EDA, Backstage, Supporting Applications
- **Usage**: `kubectl apply -k platform/kustomize/seed/overlays/local/craig/`

### Production Environment (`production/`)
- **Core capabilities only**: Excludes supporting applications
- **Components**: ArgoCD, EDA, Backstage, Image Factory
- **Usage**: `kubectl apply -k platform/kustomize/seed/overlays/production/`

## Bootstrap Commands

### Local Development (Pi)
```bash
kubectl apply -k platform/kustomize/seed/overlays/local/pi/
```

### Local Development (Craig)
```bash
kubectl apply -k platform/kustomize/seed/overlays/local/craig/
```

### Production Deployment
```bash
kubectl apply -k platform/kustomize/seed/overlays/production/
```

## Overlay Structure

Each overlay follows the same pattern:
- References base components from `../../` (or `../../../` for local overlays)
- Includes only the components needed for that environment
- Can add environment-specific patches if needed

## Adding New Overlays

To create a new overlay:
1. Create a new directory under the appropriate environment
2. Create a `kustomization.yaml` file
3. Reference the base components you need
4. Add any environment-specific patches

Example:
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../argocd
  - ../../eda
  - ../../backstage
  # Add other components as needed

generatorOptions:
  disableNameSuffixHash: true

# Add patches if needed
patches:
  - target:
      kind: Application
      name: backstage
    patch: |-
      - op: replace
        path: /spec/source/targetRevision
        value: my-branch
```