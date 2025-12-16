# Self-Managing Seed

This directory contains the consolidated seed configuration that enables GitOps management of the platform infrastructure itself.

## Overview

The self-managing seed mechanism provides:

1. **Manual Bootstrap**: Initial deployment via single `kubectl apply` command
2. **Self-Management**: The seed creates ArgoCD applications that manage the seed directory itself
3. **Environment Overlays**: Support for environment-specific configurations
4. **Branch Targeting**: All applications can track specific Git branches for isolated development

## Architecture

```
platform/kustomize/seed/
├── argocd/                    # ArgoCD installation and configuration
├── backstage/                 # Backstage applications
├── eda/                      # EDA applications  
├── image-factory/            # Image Factory applications
├── supporting-applications/   # Supporting applications (including seed-self-manager)
└── overlays/                 # Environment-specific configs
    ├── local/pi/             # Pi environment (full capabilities)
    ├── local/craig/          # Craig environment (no Image Factory)
    └── production/           # Production environment (core only)
```

## Bootstrap Process

### 1. Initial Manual Bootstrap

Choose the appropriate environment overlay and apply it:

```bash
# Pi environment (full capabilities)
kubectl apply -k platform/kustomize/seed/overlays/local/pi

# Craig environment (no Image Factory)
kubectl apply -k platform/kustomize/seed/overlays/local/craig

# Production environment (core only)
kubectl apply -k platform/kustomize/seed/overlays/production
```

### 2. Self-Management Activation

After the initial bootstrap:

1. ArgoCD is installed and configured
2. The `seed-self-manager` application is created
3. The seed-self-manager monitors the `platform/kustomize/seed` directory
4. Any changes to the seed configuration are automatically detected and applied

### 3. Ongoing Management

From this point forward:

- **No manual kubectl commands needed** - ArgoCD manages everything
- **Git-driven changes** - Commit changes to the seed directory and ArgoCD applies them
- **Self-healing** - ArgoCD automatically corrects any drift from the desired state

## Self-Managing Application Configuration

The `seed-self-manager` application has special configuration to enable self-management:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: seed-self-manager
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # Deploy early in sync process
spec:
  source:
    path: platform/kustomize/seed      # Monitors the seed directory itself
  syncPolicy:
    automated:
      prune: true
      selfHeal: true                   # Automatically sync changes
  ignoreDifferences:
    - group: argoproj.io
      kind: Application
      name: seed-self-manager          # Prevent infinite loops
```

## Environment Overlays

### Local/Pi Environment
- **Full capabilities**: Backstage, EDA, Image Factory, all supporting applications
- **Branch targeting**: Supports feature branch development
- **TLS**: Let's Encrypt certificates for external access

### Local/Craig Environment  
- **Reduced capabilities**: Excludes Image Factory
- **Branch targeting**: Supports feature branch development
- **Local access**: 127.0.0.1.nip.io domains

### Production Environment
- **Core capabilities**: Backstage, EDA, Image Factory
- **Minimal supporting apps**: Only essential infrastructure
- **Production-ready**: Optimized for production workloads

## Validation

Use the validation script to verify the self-managing seed configuration:

```bash
./platform/kustomize/seed/validate-self-managing.sh
```

This script checks:
- seed-self-manager application exists in all overlays
- Automated sync policies are configured
- ignoreDifferences prevent infinite loops
- Correct paths are configured for self-management
- Sync waves ensure proper ordering

## Branch Targeting

The seed supports branch targeting for isolated development:

1. **Configure target branch** in overlay ConfigMap
2. **All labeled applications** automatically switch to the target branch
3. **Test infrastructure changes** in isolation
4. **Return to main** when development is complete

See the branch targeting component in `platform/kustomize/_common/components/argocd-branch-targetrevision/` for details.

## Troubleshooting

### Seed Not Self-Managing

If changes to the seed directory aren't being applied automatically:

1. Check that the `seed-self-manager` application exists and is healthy
2. Verify the application is pointing to the correct path
3. Check ArgoCD logs for sync errors

### Infinite Sync Loops

If the seed-self-manager is constantly syncing:

1. Verify `ignoreDifferences` is configured correctly
2. Check that the application isn't trying to manage itself recursively
3. Review ArgoCD application status for conflicts

### Missing Applications

If some applications aren't being created:

1. Verify the overlay includes all required resources
2. Check Kustomize build output for errors
3. Review ArgoCD project permissions

## Requirements Satisfied

This implementation satisfies the following requirements:

- **2.6**: Bootstrap applications manage the seed directory itself after initial bootstrap
- **2.7**: Changes to seed configuration are automatically detected and applied by ArgoCD  
- **2.8**: Self-managing seed application manages the unified seed directory containing both ArgoCD application definitions and platform components