# Backstage Capability

## Overview

Backstage is an internal developer catalog and portal that provides a unified interface for discovering, understanding, and managing software components, services, and infrastructure within the organization.

## Components

### Application (`app/`)
- **Backstage Core**: Main Backstage application built with React and Node.js
- **Custom Plugins**: Organization-specific plugins including:
  - `image-factory`: Plugin for managing container images and lifecycle
  - `eda`: Plugin for event-driven architecture components
  - `eda-common`: Shared utilities for EDA integration

### Infrastructure (`kustomize/`)
- **Base Configuration**: Core Backstage deployment manifests
- **Overlays**: Environment-specific configurations
- **Kargo Integration**: GitOps deployment pipeline configuration

## Key Features

- **Service Catalog**: Centralized registry of all services and components
- **Software Templates**: Scaffolding templates for new projects
- **Documentation Hub**: Centralized documentation with TechDocs
- **Plugin Ecosystem**: Extensible architecture with custom plugins

## Deployment

### Local Development
```bash
cd backstage/app
yarn install
yarn dev
```

### Kubernetes Deployment
```bash
# Deploy to local environment
kubectl apply -k backstage/kustomize/overlays/local

# Deploy with Kargo pipeline
kubectl apply -k backstage/kustomize/kargo
```

## Configuration

- **App Config**: `backstage/app/app-config.yaml`
- **Catalog**: `backstage/app/examples/entities.yaml`
- **Templates**: `backstage/app/examples/template/`

## Integration Points

- **GitHub**: Source code and authentication
- **Container Registry**: Image management via image-factory plugin
- **EDA Mesh**: Event-driven architecture components via eda plugin
- **Kargo**: GitOps deployment pipelines

## Development

### Adding New Plugins
1. Create plugin in `backstage/app/plugins/`
2. Follow Backstage plugin development patterns
3. Update `backstage/app/packages/app/src/App.tsx` to include plugin

### Custom Entities
1. Add entity definitions to `backstage/app/examples/entities.yaml`
2. Follow Backstage entity schema
3. Use appropriate entity kinds (Component, API, Resource, etc.)

## Monitoring

- **Health Checks**: Built-in health endpoints
- **Metrics**: Prometheus metrics available
- **Logs**: Structured logging with configurable levels

## Related Documentation

- [Backstage Official Documentation](https://backstage.io/docs/)
- [Image Factory Plugin](../image-factory/README.md)
- [EDA Integration](../eda/README.md)