# ARC Deployment Quick Start

## What Was Created

A complete kustomize-based deployment for Actions Runner Controller (ARC) following k8s-lab patterns:

```
platform/kustomize/seed/arc/
├── arc-app.yaml                           # ArgoCD Application
├── kustomization.yaml                     # Seed kustomization
├── README.md                              # Full documentation
├── DEPLOYMENT.md                          # This file
├── base/
│   ├── namespace.yaml                     # arc-systems namespace with secret labels
│   ├── cluster-external-secret.yaml       # Syncs GitHub PAT from central store
│   ├── service-account.yaml               # RBAC for runners
│   ├── helm-release.yaml                  # Flux HelmRelease for ARC controller
│   ├── runner-scale-set.yaml              # AutoscalingRunnerSet configuration
│   └── kustomization.yaml
└── overlays/
    └── lab/
        ├── runner-scale-set-patch.yaml    # Lab-specific config
        └── kustomization.yaml
```

## Prerequisites Checklist

Before deploying, ensure these are in place:

- [ ] **cert-manager** installed (required for ARC webhooks)
  ```bash
  kubectl get pods -n cert-manager
  ```

- [ ] **Flux CD** installed (for HelmRelease)
  ```bash
  kubectl get pods -n flux-system
  ```

- [ ] **External Secrets Operator** installed
  ```bash
  kubectl get pods -n external-secrets
  ```

- [ ] **GitHub PAT** stored in central-secret-store
  ```bash
  # The secret should already exist from image-factory setup
  kubectl get secret github-pat -n central-secret-store
  ```

## Deployment Steps

### Step 1: Deploy via ArgoCD (Recommended)

```bash
# Apply the ArgoCD Application
kubectl apply -f platform/kustomize/seed/arc/arc-app.yaml

# Watch the deployment
kubectl get app arc -n argocd -w

# Check sync status
kubectl get app arc -n argocd
```

### Step 2: Verify Deployment

```bash
# Check namespace created with correct labels
kubectl get namespace arc-systems --show-labels

# Check secret distribution
kubectl get secret github-arc-secret -n arc-systems

# Check ARC controller
kubectl get pods -n arc-systems -l app.kubernetes.io/name=arc-controller

# Check runner scale set
kubectl get autoscalingrunnerset -n arc-systems

# Check listener (connects to GitHub)
kubectl get pods -n arc-systems -l app.kubernetes.io/component=runner-scale-set-listener
```

Expected output:
```
NAME                                 READY   STATUS    RESTARTS   AGE
arc-controller-xxxxx                 1/1     Running   0          2m
arc-runner-set-listener-xxxxx        1/1     Running   0          2m
```

### Step 3: Verify GitHub Registration

1. Go to your GitHub repository/organization
2. Navigate to: **Settings → Actions → Runners**
3. You should see **"arc-runner-set"** listed as a runner

### Step 4: Test with a Workflow

Update any workflow to use self-hosted runners:

```yaml
# .github/workflows/test-arc.yml
name: Test ARC

on:
  workflow_dispatch:

jobs:
  test:
    runs-on: arc-runner-set  # ← Use self-hosted runner
    steps:
      - name: Test runner
        run: |
          echo "Running on self-hosted ARC runner!"
          docker --version
          kubectl version --client
```

Trigger the workflow:
```bash
gh workflow run test-arc.yml

# Watch runner pod spin up
kubectl get pods -n arc-systems -w
```

## Configuration

### Change GitHub URL

Edit `overlays/lab/runner-scale-set-patch.yaml`:

```yaml
spec:
  # For repository-level runners
  githubConfigUrl: "https://github.com/YOUR_ORG/YOUR_REPO"
  
  # For organization-level runners
  githubConfigUrl: "https://github.com/YOUR_ORG"
  
  # For enterprise-level runners
  githubConfigUrl: "https://github.com/enterprises/YOUR_ENTERPRISE"
```

Then sync ArgoCD:
```bash
kubectl annotate app arc -n argocd argocd.argoproj.io/refresh=normal
```

### Adjust Scaling Limits

Edit `overlays/lab/runner-scale-set-patch.yaml`:

```yaml
spec:
  minRunners: 0      # Scale to zero when idle
  maxRunners: 5      # Increase if you need more concurrent builds
```

### Tune Resource Limits

Edit `overlays/lab/runner-scale-set-patch.yaml`:

```yaml
spec:
  template:
    spec:
      containers:
        - name: runner
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
```

## Troubleshooting

### Controller Not Starting

```bash
# Check controller logs
kubectl logs -n arc-systems -l app.kubernetes.io/name=arc-controller -f

# Check HelmRelease status
kubectl get helmrelease arc-controller -n arc-systems

# Describe HelmRelease for errors
kubectl describe helmrelease arc-controller -n arc-systems
```

### Secret Not Found

```bash
# Check if ClusterExternalSecret exists
kubectl get clusterexternalsecret arc-github-token -n central-secret-store

# Check if ExternalSecret was created in arc-systems
kubectl get externalsecret -n arc-systems

# Check secret distribution
kubectl get secret github-arc-secret -n arc-systems

# If secret doesn't exist, check namespace labels
kubectl get namespace arc-systems -o yaml | grep secrets/arc-github-token
```

### Runners Not Registering

```bash
# Check listener logs
kubectl logs -n arc-systems -l app.kubernetes.io/component=runner-scale-set-listener -f

# Common issues:
# 1. Invalid GitHub token
# 2. Wrong githubConfigUrl
# 3. Insufficient token permissions

# Test token manually
TOKEN=$(kubectl get secret github-arc-secret -n arc-systems -o jsonpath='{.data.github_token}' | base64 -d)
curl -H "Authorization: token $TOKEN" https://api.github.com/user
```

### Runners Not Scaling

```bash
# Check AutoscalingRunnerSet status
kubectl describe autoscalingrunnerset arc-runner-set -n arc-systems

# Check for webhook events in listener logs
kubectl logs -n arc-systems -l app.kubernetes.io/component=runner-scale-set-listener --tail=50

# Manually trigger a workflow and watch
gh workflow run test-arc.yml
kubectl get pods -n arc-systems -w
```

## Migration Path

### Phase 1: Deploy ARC (Today - 30 minutes)

```bash
# Apply ArgoCD app
kubectl apply -f platform/kustomize/seed/arc/arc-app.yaml

# Verify deployment
kubectl get pods -n arc-systems
```

### Phase 2: Test with One Workflow (1 hour)

Pick your heaviest workflow (likely `backstage.yml`) and update:

```yaml
jobs:
  build:
    runs-on: arc-runner-set  # Change this line
```

Commit, push, and verify:
```bash
git commit -m "test: Use ARC self-hosted runner for backstage builds"
git push
```

### Phase 3: Migrate All Workflows (2 hours)

Update remaining workflows:
- `uv.yml`
- `e2e-runner.yml`
- `code-server-dev.yml`
- `metrics-service.yml`

### Phase 4: Monitor and Optimize (Ongoing)

```bash
# Check GitHub Actions usage (should drop to near zero)
gh api /users/{username}/settings/billing/actions

# Monitor runner resource usage
kubectl top pods -n arc-systems

# Tune maxRunners and resource limits as needed
```

## Rollback

If you need to rollback:

```bash
# Option 1: Delete ArgoCD app (keeps resources)
kubectl delete app arc -n argocd

# Option 2: Delete all resources
kubectl delete namespace arc-systems

# Option 3: Just switch workflows back to GitHub-hosted
# In your workflows, change:
runs-on: arc-runner-set  # ← to
runs-on: ubuntu-latest   # ← this
```

## Next Steps

1. ✅ Deploy ARC (this guide)
2. 📝 Update workflow files to use `runs-on: arc-runner-set`
3. 🧪 Test and verify builds work
4. 📊 Monitor GitHub Actions usage (should be $0!)
5. 🎯 Optimize runner resources based on actual usage

## Support

- **Full Documentation**: [README.md](./README.md)
- **Implementation Guide**: [/image-factory/ARC-IMPLEMENTATION-GUIDE.md](../../../image-factory/ARC-IMPLEMENTATION-GUIDE.md)
- **Steering Docs**: [/.ai/steering/secret-management.md](../../../../.ai/steering/secret-management.md)
- **ARC Issues**: https://github.com/actions/actions-runner-controller/issues
