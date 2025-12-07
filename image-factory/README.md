# Image Factory

Automated system for monitoring upstream base images and triggering rebuilds of dependent internal images using Kargo and ArgoCD.

## What It Does

When a base image like `node:22-bookworm-slim` is updated on Docker Hub, the Image Factory:
1. Detects the update via Kargo Warehouse
2. Waits a configurable delay (default: 7 days) for vulnerability discovery
3. Automatically triggers GitHub Actions to rebuild dependent images
4. Updates state files to track the rebuild

## Quick Start

### Enroll a New Image

Add to `images.yaml`:

```yaml
- name: myapp
  registry: ghcr.io
  repository: owner/myapp
  source:
    provider: github
    repo: owner/repo
    branch: main
    dockerfile: apps/myapp/Dockerfile
    workflow: build.yml
  rebuildDelay: 7d
  autoRebuild: true
```

### Generate Manifests

```bash
cd cdk8s/image-factory
cdk8s synth
kubectl apply -f dist/image-factory.k8s.yaml
```

### Check Status

```bash
# View warehouses
kubectl get warehouses -n image-factory-kargo

# View stages
kubectl get stages -n image-factory-kargo

# View state files
cat image-factory/state/images/myapp.yaml
```

## Documentation

Full documentation is in `.kiro/specs/image-factory/`:

- **[requirements.md](../.kiro/specs/image-factory/requirements.md)** - User stories and acceptance criteria
- **[design.md](../.kiro/specs/image-factory/design.md)** - Architecture and data models
- **[tasks.md](../.kiro/specs/image-factory/tasks.md)** - Implementation status and roadmap

## File Structure

```
image-factory/
├── images.yaml              # Enrollment config (edit this)
├── state/
│   ├── images/             # Generated image state
│   └── base-images/        # Generated base image state
└── README.md               # This file
```

## How It Works

```
Developer enrolls image → CDK8s generates manifests → ArgoCD applies
    ↓
Kargo monitors registries → Detects updates → Creates Freight
    ↓
Analysis stage runs → Parses Dockerfile → Updates state files
    ↓
Base image updates → Rebuild-trigger stage → GitHub Actions
    ↓
New image built → Cycle repeats
```

## Components

- **Analysis Tool** (`apps/image-factory/app.py`) - Parses Dockerfiles, generates state
- **CDK8s App** (`cdk8s/image-factory/main.py`) - Generates Kargo manifests
- **Kargo Resources** - Warehouses, Stages, AnalysisTemplates for orchestration

## Current Status

✅ **Working:**
- Dockerfile analysis and base image discovery
- Automated rebuild triggers via GitHub Actions
- State file management in git
- Kargo integration for monitoring and orchestration

📋 **Planned:**
- Multi-stage Dockerfile support
- External image enrollment (postgres, redis, etc.)
- Rebuild delay enforcement (7-day wait period)
- GitLab support
- Dependency graph visualization
- Security scanning integration

See [tasks.md](../.kiro/specs/image-factory/tasks.md) for detailed roadmap.
