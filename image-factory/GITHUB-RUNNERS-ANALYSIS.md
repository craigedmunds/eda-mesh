# GitHub Self-Hosted Runners vs Image Factory Build System

## Key Finding: Self-Hosted Runners Have UNLIMITED Minutes ✅

**From GitHub Documentation:**
> "GitHub Actions usage is **free** for **self-hosted runners**"
> 
> "Self-hosted runners are free to use with GitHub Actions, but you are responsible for the cost of maintaining your runner machines."

**There is NO limit on self-hosted runner minutes!** 🎉

## Cost Comparison

### GitHub-Hosted Runners (Current Approach)

| Plan | Free Minutes/Month | Linux Cost | Windows Cost | macOS Cost |
|------|-------------------|------------|--------------|------------|
| Free | 2,000 | $0.006/min | $0.010/min | $0.062/min |
| Pro | 3,000 | $0.006/min | $0.010/min | $0.062/min |
| Team | 3,000 | $0.006/min | $0.010/min | $0.062/min |
| Enterprise Cloud | 50,000 | $0.006/min | $0.010/min | $0.062/min |

**After free quota:**
- Linux: $0.006/min = $360/month per 1,000 hours
- Windows: $0.010/min = $600/month per 1,000 hours

### Self-Hosted Runners (Proposed)

| Resource | Cost |
|----------|------|
| **Minutes** | **FREE (unlimited)** ⭐ |
| CPU/RAM | Your K8s cluster costs |
| Storage | Your PV/PVC costs |
| Network | Your cluster egress costs |

## Build Workload Analysis

### Current Image Factory Enrolled Images
From `images.yaml`:
- backstage
- uv
- e2e-test-runner
- code-server-dev
- metrics-service

### Estimated Build Times (Multi-Arch)

| Image | Build Time | Monthly Builds | Minutes/Month |
|-------|-----------|----------------|---------------|
| backstage | 15 min | 8 (2/week) | 120 min |
| uv | 8 min | 4 (1/week) | 32 min |
| e2e-test-runner | 10 min | 4 | 40 min |
| code-server-dev | 12 min | 2 | 24 min |
| metrics-service | 8 min | 4 | 32 min |
| **Total** | | **22 builds** | **248 min** |

**Base image rebuild triggered builds:** +50% = **372 min/month**

### GitHub-Hosted Cost (After Free Tier)

Assuming Linux runners:
- **372 min/month × $0.006 = $2.23/month**

**Current cost: Very low** ✅

However, this grows linearly:
- 10 images: ~$9/month
- 50 images: ~$45/month
- 100 images: ~$90/month

## Self-Hosted Runner Options

### Option 1: Actions Runner Controller (ARC) in K8s

**What it is:**
- Kubernetes-native auto-scaling runner solution
- Runs runners as pods in your existing K8s cluster
- Official GitHub solution

**Architecture:**
```
GitHub Actions Webhook
    ↓
ARC Controller (in K8s)
    ↓
Runner Scale Sets (pods)
    ↓
Execute workflow jobs
```

**Pros:**
- ✅ Unlimited minutes (FREE)
- ✅ Native K8s integration
- ✅ Auto-scaling (scale to zero when idle)
- ✅ Use existing cluster resources
- ✅ Access to cluster networking/services
- ✅ Same workflows, just change runner label
- ✅ Official GitHub solution

**Cons:**
- ❌ Requires ARC setup and maintenance
- ❌ Uses cluster resources (CPU/RAM)
- ❌ You manage security updates
- ❌ More complex than GitHub-hosted

**Resource Usage:**
- Controller: ~100Mi RAM, 0.1 CPU
- Per runner pod: ~1-2 CPU, 2-4Gi RAM during builds
- Scales to zero when no builds

### Option 2: VM-Based Self-Hosted Runners

**What it is:**
- Traditional self-hosted runner on VM/bare metal
- Runner agent installed on persistent machines

**Pros:**
- ✅ Unlimited minutes (FREE)
- ✅ Can use existing infrastructure
- ✅ Persistent environment

**Cons:**
- ❌ Not auto-scaling (always running)
- ❌ Manual OS/security updates
- ❌ Requires separate infrastructure
- ❌ Harder to secure and isolate

### Option 3: Hybrid Approach (Recommended)

Use **both** GitHub-hosted AND self-hosted strategically:

```yaml
# Use GitHub-hosted for:
# - PR builds (fast feedback, ephemeral)
# - Quick tests
# - Public repo workflows

jobs:
  pr-validation:
    runs-on: ubuntu-latest  # GitHub-hosted

# Use self-hosted for:
# - Multi-arch builds (heavy)
# - Base image rebuilds (triggered by Kargo)
# - Scheduled rebuilds

jobs:
  build-multiarch:
    runs-on: [self-hosted, arc-runner]  # Self-hosted in K8s
```

## Implementation: Actions Runner Controller

### 1. Install ARC in K8s

```bash
# Install cert-manager (prerequisite)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install ARC
kubectl create namespace arc-systems
helm install arc \
  --namespace arc-systems \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller
```

### 2. Create Runner Scale Set

```yaml
# arc/runner-scale-set.yaml
apiVersion: actions.github.com/v1alpha1
kind: AutoscalingRunnerSet
metadata:
  name: image-factory-runners
  namespace: arc-systems
spec:
  githubConfigUrl: "https://github.com/craigedmunds/argocd-eda"
  githubConfigSecret: github-token
  
  # Runner pod template
  template:
    spec:
      containers:
        - name: runner
          image: ghcr.io/actions/actions-runner:latest
          
          # Mount Docker socket for builds
          volumeMounts:
            - name: docker-sock
              mountPath: /var/run/docker.sock
          
          # Resources
          resources:
            requests:
              cpu: 1000m
              memory: 2Gi
            limits:
              cpu: 4000m
              memory: 8Gi
      
      volumes:
        - name: docker-sock
          hostPath:
            path: /var/run/docker.sock
  
  # Auto-scaling
  minRunners: 0
  maxRunners: 5
  
  # Scale down when idle
  scaleDownDelaySecondsAfterScaleUp: 300
```

### 3. Use in Workflows

```yaml
# .github/workflows/backstage.yml
name: Build Backstage

on:
  push:
    paths: ['backstage/**']

jobs:
  # PR validation - use GitHub-hosted (fast)
  test:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: task test

  # Production build - use self-hosted (free)
  build:
    if: github.ref == 'refs/heads/main'
    runs-on: [self-hosted, arc-runner]  # ← Self-hosted
    steps:
      - uses: actions/checkout@v4
      
      - name: Build multi-arch image
        run: |
          # Use Image Factory builder
          task build IMAGE=backstage TAG=${GITHUB_SHA}
```

## Integration with Image Factory

### Scenario 1: Manual Build
```bash
# Developer triggers workflow manually
gh workflow run build-image.yml -f image=backstage -f tag=v1.0.0
    ↓
# Runs on self-hosted runner in K8s
    ↓
# Uses Image Factory builder image
task build IMAGE=backstage TAG=v1.0.0
```

### Scenario 2: Kargo-Triggered Rebuild
```yaml
# Kargo detects base image update
    ↓
# Kargo AnalysisTemplate runs Job
apiVersion: batch/v1
kind: Job
spec:
  template:
    spec:
      containers:
        - name: trigger-build
          image: ghcr.io/cli/cli:latest
          command: ["gh", "workflow", "run"]
          args: ["build-image.yml", "-f", "image=backstage"]
    ↓
# GitHub Actions job runs on self-hosted runner
    ↓
# Executes build with Image Factory
```

## Cost Projection

### Small Scale (Current: 5 images)
| Solution | Cost/Month |
|----------|-----------|
| GitHub-hosted | $2-10 |
| Self-hosted (ARC) | $0* + cluster overhead |
| Image Factory (K8s Jobs) | $0* + cluster overhead |

*Free minutes, but uses cluster resources

### Medium Scale (20 images)
| Solution | Cost/Month |
|----------|-----------|
| GitHub-hosted | $40-80 |
| Self-hosted (ARC) | $0* |
| Image Factory (K8s Jobs) | $0* |

### Large Scale (100 images)
| Solution | Cost/Month |
|----------|-----------|
| GitHub-hosted | $200-400 |
| Self-hosted (ARC) | $0* |
| Image Factory (K8s Jobs) | $0* |

## Cluster Resource Impact

### With ARC (Self-Hosted Runners)
```
Idle: ~100Mi RAM, 0.1 CPU (just controller)
Building 1 image: +2 CPU, +4Gi RAM
Building 5 images (parallel): +10 CPU, +20Gi RAM
```

### With Image Factory Jobs Only (Current)
```
Idle: 0
Building 1 image: +2 CPU, +4Gi RAM (same)
```

**No significant difference in resource usage!**

## Recommendation

### For Your Current Scale (5 images):

**Keep current approach** ✅
- GitHub Actions workflows for git-triggered builds
- Image Factory Kargo Jobs for base image rebuilds
- Cost is negligible ($2-10/month)

**Reasons:**
1. Simple - no additional infrastructure
2. Low cost - well within free tier
3. Works great for current scale
4. Can add ARC later if needed

### Consider ARC Self-Hosted Runners When:

1. **Scale increases** to 20+ images
2. **Build frequency increases** significantly
3. **GitHub costs** exceed $50/month
4. **Need cluster network access** during builds
5. **Want to consolidate** all builds in K8s

### Hybrid Approach (Future):

```
┌─────────────────────────────────────────────┐
│ Git Push → GitHub-hosted (PR validation)    │
├─────────────────────────────────────────────┤
│ Git Push → ARC runners (production builds)  │
├─────────────────────────────────────────────┤
│ Base update → Image Factory Jobs (rebuilds) │
└─────────────────────────────────────────────┘
```

## Security Considerations

### GitHub-Hosted Runners
- ✅ Ephemeral (clean environment per job)
- ✅ Managed by GitHub (security updates)
- ❌ No network isolation
- ❌ Limited customization

### Self-Hosted Runners (ARC)
- ✅ Network isolation (in your cluster)
- ✅ Access to internal services
- ❌ You manage security updates
- ❌ Potential for persistent state

**Best Practice:** Use ephemeral runners (pod per job) with ARC

## Decision Matrix

| Factor | GitHub-Hosted | ARC Self-Hosted | Image Factory Jobs |
|--------|--------------|-----------------|-------------------|
| **Cost** (small scale) | ✅ Free tier | ✅ Free | ✅ Free |
| **Cost** (large scale) | ❌ Expensive | ✅ Free | ✅ Free |
| **Setup complexity** | ✅ Zero | ⚠️ Medium | ✅ Zero |
| **Maintenance** | ✅ None | ⚠️ Medium | ✅ Minimal |
| **Build speed** | ✅ Fast | ✅ Fast | ✅ Fast |
| **Auto-scaling** | ✅ Yes | ✅ Yes | ⚠️ Manual |
| **Network access** | ❌ Public only | ✅ Cluster network | ✅ Cluster network |
| **Git integration** | ✅ Native | ✅ Native | ⚠️ Manual trigger |

## Conclusion

**For now (5 images):** Continue with current GitHub-hosted + Image Factory Jobs approach

**Future (20+ images):** Implement hybrid approach:
- ARC self-hosted runners for GitHub Actions workflows
- Keep Image Factory Jobs for Kargo-triggered rebuilds
- Best of both worlds: unlimited minutes + auto-scaling + cluster integration

**Next Step:** Monitor GitHub Actions usage and revisit when approaching free tier limits or 15+ enrolled images.
