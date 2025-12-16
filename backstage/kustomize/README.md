# Backstage Kustomize Configuration

This directory contains Kubernetes manifests for deploying Backstage across multiple environments.

## Structure

```
kustomize/backstage/
├── base/              # Base Backstage configuration (Helm chart + common resources)
├── overlays/          # Environment-specific overlays
│   ├── dev/          # Development environment
│   ├── staging/      # Staging environment
│   └── production/   # Production environment
└── kargo/            # Kargo CD promotion pipeline configuration
```

## Base

The base contains:
- Helm chart inflation for the Backstage chart
- Common ConfigMaps (catalog, root location)
- RBAC configuration
- TLS certificates

## Overlays

Each overlay customizes the base for a specific environment:
- Namespace configuration
- Environment-specific values patches
- Image tags (managed by Kargo)

## Kargo

Kargo manages the promotion pipeline:
- Watches `ghcr.io/craigedmunds/backstage` for new images
- Auto-promotes to dev
- Manual promotion to staging and production
- Updates image tags in overlay kustomization files

## Usage

Build a specific environment:
```bash
kustomize build kustomize/backstage/overlays/dev
kustomize build kustomize/backstage/overlays/staging
kustomize build kustomize/backstage/overlays/production
```

Apply Kargo configuration:
```bash
kubectl apply -f kustomize/backstage/kargo/
```
