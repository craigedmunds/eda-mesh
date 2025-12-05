# Image Factory Workflow

This document describes how the image factory tool and cdk8s app work together.

## Overview

The image factory system manages container images in two categories:

1. **Managed Images**: Images we build and maintain (have source repo and Dockerfile)
2. **External Images**: Third-party images we track but don't build (base images, dependencies)

## Data Flow

```
images.yaml (source of truth)
    ↓
tool.py (discovers dependencies, generates state)
    ↓
state/images/*.yaml + state/base-images/*.yaml
    ↓
cdk8s/image-factory/main.py (generates Kubernetes manifests)
    ↓
Kargo Warehouse resources
```

## Key Principles

1. **images.yaml is the source of truth** for enrollment configuration
2. **State files preserve runtime data** (digests, build history, etc.)
3. **Tool merges config with state**, preferring images.yaml for config
4. **External images can become managed** by adding source info
5. **Base images are auto-discovered** from Dockerfiles

## Usage

### 1. Enroll a New Managed Image

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

Run the tool:

```bash
cd image-factory
./tool.py
```

This will:
- Create `state/images/myapp.yaml`
- Parse the Dockerfile to find base images
- Create state files for any new base images in `state/base-images/`

### 2. Enroll an External Image

Add to `images.yaml`:

```yaml
- name: postgres
  registry: docker.io
  repository: library/postgres
  allowTags: ^16-alpine$
  imageSelectionStrategy: Lexical
  rebuildDelay: 30d
  autoRebuild: false
```

Run the tool - it will create `state/images/postgres.yaml` with warehouse config.

### 3. Convert External to Managed

Simply add the `source` section to the image in `images.yaml` and run the tool.
The state file will be updated to reflect the new managed status.

### 4. Generate Kubernetes Manifests

```bash
cd cdk8s/image-factory
cdk8s synth
```

This reads the state files and generates Kargo Warehouse resources in `dist/`.

## State File Structure

### Managed Image State (`state/images/*.yaml`)

```yaml
name: backstage
enrolledAt: "2024-12-04T10:00:00Z"
lastDiscovery: "2024-12-04T15:30:00Z"
discoveryStatus: pending  # or: success, failed, external

enrollment:
  registry: ghcr.io
  repository: owner/backstage
  source:
    provider: github
    repo: owner/repo
    dockerfile: apps/backstage/Dockerfile
  rebuildDelay: 7d
  autoRebuild: true

baseImages:
  - node-22-bookworm-slim

currentVersion: "0.6.5"
currentDigest: sha256:abc123...
lastBuilt: "2024-12-03T12:00:00Z"

rebuildState:
  status: monitoring
  pendingRebuild: false
```

### External Image State (`state/images/*.yaml`)

```yaml
name: postgres
enrolledAt: "2024-12-04T10:00:00Z"
discoveryStatus: external

enrollment:
  registry: docker.io
  repository: library/postgres
  rebuildDelay: 30d
  autoRebuild: false

# Warehouse configuration (for cdk8s)
repoURL: docker.io/library/postgres
allowTags: ^16-alpine$
imageSelectionStrategy: Lexical

baseImages: []
```

### Base Image State (`state/base-images/*.yaml`)

```yaml
name: node-22-bookworm-slim
fullImage: node:22-bookworm-slim
registry: docker.io
repository: library/node
tag: 22-bookworm-slim

# Warehouse configuration (for cdk8s)
repoURL: docker.io/library/node
allowTags: ^22-bookworm-slim$
imageSelectionStrategy: Lexical

firstDiscovered: "2024-12-04T10:00:00Z"
lastChecked: "2024-12-04T15:30:00Z"

dependentImages:
  - backstage
  - frontend

currentDigest: sha256:def456...
lastUpdated: null
```

## CDK8s Integration

The cdk8s app (`cdk8s/image-factory/main.py`):

1. Loads `images.yaml`
2. Loads all state files from `state/images/` and `state/base-images/`
3. Merges them (images.yaml takes precedence)
4. Creates Kargo Warehouse resources for images with `repoURL` and `allowTags`

Only base images and external images get Warehouse resources, since managed images
are built by CI/CD and pushed to registries.

## Testing

### Unit Tests

```bash
# Test the tool
cd image-factory
pytest test_tool.py

# Test the cdk8s app
cd cdk8s/image-factory
pytest test_main.py
```

### Integration Tests

```bash
cd image-factory
pytest test_integration.py
```

This verifies the complete workflow from images.yaml → tool → state files → cdk8s.

## Workflow Scenarios

### Scenario 1: New Base Image Version

1. Kargo detects new `node:22-bookworm-slim` digest
2. Updates `state/base-images/node-22-bookworm-slim.yaml`
3. Checks `dependentImages` list
4. For each dependent, checks if `rebuildDelay` has passed
5. Triggers rebuilds for eligible images

### Scenario 2: Adding a New Image

1. Developer adds image to `images.yaml`
2. Runs `./tool.py`
3. Tool creates state file and discovers base images
4. Runs `cdk8s synth` to generate Warehouse for base images
5. Applies manifests to cluster
6. Kargo starts tracking base images

### Scenario 3: Changing Image Configuration

1. Developer updates `images.yaml` (e.g., changes registry)
2. Runs `./tool.py`
3. Tool merges new config with existing state
4. Runtime data (digests, history) is preserved
5. Configuration is updated

## Best Practices

1. **Always run tool.py after editing images.yaml**
2. **Commit state files to git** (they contain important tracking data)
3. **Don't manually edit state files** (use images.yaml instead)
4. **Run tests before committing** to ensure consistency
5. **Review generated manifests** before applying to cluster
