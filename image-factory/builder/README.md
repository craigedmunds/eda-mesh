# Image Factory Builder

All-in-one container image for Image Factory operations.

## Contents

This single image contains everything needed for complete image lifecycle management:

- **Build Tools**: Podman, Buildah, Skopeo for multi-arch container builds
- **Analysis Tools**: Python 3.11 with Image Factory analysis app
- **Synthesis Tools**: CDK8s for generating Kargo manifests
- **Scanning Tools**: Trivy for vulnerability scanning
- **Orchestration**: Task for workflow automation
- **Utilities**: Git, kubectl, jq, nodejs

## Image Details

- **Base**: Red Hat UBI 9
- **Size**: ~1.5GB
- **Architectures**: amd64, arm64
- **Security**: Rootless-capable, minimal privileges required

## Building the Image

```bash
# From image-factory directory
task builder:build

# Build and push
task builder

# Test the image
task builder:test
```

## Usage in Kargo Jobs

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: build-backstage
spec:
  template:
    spec:
      containers:
        - name: builder
          image: ghcr.io/craigedmunds/image-factory:latest
          command: ["task", "build"]
          args: ["IMAGE=backstage", "TAG=v1.0.0"]
          volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: containers-storage
              mountPath: /var/lib/containers
      volumes:
        - name: workspace
          emptyDir: {}
        - name: containers-storage
          emptyDir: {}
```

## Configuration Files

### storage.conf
Configures Podman/Buildah storage with overlay driver and fuse-overlayfs for rootless operation.

### registries.conf
Defines container registries (GHCR, Docker Hub, Quay, Red Hat).

### policy.json
Image verification policy (currently accepts all images).

## Security Context

For rootless operation in Kubernetes:

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

## Environment Variables

- `KUBERNETES_SERVICE_HOST`: Auto-set in K8s, detected by tasks
- `CI`: Set to enable CI mode (skips venv creation)
- `REGISTRY`: Override default registry (default: ghcr.io)

## Healthcheck

The image includes a healthcheck that verifies:
- Task is available
- Python 3.11 is available
- Podman is available
- Buildah is available
- Trivy is available

## Layer Optimization

The Dockerfile is organized to optimize caching:

1. **Base tools** (rarely change)
2. **Container build tools** (rarely change)
3. **Configuration files** (occasionally change)
4. **Application code** (frequently changes - last layer)

This ensures that code changes don't invalidate the expensive build tool layers.
