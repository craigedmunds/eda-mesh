# Actions Runner Controller (ARC) Implementation Guide

**Official GitHub solution for self-hosted runners in Kubernetes**

## Why ARC is Perfect for You

✅ **Official GitHub solution** - Maintained by GitHub Actions team  
✅ **Unlimited FREE minutes** - No GitHub Actions billing  
✅ **Auto-scaling** - Scale to zero when idle, scale up on demand  
✅ **Kubernetes-native** - Runs in your existing cluster  
✅ **Minimal workflow changes** - Just change the `runs-on:` label  
✅ **6k+ stars, active community** - Well-tested and supported

## Architecture Overview

```
GitHub Webhook
    ↓
ARC Controller (in your K8s cluster)
    ↓
AutoscalingRunnerSet
    ↓
Runner Pods (ephemeral, scale 0-5)
    ↓
Execute GitHub Actions jobs
```

**Key Concepts:**
- **Controller**: Watches GitHub for workflow jobs
- **Runner Scale Set**: Group of runners that auto-scale
- **Runner Pods**: Ephemeral pods that run one job then terminate
- **Listener**: Receives webhooks from GitHub

## Prerequisites Checklist

- [ ] Kubernetes cluster access (you have this)
- [ ] `kubectl` configured
- [ ] Helm 3.x installed
- [ ] GitHub PAT (Personal Access Token) with correct permissions
- [ ] cert-manager installed (or will install)

## Step-by-Step Implementation

### Step 1: Install cert-manager (15 min)

cert-manager is required for ARC's webhook certificates.

```bash
# Check if cert-manager is already installed
kubectl get pods -n cert-manager

# If not installed, install it:
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available --timeout=300s \
  deployment/cert-manager -n cert-manager
kubectl wait --for=condition=Available --timeout=300s \
  deployment/cert-manager-webhook -n cert-manager
kubectl wait --for=condition=Available --timeout=300s \
  deployment/cert-manager-cainjector -n cert-manager

# Verify
kubectl get pods -n cert-manager
```

Expected output:
```
NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-7d9f5c6f5d-xxxxx             1/1     Running   0          2m
cert-manager-cainjector-6d9f5c6f5d-xxxxx  1/1     Running   0          2m
cert-manager-webhook-7d9f5c6f5d-xxxxx     1/1     Running   0          2m
```

### Step 2: Create GitHub PAT (5 min)

ARC needs a GitHub token to authenticate.

**For Repository-level runners:**
1. Go to https://github.com/settings/tokens/new
2. Select scopes:
   - ✅ `repo` (Full control of private repositories)
3. Generate token and save it

**For Organization-level runners (recommended):**
1. Go to https://github.com/organizations/{YOUR_ORG}/settings/tokens/new
2. Select scopes:
   - ✅ `repo` (Full control)
   - ✅ `admin:org` (Full control)
3. Generate token and save it

**For Enterprise-level runners:**
1. Create token with:
   - ✅ `manage_runners:enterprise`

Save the token - you'll need it in the next step.

### Step 3: Install ARC Controller (15 min)

```bash
# Create namespace for ARC
kubectl create namespace arc-systems

# Create secret with GitHub PAT
kubectl create secret generic github-arc-secret \
  --namespace=arc-systems \
  --from-literal=github_token='YOUR_GITHUB_PAT_HERE'

# Add ARC Helm repository
helm repo add actions-runner-controller \
  https://actions.github.io/actions-runner-controller

# Update Helm repos
helm repo update

# Install ARC controller
helm install arc \
  --namespace arc-systems \
  --create-namespace \
  actions-runner-controller/actions-runner-controller-charts/gha-runner-scale-set-controller

# Verify controller is running
kubectl get pods -n arc-systems
```

Expected output:
```
NAME                                   READY   STATUS    RESTARTS   AGE
arc-controller-xxxxx                   1/1     Running   0          1m
```

### Step 4: Create Runner Scale Set (20 min)

Create `arc/runner-scale-set.yaml`:

```yaml
apiVersion: actions.github.com/v1alpha1
kind: AutoscalingRunnerSet
metadata:
  name: arc-runner-set
  namespace: arc-systems
spec:
  # GitHub configuration
  githubConfigUrl: "https://github.com/craigedmunds/argocd-eda"
  githubConfigSecret: github-arc-secret
  
  # Runner labels (use in workflows)
  runnerScaleSetName: "arc-runner-set"
  
  # Runner pod template
  template:
    spec:
      containers:
        - name: runner
          image: ghcr.io/actions/actions-runner:latest
          
          # Enable Docker builds
          env:
            - name: DOCKER_HOST
              value: unix:///var/run/docker.sock
          
          # Volume mounts
          volumeMounts:
            - name: work
              mountPath: /runner/_work
            - name: docker-sock
              mountPath: /var/run/docker.sock
          
          # Resource allocation
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
      
      # Volumes
      volumes:
        - name: work
          emptyDir: {}
        - name: docker-sock
          hostPath:
            path: /var/run/docker.sock
            type: Socket
  
  # Auto-scaling configuration
  minRunners: 0           # Scale to zero when idle (save resources)
  maxRunners: 5           # Max concurrent runners
  
  # Scale down quickly when jobs complete
  scaleDownDelaySecondsAfterScaleUp: 300  # 5 minutes
```

**Important Configuration Notes:**

1. **githubConfigUrl**: 
   - Repository: `https://github.com/OWNER/REPO`
   - Organization: `https://github.com/ORG`
   - Enterprise: `https://github.com/enterprises/ENTERPRISE`

2. **Docker Support**:
   - Mounting `/var/run/docker.sock` enables Docker-in-Docker
   - Required for building container images
   - Works with Image Factory builder

3. **Auto-scaling**:
   - `minRunners: 0` = Save resources when idle
   - `maxRunners: 5` = Limit concurrent builds
   - Adjust based on your needs

Apply the configuration:

```bash
kubectl apply -f arc/runner-scale-set.yaml

# Verify the scale set was created
kubectl get autoscalingrunnerset -n arc-systems

# Check listener pod (connects to GitHub)
kubectl get pods -n arc-systems -l app.kubernetes.io/component=runner-scale-set-listener
```

### Step 5: Update Workflows (15 min)

Update your workflows to use the self-hosted runners.

**Before (GitHub-hosted):**
```yaml
jobs:
  build-and-push:
    runs-on: ubuntu-latest  # ← GitHub-hosted (costs money)
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: docker build ...
```

**After (ARC self-hosted):**
```yaml
jobs:
  build-and-push:
    runs-on: arc-runner-set  # ← Self-hosted (FREE!)
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: docker build ...
```

**For Image Factory builds:**
```yaml
jobs:
  build-backstage:
    runs-on: arc-runner-set
    steps:
      - uses: actions/checkout@v4
      
      - name: Build with Image Factory
        run: |
          # Image Factory builder is available via Docker
          docker run --rm \
            -v $(pwd):/workspace \
            -v /var/run/docker.sock:/var/run/docker.sock \
            ghcr.io/craigedmunds/image-factory:latest \
            task build IMAGE=backstage TAG=${{ github.sha }}
```

### Step 6: Test the Setup (10 min)

```bash
# Trigger a workflow manually
gh workflow run backstage.yml

# Watch runner pods spin up
kubectl get pods -n arc-systems -w

# Check runner registration in GitHub
# Go to: https://github.com/OWNER/REPO/settings/actions/runners

# View runner logs
kubectl logs -n arc-systems -l app.kubernetes.io/component=runner --tail=100 -f

# Check controller logs if issues
kubectl logs -n arc-systems -l app.kubernetes.io/component=controller -f
```

**What to expect:**
1. Workflow triggered in GitHub
2. ARC listener receives webhook
3. Runner pod spins up (0 → 1)
4. Job executes in pod
5. Pod terminates after job
6. Scales back to 0

## Advanced Configuration

### Use Image Factory Builder in Runners

Instead of mounting Docker socket, use the Image Factory builder image:

```yaml
spec:
  template:
    spec:
      # Use Image Factory builder as init container or sidecar
      initContainers:
        - name: setup-tools
          image: ghcr.io/craigedmunds/image-factory:latest
          command: ["cp", "-r", "/opt/image-factory", "/shared"]
          volumeMounts:
            - name: shared-tools
              mountPath: /shared
      
      containers:
        - name: runner
          image: ghcr.io/actions/actions-runner:latest
          volumeMounts:
            - name: shared-tools
              mountPath: /opt/image-factory
          env:
            - name: PATH
              value: "/opt/image-factory:$PATH"
```

### Resource Tuning

Adjust based on your build needs:

```yaml
resources:
  # Light builds (tests, linting)
  requests:
    cpu: "500m"
    memory: "1Gi"
  limits:
    cpu: "2"
    memory: "4Gi"

# OR

  # Heavy builds (multi-arch images)
  requests:
    cpu: "2"
    memory: "4Gi"
  limits:
    cpu: "8"
    memory: "16Gi"
```

### Multiple Runner Scale Sets

Create different scale sets for different workloads:

```bash
# arc/runner-scale-set-light.yaml
# For PR validation, tests
spec:
  runnerScaleSetName: "arc-light"
  maxRunners: 10
  resources:
    limits:
      cpu: "2"
      memory: "4Gi"

# arc/runner-scale-set-heavy.yaml
# For production builds
spec:
  runnerScaleSetName: "arc-heavy"
  maxRunners: 3
  resources:
    limits:
      cpu: "8"
      memory: "16Gi"
```

Use in workflows:
```yaml
jobs:
  test:
    runs-on: arc-light      # Fast, cheap
  
  build:
    runs-on: arc-heavy      # Powerful
```

## Monitoring and Troubleshooting

### Check Runner Status

```bash
# See all runners registered with GitHub
gh api /repos/OWNER/REPO/actions/runners | jq '.runners'

# Check ARC resources
kubectl get autoscalingrunnerset -n arc-systems
kubectl get pods -n arc-systems

# View metrics
kubectl top pods -n arc-systems
```

### Common Issues

#### Runners not scaling up

```bash
# Check listener logs
kubectl logs -n arc-systems -l app.kubernetes.io/component=runner-scale-set-listener -f

# Check controller logs
kubectl logs -n arc-systems -l app.kubernetes.io/component=controller -f

# Verify GitHub webhook
# Settings → Actions → Runners → Your scale set → Check status
```

#### Docker builds failing

```bash
# Verify Docker socket is mounted
kubectl exec -it <runner-pod> -n arc-systems -- ls -la /var/run/docker.sock

# Test Docker in runner
kubectl exec -it <runner-pod> -n arc-systems -- docker ps
```

#### Out of resources

```bash
# Check cluster capacity
kubectl top nodes

# Adjust maxRunners or resource limits
kubectl edit autoscalingrunnerset arc-runner-set -n arc-systems
```

### Debugging Workflow

1. Check GitHub Actions UI for job status
2. Check runner pod logs: `kubectl logs <pod> -n arc-systems`
3. Check listener logs for webhook issues
4. Check controller logs for scaling issues
5. Verify GitHub PAT has correct permissions

## Security Best Practices

1. **Use ephemeral runners** (default with ARC) - Pod per job
2. **Limit network access** with NetworkPolicies
3. **Use separate runner scale sets** for untrusted code
4. **Rotate GitHub PAT** regularly
5. **Use minimal runner permissions**
6. **Enable runner group restrictions** in GitHub

Example NetworkPolicy:
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
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: TCP
          port: 53  # DNS
    - to:
        - podSelector: {}  # Same namespace
    # Add your registry, GitHub, etc.
```

## Cost Savings Calculator

### Your Current Usage (6 days = full quota)

Assuming Team plan (3,000 min/month):
- **6 days usage:** 3,000 minutes
- **Daily rate:** 500 minutes/day
- **Projected monthly:** 15,000 minutes
- **Overage:** 12,000 minutes
- **Cost:** 12,000 × $0.006 = **$72/month**

### After ARC Migration

- **GitHub Actions minutes:** $0 (unlimited)
- **K8s resources:** Using existing cluster
- **Savings:** **$72/month** (or more as you scale)

### Break-Even Analysis

ARC is worth it if:
- Your monthly GitHub Actions cost > $0 (already true!)
- You have K8s cluster (you do!)
- You build container images (you do!)

**Result: Immediate positive ROI** ✅

## Migration Strategy

### Phase 1: Immediate (Today)
- [ ] Install cert-manager
- [ ] Install ARC controller
- [ ] Create runner scale set
- [ ] Migrate your **heaviest workflow** (backstage)
- [ ] Test and verify

### Phase 2: This Week
- [ ] Migrate remaining workflows
- [ ] Set up monitoring
- [ ] Document process
- [ ] Train team

### Phase 3: Optimize
- [ ] Tune resource limits
- [ ] Set up multiple runner scale sets
- [ ] Implement caching strategies
- [ ] Review and optimize

## Rollback Plan

If something goes wrong:

```bash
# Switch back to GitHub-hosted in workflow
runs-on: ubuntu-latest  # ← Just change this line

# Or uninstall ARC
helm uninstall arc -n arc-systems
kubectl delete namespace arc-systems
```

Your workflows continue to work - just costs money again.

## Next Steps

1. **Right now:** Install ARC (1 hour total)
2. **Test:** Migrate one workflow and verify
3. **Migrate:** Update remaining workflows
4. **Monitor:** Watch GitHub Actions usage drop to zero
5. **Celebrate:** Unlimited free builds! 🎉

## Support and Resources

- **Official Docs:** https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners-with-actions-runner-controller
- **GitHub Repo:** https://github.com/actions/actions-runner-controller
- **Issues:** https://github.com/actions/actions-runner-controller/issues
- **Discussions:** https://github.com/actions/actions-runner-controller/discussions

## Quick Command Reference

```bash
# Check ARC status
kubectl get autoscalingrunnerset -n arc-systems
kubectl get pods -n arc-systems

# View logs
kubectl logs -n arc-systems -l app.kubernetes.io/component=controller -f
kubectl logs -n arc-systems -l app.kubernetes.io/component=runner-scale-set-listener -f

# Scale manually (if needed)
kubectl scale autoscalingrunnerset arc-runner-set --replicas=3 -n arc-systems

# Update configuration
kubectl edit autoscalingrunnerset arc-runner-set -n arc-systems

# Delete and recreate
kubectl delete autoscalingrunnerset arc-runner-set -n arc-systems
kubectl apply -f arc/runner-scale-set.yaml
```

---

**Ready to start? The total setup time is about 1 hour, and you'll immediately stop burning through GitHub Actions minutes!**
