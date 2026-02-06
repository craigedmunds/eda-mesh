# Image Factory Build System

## Overview

The Image Factory now includes an integrated build system using **Podman + Buildah** running in Kubernetes. This enables self-contained image lifecycle management without relying solely on GitHub Actions.

## Architecture

### Single All-in-One Builder Image

**Image**: `ghcr.io/craigedmunds/image-factory:latest`

Contains everything needed for complete image lifecycle management:
- **Build**: Podman + Buildah + Skopeo (multi-arch builds)
- **Analyze**: Python 3.11 + Image Factory analysis app
- **Synthesize**: CDK8s for generating Kargo manifests
- **Scan**: Trivy for vulnerability scanning
- **Orchestrate**: Task for workflow automation
- **Utilities**: Git, kubectl, jq, nodejs

**Size**: ~1.5GB  
**Architectures**: amd64, arm64  
**Security**: Rootless-capable, runs as non-root user  
**Build Time**: ~30 seconds (code changes), ~10 minutes (full rebuild)  
**Optimization**: Multi-stage build with layer caching (see `builder/BUILD-OPTIMIZATION.md`)

## Usage

### Building Enrolled Images

All images are enrolled in `images.yaml`. The build system reads configuration from there.

```bash
# Build any enrolled image (multi-arch: amd64 + arm64)
task build IMAGE=backstage TAG=v1.0.0

# Quick local test build (current platform only, no push)
task build:local IMAGE=backstage

# Scan existing image without rebuilding
task build:scan-only IMAGE=backstage TAG=v1.0.0
```

### Managing the Builder Image

```bash
# Build and push the builder image itself
task builder

# Or separately:
task builder:build      # Build the image
task builder:push       # Push to registry
task builder:test       # Test all tools work
```

### Deploying to Kubernetes

```bash
# Deploy Image Factory to K8s
task deploy

# Check status
task status

# View logs
task logs
```

## Build Pipeline

The `task build` command executes a complete multi-step pipeline:

1. **Validate**: Ensure image is enrolled in `images.yaml`
2. **Configure**: Extract build configuration
3. **Clone**: Clone source repo if needed (for external repos)
4. **Build**: Build multi-arch images (amd64 + arm64) using Buildah
5. **Push**: Push multi-arch manifest to registry
6. **Scan**: Vulnerability scan with Trivy
7. **Update**: Update Image Factory state tracking

## Integration Points

### Manual Triggers

Developers can manually trigger builds:

```bash
# From local machine (requires builder image locally)
task build IMAGE=backstage

# Or exec into K8s pod
kubectl exec -it image-factory-pod -- task build IMAGE=backstage
```

### Kargo Triggers

Kargo can trigger builds via AnalysisTemplate Jobs:

```yaml
apiVersion: kargo.akuity.io/v1alpha1
kind: AnalysisTemplate
spec:
  metrics:
    - name: build-image
      provider:
        job:
          spec:
            template:
              spec:
                containers:
                  - name: builder
                    image: ghcr.io/craigedmunds/image-factory:latest
                    command: ["task", "build"]
                    args: ["IMAGE={{args.image}}", "TAG={{args.tag}}"]
```

### GitHub Actions (Co-existence)

GitHub Actions workflows continue to work for git-push-triggered builds. The Image Factory build system complements them for:

- **Base image update rebuilds** (triggered by Kargo)
- **Manual operator rebuilds** (on-demand)
- **Scheduled rebuilds** (via CronJob)
- **Emergency patches** (bypassing git workflow)

## Build Workflow Comparison

| Trigger | Build System | Use Case |
|---------|--------------|----------|
| Git push | GitHub Actions | Normal development workflow |
| Base image update | Image Factory (Kargo) | Automated security updates |
| Manual | Image Factory | Operator intervention |
| Scheduled | Image Factory | Periodic rebuilds |

## Multi-Architecture Support

All builds are **multi-arch by default** (amd64 + arm64):

- Uses Podman manifest lists
- Builds each architecture separately with Buildah
- Pushes combined manifest to registry
- Kubernetes pulls correct architecture automatically

## Security

### Rootless Operation

The builder runs rootless using:
- fuse-overlayfs for overlay storage
- slirp4netns for networking
- User namespaces for isolation

### Kubernetes Security Context

```yaml
securityContext:
  runAsUser: 1000
  runAsGroup: 1000
  allowPrivilegeEscalation: false
  capabilities:
    add:
      - SETUID
      - SETGID
  seccompProfile:
    type: RuntimeDefault
```

### Registry Credentials

Credentials managed via Kubernetes Secrets:
- Mounted as `/run/secrets/...`
- Or environment variables
- Podman auth configured in `~/.docker/config.json`

## File Structure

```
image-factory/
├── builder/                      # Builder image definition
│   ├── Dockerfile                # All-in-one builder image
│   ├── configs/
│   │   ├── storage.conf          # Podman storage config
│   │   ├── registries.conf       # Registry configuration
│   │   └── policy.json           # Image verification policy
│   └── README.md
├── Taskfile.yaml                 # Build pipeline tasks
├── images.yaml                   # Enrolled images
└── BUILD-SYSTEM.md              # This file
```

## Troubleshooting

### Builder image won't build

Check Docker/Podman is available:
```bash
docker --version
podman --version
```

### Build fails in K8s

Check pod logs:
```bash
kubectl logs -n image-factory-kargo -l job-name=build-backstage
```

Check storage volumes:
```bash
kubectl describe pod <pod-name> -n image-factory-kargo
```

### Multi-arch build issues

Ensure Buildah supports both architectures:
```bash
buildah --version
# Should support --arch flag
```

### Registry push failures

Check credentials:
```bash
kubectl get secret ghcr-credentials -n image-factory-kargo
```

## Future Enhancements

- [ ] Build caching (layer cache in registry)
- [ ] Parallel architecture builds
- [ ] Image signing with Cosign
- [ ] SBOM generation
- [ ] Build metrics and reporting
- [ ] Build queue management
- [ ] Automatic version bumping
- [ ] Rollback capabilities

## Related Documentation

- `.ai/steering/docker-image-workflow.md` - Docker workflow standards
- `image-factory/README.md` - Image Factory overview
- `builder/README.md` - Builder image details
- `.ai/projects/infrastructure/image-factory/` - Design documents
