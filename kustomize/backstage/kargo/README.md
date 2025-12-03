# Kargo Configuration for Backstage

This directory contains Kargo resources for managing the Backstage deployment pipeline.

## Resources

- **project.yaml** - Kargo Project with promotion policies
- **warehouse.yaml** - Watches `ghcr.io/craigedmunds/backstage` for new images
- **stage-dev.yaml** - Dev environment (auto-promotes)
- **stage-staging.yaml** - Staging environment (manual promotion)
- **stage-production.yaml** - Production environment (manual promotion + verification)
- **analysis-template.yaml** - Argo Rollouts AnalysisTemplates for health checks and smoke tests

## Pipeline Flow

```
Warehouse (GHCR) → Dev (auto) → Staging (manual) → Production (manual + verify)
```

## Applying

```bash
kubectl apply -f kustomize/backstage/kargo/
```

## Notes

- The warehouse uses semver constraint `>=0.6.0` to match your current versioning
- Each stage updates the corresponding overlay's kustomization.yaml
- Git commits are pushed back to the main branch
- Update the `repoURL` if your repository URL differs
