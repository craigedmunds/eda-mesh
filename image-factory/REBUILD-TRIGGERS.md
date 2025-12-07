# Automated Rebuild Triggers

## Overview

This system automatically triggers GitHub Actions workflows to rebuild dependent images when their base images are updated.

## Architecture

```
Base Image Update → Kargo Warehouse → Rebuild-Trigger Stage → GitHub API → Workflow Dispatch → Image Build
```

### Flow Example

1. **Base Image Update**: Docker Hub publishes `node:22-bookworm-slim` with a new digest
2. **Kargo Detection**: The `node-22-bookworm-slim` Warehouse detects the new image
3. **Freight Creation**: Kargo creates new Freight for the base image
4. **Stage Promotion**: The `rebuild-trigger-node-22-bookworm-slim` Stage is promoted
5. **HTTP Trigger**: Stage executes HTTP step to call GitHub API
6. **Workflow Dispatch**: GitHub triggers `backstage.yml` workflow
7. **Image Build**: Backstage image is rebuilt with the new base image

## Components

### 1. Warehouses

- **Base Image Warehouses**: Watch upstream images (node, python, etc.)
  - `node-22-bookworm-slim` → watches `docker.io/library/node:22-bookworm-slim`
  - `python-3.12-slim` → watches `docker.io/library/python:3.12-slim`

- **Managed Image Warehouses**: Watch your built images
  - `backstage` → watches `ghcr.io/craigedmunds/backstage`
  - `uv` → watches `ghcr.io/craigedmunds/uv`

### 2. Stages

#### Analysis Stages
- `analyze-dockerfile-backstage`: Analyzes Dockerfile when backstage image updates
- `analyze-dockerfile-uv`: Analyzes Dockerfile when uv image updates

#### Rebuild-Trigger Stages
- `rebuild-trigger-node-22-bookworm-slim`: Triggers backstage rebuild when node base updates
- `rebuild-trigger-python-3.12-slim`: Triggers uv rebuild when python base updates

### 3. GitHub Workflows

Each workflow supports `workflow_dispatch` with inputs:
- `version_bump`: patch/minor/major
- `triggered_by`: Source of the trigger (e.g., "kargo-base-image-update")
- `base_image`: Name of the base image that triggered the rebuild

## Setup

### Prerequisites

The system uses the `github-credentials` secret managed by Kyverno. This secret should already exist in the `image-factory-kargo` namespace with:
- Key: `password` (contains GitHub Personal Access Token)
- Scope required: **workflow** (Full control of GitHub Actions workflows)

To verify the secret exists:

```bash
kubectl get secret github-credentials -n image-factory-kargo
```

### Apply Kargo Manifests

```bash
kubectl apply -f cdk8s/image-factory/dist/image-factory.k8s.yaml
```

## Testing

### Manual Test: Trigger a Rebuild

You can manually promote a rebuild-trigger stage to test:

```bash
# Promote the node rebuild-trigger stage
kubectl kargo promote \
    --stage rebuild-trigger-node-22-bookworm-slim \
    --namespace image-factory-kargo
```

This will trigger the backstage workflow.

### Check Promotion Status

```bash
# List all stages
kubectl get stages -n image-factory-kargo

# Check specific stage
kubectl get stage rebuild-trigger-node-22-bookworm-slim -n image-factory-kargo -o yaml

# View promotions
kubectl get promotions -n image-factory-kargo
```

### View Logs

```bash
# Get recent promotions
kubectl get promotions -n image-factory-kargo --sort-by=.metadata.creationTimestamp | tail -5

# View promotion details
kubectl describe promotion <promotion-name> -n image-factory-kargo
```

## Configuration

### Adding New Images

1. Add to `image-factory/images.yaml`:

```yaml
- name: myapp
  registry: ghcr.io
  repository: myorg/myapp
  source:
    provider: github
    repo: myorg/myrepo
    branch: main
    dockerfile: apps/myapp/Dockerfile
    workflow: myapp.yml  # GitHub Actions workflow file
  rebuildDelay: 7d
  autoRebuild: true
```

2. Regenerate manifests:

```bash
cd cdk8s/image-factory
cdk8s synth
```

3. Apply:

```bash
kubectl apply -f cdk8s/image-factory/dist/image-factory.k8s.yaml
```

### Customizing Rebuild Behavior

Edit the rebuild-trigger stage creation in `cdk8s/image-factory/main.py`:

```python
# Change version bump type
"version_bump": "minor"  # instead of "patch"

# Add custom inputs
"inputs": {
    "version_bump": "patch",
    "triggered_by": "kargo-base-image-update",
    "base_image": base_name,
    "custom_param": "value"
}
```

## Troubleshooting

### Workflow Not Triggering

1. **Check secret exists**:
   ```bash
   kubectl get secret github-token -n image-factory-kargo
   ```

2. **Check token has correct scope**:
   - Token needs `workflow` scope
   - Verify at https://github.com/settings/tokens

3. **Check promotion status**:
   ```bash
   kubectl get promotions -n image-factory-kargo
   kubectl describe promotion <name> -n image-factory-kargo
   ```

4. **Check GitHub API response**:
   - Look at promotion logs for HTTP response codes
   - 401 = Authentication failed (bad token)
   - 404 = Workflow file not found
   - 422 = Invalid inputs

### Stage Not Promoting

1. **Check if freight exists**:
   ```bash
   kubectl get freight -n image-factory-kargo
   ```

2. **Check stage configuration**:
   ```bash
   kubectl get stage rebuild-trigger-node-22-bookworm-slim -n image-factory-kargo -o yaml
   ```

3. **Enable auto-promotion** (if desired):
   - Edit ProjectConfig to add auto-promotion policy

## Architecture Decisions

### Why HTTP Step Instead of Webhooks?

- **Simpler**: No need to expose Kargo to the internet
- **Secure**: Token stored in Kubernetes secret
- **Reliable**: Direct API call, no webhook delivery issues
- **Flexible**: Easy to customize per-image

### Why Separate Rebuild-Trigger Stages?

- **Clear separation**: Analysis vs. rebuild triggering
- **Independent control**: Can disable rebuilds without affecting analysis
- **Visibility**: Easy to see which base image triggered which rebuild
- **Flexibility**: Different rebuild strategies per base image

## Future Enhancements

- [ ] Add retry logic for failed HTTP calls
- [ ] Add notifications (Slack, email) when rebuilds are triggered
- [ ] Support for GitLab CI/CD triggers
- [ ] Configurable rebuild delays (wait N hours after base update)
- [ ] Smart rebuild scheduling (avoid peak hours)
