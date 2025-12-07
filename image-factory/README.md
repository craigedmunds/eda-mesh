# Image Factory

Automated system for monitoring upstream base images and triggering rebuilds of dependent internal images.

## What It Does

Monitors base images (e.g., `node:22-bookworm-slim`) and automatically triggers rebuilds of dependent images when updates are detected, with a configurable delay to allow for vulnerability discovery.

## Quick Start

### Enroll an Image

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

### Check Status

```bash
# View warehouses
kubectl get warehouses -n image-factory-kargo

# View analysis results
cat image-factory/state/images/myapp.yaml
```

## Documentation

- **[DESIGN.md](DESIGN.md)** - Architecture and how it works
- **[REQUIREMENTS.md](REQUIREMENTS.md)** - Problem statement and requirements
- **[TASKS.md](TASKS.md)** - Implementation status and backlog
- **[WORKFLOW.md](WORKFLOW.md)** - Detailed workflow guide

## File Structure

```
image-factory/
├── images.yaml              # Enrollment config (edit this)
├── state/
│   ├── images/             # Generated image state
│   └── base-images/        # Generated base image state
└── README.md               # This file
```

## Status

See [TASKS.md](TASKS.md) for current implementation status.
