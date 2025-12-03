# Kargo Configuration for Backstage

This directory contains Kargo resources for managing the Backstage deployment pipeline.

## Resources

- **project.yaml** - Kargo Project with auto-promotion for local
- **warehouse.yaml** - Watches `ghcr.io/craigedmunds/backstage` for new images
- **stage-local.yaml** - Local environment (auto-promotes)

## Pipeline Flow

```
Warehouse (GHCR) → Local (auto)
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
