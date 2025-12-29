# Image Factory Capability

## Overview

Image Factory is a container lifecycle management system that automates the building, testing, and deployment of Docker images. It provides a centralized approach to managing container images used across the platform.

## Components

### Application (`app/`)
- **Flask Service**: Python-based web service for image management
- **Dependencies**: Managed via `pyproject.toml` and `uv.lock`
- **Testing**: Unit tests with pytest

### Infrastructure (`cdk8s/`)
- **CDK8s Definitions**: Infrastructure as code using Python CDK8s
- **Kargo Integration**: GitOps pipeline definitions
- **Kubernetes Resources**: Deployments, services, and configurations

### State Management (`state/`)
- **Base Images**: Configuration for base container images
- **Managed Images**: Definitions for application-specific images
- **Version Tracking**: Image version and tag management

## Key Features

- **Automated Building**: Triggered builds based on source changes
- **Multi-Architecture Support**: ARM64 and AMD64 image builds
- **Registry Integration**: GitHub Container Registry (GHCR) integration
- **Kargo Pipelines**: GitOps-based deployment workflows
- **State Management**: Centralized image configuration and versioning

## Image Types

### Base Images (`state/base-images/`)
- **Node.js**: `node-22-bookworm-slim`
- **Python**: `python-3.12-slim`
- Foundation images for application containers

### Application Images (`state/images/`)
- **Backstage**: Main developer portal application
- **UV Service**: Python utility service
- Custom application containers

## Deployment

### Local Development
```bash
cd image-factory/app
uv sync
uv run python app.py
```

### Kubernetes Deployment
```bash
# Deploy infrastructure
kubectl apply -k image-factory/cdk8s/dist

# Check deployment status
kubectl get pods -n image-factory
```

## Configuration

### Image Definitions
Images are defined in YAML files under `state/`:
```yaml
# state/images/example.yaml
apiVersion: v1
kind: ImageDefinition
metadata:
  name: example-app
spec:
  baseImage: node-22-bookworm-slim
  buildContext: apps/example
  registry: ghcr.io/organization
  tags:
    - latest
    - v1.0.0
```

### Build Configuration
- **Dockerfile**: Located in application directories
- **Build Context**: Specified in image definitions
- **Registry**: GitHub Container Registry integration

## Operations

### Building Images
```bash
# Trigger build via API
curl -X POST http://image-factory/api/build/image-name

# Check build status
curl http://image-factory/api/status/build-id
```

### Managing State
```bash
# Update image configuration
kubectl apply -f state/images/new-image.yaml

# View current images
kubectl get images -n image-factory
```

## Integration Points

- **GitHub Actions**: Automated builds on code changes
- **Kargo**: GitOps deployment pipelines
- **Container Registry**: GHCR for image storage
- **Backstage**: Image catalog and management UI

## Monitoring

- **Build Logs**: Available via API and Kubernetes logs
- **Metrics**: Build success/failure rates
- **Health Checks**: Service health endpoints

## Testing

### Unit Tests
```bash
# Run Python unit tests
task test:unit
# or
cd app && python -m pytest test_integration.py -v
```

### Integration Tests
The Kargo integration test validates the complete image factory pipeline:

```bash
# Run Kargo integration test
task test:integration
# or
npm install && npm run test:kargo
```

The integration test covers:
1. **Freight Creation**: Validates base image and managed image freight
2. **Analysis Stage**: Tests Dockerfile analysis job execution
3. **Git Commits**: Verifies state file updates are committed to git
4. **Rebuild Triggers**: Tests GitHub Actions workflow dispatch
5. **End-to-End Flow**: Complete pipeline from base image update to rebuild

### All Tests
```bash
# Run both unit and integration tests
task test:all
```

## Development

### Adding New Images
1. Create image definition in `state/images/`
2. Ensure Dockerfile exists in build context
3. Configure registry and tagging strategy
4. Test build process locally

### Modifying Infrastructure
1. Update CDK8s definitions in `cdk8s/`
2. Run `cdk8s synth` to generate manifests
3. Apply changes via GitOps pipeline

## Troubleshooting

### Common Issues
- **Build Failures**: Check Dockerfile and build context
- **Registry Access**: Verify GHCR credentials
- **Resource Limits**: Monitor CPU/memory usage during builds

### Debugging
```bash
# View service logs
kubectl logs -n image-factory deployment/image-factory

# Check build status
kubectl get analysisruns -n image-factory-kargo
```

## Related Documentation

- [Kargo Documentation](https://docs.akuity.io/kargo/)
- [CDK8s Documentation](https://cdk8s.io/)
- [Container Registry Setup](../platform/README.md#container-registry)