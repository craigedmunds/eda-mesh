# @internal/backstage-plugin-catalog-backend-module-image-factory

Catalog backend module that registers the custom entity kinds for the image-factory plugin:

- `ManagedImage` - Container images we build and maintain
- `BaseImage` - Upstream container images that our managed images depend on

## Installation

This module is automatically loaded when you add it to your backend:

```typescript
// packages/backend/src/index.ts
backend.add(import('@internal/backstage-plugin-catalog-backend-module-image-factory'));
```

## What it does

This module registers a `CatalogProcessor` that:

1. Validates `ManagedImage` and `BaseImage` entity kinds
2. Makes these kinds available in the Backstage catalog
3. Enables filtering by these kinds in the catalog UI

## Entity Kinds

### ManagedImage

Represents a container image that we build and maintain.

```yaml
apiVersion: image-factory.io/v1alpha1
kind: ManagedImage
metadata:
  name: backstage
  annotations:
    image-factory.io/registry: ghcr.io
    image-factory.io/repository: craigedmunds/backstage
spec:
  type: managed-image
  lifecycle: production
  owner: platform-team
```

### BaseImage

Represents an upstream container image that our managed images depend on.

```yaml
apiVersion: image-factory.io/v1alpha1
kind: BaseImage
metadata:
  name: node-22-bookworm-slim
  annotations:
    image-factory.io/registry: docker.io
    image-factory.io/repository: library/node
spec:
  type: base-image
  lifecycle: production
  owner: upstream
```

## Development

```bash
# Build the module
yarn build

# Run tests
yarn test

# Lint
yarn lint
```
