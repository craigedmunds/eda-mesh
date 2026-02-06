# Actions Runner Controller (ARC) - K8s Lab Component

Self-hosted GitHub Actions runners in Kubernetes with auto-scaling.

## Overview

This component deploys Actions Runner Controller (ARC) to provide unlimited, free GitHub Actions minutes by running self-hosted runners in your Kubernetes cluster.

## Architecture

```
GitHub Webhook
    ↓
ARC Controller (arc-systems namespace)
    ↓
AutoscalingRunnerSet (0-5 runners)
    ↓
Runner Pods (ephemeral, one per job)
    ↓
Execute GitHub Actions workflows
```

## Components

### Base Resources

- **Namespace**: `arc-systems` with secret labels
- **ClusterExternalSecret**: Syncs GitHub PAT from central-secret-store
- **HelmRelease**: Installs ARC controller via Flux
- **AutoscalingRunnerSet**: Defines runner configuration
- **ServiceAccount**: RBAC for runners
- **Runner Scale Set**: Auto-scaling configuration

### Overlays

- **lab**: Lab environment with reduced resources (max 3 runners)

## Secret Management

ARC uses the central secret store pattern:

1. **Source Secret**: `github-pat` in `central-secret-store` namespace
2. **Distribution**: ClusterExternalSecret creates `github-arc-secret`
3. **Namespace Label**: `secrets/arc-github-token: "true"` enables sync
4. **ARC Usage**: Controller uses token to register runners with GitHub

### Required Secret Format

The `github-pat` secret in `central-secret-store` must contain:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-pat
  namespace: central-secret-store
type: Opaque
stringData:
  token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Token Permissions

The GitHub PAT needs:
- **Repository runners**: `repo` scope
- **Organization runners**: `admin:org` scope
- **Enterprise runners**: `manage_runners:enterprise` scope

## Prerequisites

1. **cert-manager**: Required for ARC webhook certificates
   ```bash
   kubectl get pods -n cert-manager
   ```

2. **Flux CD**: For HelmRelease management
   ```bash
   kubectl get pods -n flux-system
   ```

3. **External Secrets Operator**: For secret distribution
   ```bash
   kubectl get pods -n external-secrets
   ```

4. **GitHub PAT**: Must be stored in central-secret-store
   ```bash
   kubectl get secret github-pat -n central-secret-store
   ```

## Deployment

### Via ArgoCD Application

The component is deployed via ArgoCD Application:

```bash
# Apply the ArgoCD app
kubectl apply -f platform/kustomize/seed/arc/arc-app.yaml

# Watch deployment
kubectl get app arc -n argocd -w
```

### Manual Deployment (for testing)

```bash
# Build and preview
kubectl kustomize platform/kustomize/seed/arc/overlays/lab

# Apply
kubectl apply -k platform/kustomize/seed/arc/overlays/lab

# Verify
kubectl get pods -n arc-systems
```

## Verification

### Check ARC Controller

```bash
# Controller should be running
kubectl get pods -n arc-systems -l app.kubernetes.io/name=arc-controller

# Check controller logs
kubectl logs -n arc-systems -l app.kubernetes.io/name=arc-controller -f
```

### Check Runner Scale Set

```bash
# Scale set should be created
kubectl get autoscalingrunnerset -n arc-systems

# Listener pod should be running
kubectl get pods -n arc-systems -l app.kubernetes.io/component=runner-scale-set-listener
```

### Check Secret Distribution

```bash
# GitHub token should exist
kubectl get secret github-arc-secret -n arc-systems

# Verify token content (base64 decoded)
kubectl get secret github-arc-secret -n arc-systems -o jsonpath='{.data.github_token}' | base64 -d
```

### Check GitHub Registration

1. Go to your repository/organization settings
2. Navigate to: Settings → Actions → Runners
3. You should see "arc-runner-set" registered

## Usage in Workflows

Update your GitHub Actions workflows to use self-hosted runners:

```yaml
# Before (GitHub-hosted)
jobs:
  build:
    runs-on: ubuntu-latest

# After (ARC self-hosted)
jobs:
  build:
    runs-on: arc-runner-set
```

### Example: Building with Image Factory

```yaml
name: Build Backstage

on:
  push:
    branches: [main]
    paths: ['backstage/**']

jobs:
  build:
    runs-on: arc-runner-set  # Self-hosted runner
    steps:
      - uses: actions/checkout@v4
      
      - name: Build multi-arch image
        run: |
          docker run --rm \
            -v $(pwd):/workspace \
            -v /var/run/docker.sock:/var/run/docker.sock \
            ghcr.io/craigedmunds/image-factory:latest \
            task build IMAGE=backstage TAG=${{ github.sha }}
```

## Configuration

### Auto-Scaling Parameters

Defined in `runner-scale-set.yaml`:

- **minRunners**: `0` (scale to zero when idle)
- **maxRunners**: `5` (base), `3` (lab overlay)
- **scaleDownDelaySecondsAfterScaleUp**: `300` seconds (5 minutes)

### Resource Limits

**Base (production):**
```yaml
requests:
  cpu: "1"
  memory: "2Gi"
limits:
  cpu: "4"
  memory: "8Gi"
```

**Lab overlay:**
```yaml
requests:
  cpu: "500m"
  memory: "1Gi"
limits:
  cpu: "2"
  memory: "4Gi"
```

### GitHub Configuration

Change the target repository/organization in the overlay:

```yaml
# overlays/lab/runner-scale-set-patch.yaml
spec:
  githubConfigUrl: "https://github.com/YOUR_ORG/YOUR_REPO"
```

Options:
- Repository: `https://github.com/owner/repo`
- Organization: `https://github.com/org`
- Enterprise: `https://github.com/enterprises/enterprise`

## Monitoring

### View Runner Pods

```bash
# Watch runners scale
kubectl get pods -n arc-systems -l app.kubernetes.io/component=runner -w

# View runner logs
kubectl logs -n arc-systems -l app.kubernetes.io/component=runner --tail=100 -f
```

### View Listener Status

```bash
# Listener connects to GitHub webhook
kubectl logs -n arc-systems -l app.kubernetes.io/component=runner-scale-set-listener -f
```

### View Metrics

```bash
# Resource usage
kubectl top pods -n arc-systems

# Runner count
kubectl get autoscalingrunnerset arc-runner-set -n arc-systems -o jsonpath='{.status}'
```

## Troubleshooting

### Runners Not Scaling

1. Check listener logs:
   ```bash
   kubectl logs -n arc-systems -l app.kubernetes.io/component=runner-scale-set-listener -f
   ```

2. Check controller logs:
   ```bash
   kubectl logs -n arc-systems -l app.kubernetes.io/name=arc-controller -f
   ```

3. Verify GitHub webhook connectivity:
   ```bash
   kubectl exec -it <listener-pod> -n arc-systems -- curl -I https://api.github.com
   ```

### Token Issues

1. Verify secret exists:
   ```bash
   kubectl get secret github-arc-secret -n arc-systems
   ```

2. Check token value:
   ```bash
   kubectl get secret github-arc-secret -n arc-systems -o jsonpath='{.data.github_token}' | base64 -d
   ```

3. Test token permissions:
   ```bash
   TOKEN=$(kubectl get secret github-arc-secret -n arc-systems -o jsonpath='{.data.github_token}' | base64 -d)
   curl -H "Authorization: token $TOKEN" https://api.github.com/user
   ```

### Docker Build Failures

1. Verify Docker socket is mounted:
   ```bash
   kubectl exec -it <runner-pod> -n arc-systems -- ls -la /var/run/docker.sock
   ```

2. Test Docker in runner:
   ```bash
   kubectl exec -it <runner-pod> -n arc-systems -- docker ps
   ```

### Resource Exhaustion

1. Check cluster capacity:
   ```bash
   kubectl top nodes
   ```

2. Adjust maxRunners or resource limits:
   ```bash
   kubectl edit autoscalingrunnerset arc-runner-set -n arc-systems
   ```

## Customization

### Use Different Runner Image

Edit `runner-scale-set.yaml`:

```yaml
spec:
  template:
    spec:
      containers:
        - name: runner
          image: ghcr.io/craigedmunds/custom-runner:latest
```

### Add Additional Tools

Use an init container to install tools:

```yaml
spec:
  template:
    spec:
      initContainers:
        - name: setup-tools
          image: alpine:latest
          command: ["sh", "-c", "apk add --no-cache terraform kubectl"]
          volumeMounts:
            - name: tools
              mountPath: /tools
```

### Multiple Runner Scale Sets

Create additional scale sets for different workloads:

```yaml
# runner-scale-set-heavy.yaml
apiVersion: actions.github.com/v1alpha1
kind: AutoscalingRunnerSet
metadata:
  name: arc-runner-set-heavy
spec:
  runnerScaleSetName: "arc-heavy"
  maxRunners: 2
  template:
    spec:
      containers:
        - name: runner
          resources:
            limits:
              cpu: "8"
              memory: "16Gi"
```

## Security

### Runner Isolation

- Runners are **ephemeral** (one pod per job, deleted after)
- Each runner runs in isolated pod
- No state persists between jobs

### Network Policies

Consider adding NetworkPolicies to restrict runner egress:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: arc-runners
  namespace: arc-systems
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/component: runner
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443
```

### Token Rotation

Rotate the GitHub PAT regularly:

1. Create new PAT in GitHub
2. Update secret in central-secret-store:
   ```bash
   kubectl create secret generic github-pat \
     --from-literal=token=ghp_NEW_TOKEN \
     --namespace=central-secret-store \
     --dry-run=client -o yaml | kubectl apply -f -
   ```
3. ExternalSecrets automatically syncs to arc-systems
4. Restart ARC controller:
   ```bash
   kubectl rollout restart deployment arc-controller -n arc-systems
   ```

## Cost Savings

### Before ARC (GitHub-hosted)

Assuming your current usage (full quota in 6 days):
- Monthly quota consumed in 6 days
- Projected overage: $72-90/month

### After ARC (Self-hosted)

- GitHub Actions minutes: **$0** (unlimited)
- K8s resources: Using existing cluster
- **Savings: $72-90/month**

## Related Documentation

- [ARC Implementation Guide](/image-factory/ARC-IMPLEMENTATION-GUIDE.md)
- [Secret Management Steering](/../../.ai/steering/secret-management.md)
- [GitHub Actions Workflow Docs](https://docs.github.com/en/actions)
- [ARC Official Docs](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners-with-actions-runner-controller)

## Support

For issues or questions:
1. Check logs: `kubectl logs -n arc-systems`
2. Review [ARC Troubleshooting](https://github.com/actions/actions-runner-controller/blob/master/TROUBLESHOOTING.md)
3. GitHub Discussions: https://github.com/actions/actions-runner-controller/discussions
