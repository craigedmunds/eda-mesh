# Image Factory Setup Complete ✅

## What's Working

### 1. Analysis Pipeline
- ✅ Git repo cloning in analysis jobs
- ✅ Dockerfile analysis with base image discovery
- ✅ State file generation for images and base images
- ✅ Analysis logs visible via kubectl

### 2. Automated Rebuild Triggers
- ✅ `rebuild-trigger-node-22-bookworm-slim` stage created
- ✅ `rebuild-trigger-python-3.12-slim` stage created
- ✅ HTTP steps configured to call GitHub API
- ✅ Using existing `github-credentials` secret (managed by Kyverno)

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     Base Image Update Flow                       │
└─────────────────────────────────────────────────────────────────┘

1. Docker Hub publishes new node:22-bookworm-slim
   ↓
2. Kargo Warehouse detects update
   ↓
3. New Freight created for node-22-bookworm-slim
   ↓
4. rebuild-trigger-node-22-bookworm-slim Stage promotes
   ↓
5. HTTP step calls GitHub API:
   POST /repos/craigedmunds/argocd-eda/actions/workflows/backstage.yml/dispatches
   ↓
6. GitHub Actions runs backstage.yml workflow
   ↓
7. New backstage image built with updated base
   ↓
8. Kargo Warehouse detects new backstage image
   ↓
9. analyze-dockerfile-backstage Stage runs analysis
```

## Current Stages

| Stage | Purpose | Watches | Triggers |
|-------|---------|---------|----------|
| `analyze-dockerfile-backstage` | Analyze backstage Dockerfile | backstage image | Analysis job |
| `analyze-dockerfile-uv` | Analyze uv Dockerfile | uv image | Analysis job |
| `rebuild-trigger-node-22-bookworm-slim` | Trigger backstage rebuild | node base image | GitHub workflow |
| `rebuild-trigger-python-3.12-slim` | Trigger uv rebuild | python base image | GitHub workflow |

## View Status

```bash
# All stages
kubectl get stages -n image-factory-kargo

# All freight
kubectl get freight -n image-factory-kargo

# Recent analysis logs
kubectl logs -n image-factory-kargo $(kubectl get pods -n image-factory-kargo --sort-by=.metadata.creationTimestamp -o name | tail -1)

# Promotions
kubectl get promotions -n image-factory-kargo
```

## Test Rebuild Trigger

Manually promote a rebuild-trigger stage to test:

```bash
# This will trigger the backstage workflow
kubectl kargo promote \
    --stage rebuild-trigger-node-22-bookworm-slim \
    --namespace image-factory-kargo
```

Then check GitHub Actions:
https://github.com/craigedmunds/argocd-eda/actions

## Files Changed

### New Files
- `cdk8s/image-factory/lib/stages.py` - Reusable stage creation utilities
- `image-factory/REBUILD-TRIGGERS.md` - Complete documentation
- `image-factory/SETUP-COMPLETE.md` - This file
- `scripts/setup-github-token.sh` - Helper script (not needed with Kyverno)
- `scripts/latest-analysis-logs.sh` - Quick log viewer
- `scripts/view-analysis-logs.sh` - Detailed log viewer

### Modified Files
- `cdk8s/image-factory/main.py` - Added rebuild-trigger stage creation
- `cdk8s/image-factory/dist/image-factory.k8s.yaml` - Generated manifests

## Next Steps

1. **Wait for base image update** - When Docker Hub publishes a new node or python image, the rebuild will trigger automatically

2. **Or test manually** - Use the `kubectl kargo promote` command above

3. **Monitor** - Watch the GitHub Actions page to see workflows trigger

4. **Verify** - Check that new images are built and pushed to GHCR

## Troubleshooting

See [REBUILD-TRIGGERS.md](./REBUILD-TRIGGERS.md#troubleshooting) for detailed troubleshooting steps.

Quick checks:
```bash
# Verify secret exists
kubectl get secret github-credentials -n image-factory-kargo

# Check stage status
kubectl get stage rebuild-trigger-node-22-bookworm-slim -n image-factory-kargo -o yaml

# View recent promotions
kubectl get promotions -n image-factory-kargo --sort-by=.metadata.creationTimestamp | tail -5
```

## Architecture Notes

- **Why separate stages?** Clear separation between analysis and rebuild triggering
- **Why HTTP step?** Simpler than webhooks, no need to expose Kargo
- **Why Kyverno secret?** Centralized secret management across namespaces
- **Why workflow_dispatch?** Allows passing context (base image name, digest) to the build
