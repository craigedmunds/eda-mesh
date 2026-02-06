# URGENT: Migrate to Self-Hosted Runners

**Problem:** Monthly GitHub Actions allocation consumed in 6 days (Feb 6th)

**Cost Impact:** 
- If Pro plan (3,000 min): Already used 3,000 min = $18/month overage projected → **$90/month**
- If Team plan (3,000 min): Same → **$90/month**
- If Enterprise (50,000 min): Concerning usage pattern

**Solution:** Migrate to self-hosted runners immediately (unlimited FREE minutes)

---

## Immediate Actions (Today)

### Option 1: Use Image Factory Jobs (FASTEST - 1 hour)

**Use what you just built!** The Image Factory build system with Podman/Buildah runs in K8s.

#### Step 1: Build the Image Factory Builder (30 min)
```bash
cd projects/argocd-eda/image-factory

# Build the builder image
task builder:build

# Test it works
task builder:test

# Push to registry
task builder:push
```

#### Step 2: Update GitHub Workflows to Trigger K8s Jobs (30 min)

Replace direct builds with job triggers:

```yaml
# .github/workflows/backstage.yml
name: Build Backstage

on:
  push:
    branches: [main]
    paths: ['backstage/**']

jobs:
  trigger-build:
    runs-on: ubuntu-latest  # Small job, just triggers K8s
    steps:
      - name: Trigger K8s Build Job
        env:
          KUBECONFIG_DATA: ${{ secrets.KUBECONFIG }}
        run: |
          # Set up kubectl
          echo "$KUBECONFIG_DATA" | base64 -d > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig
          
          # Create K8s Job to build image
          kubectl create job build-backstage-${{ github.sha }} \
            --image=ghcr.io/craigedmunds/image-factory:latest \
            --namespace=image-factory-kargo \
            -- task build IMAGE=backstage TAG=${{ github.sha }}
          
          # Wait for completion (optional)
          kubectl wait --for=condition=complete \
            --timeout=20m \
            job/build-backstage-${{ github.sha }} \
            -n image-factory-kargo
```

**Benefit:** Runs in your cluster, uses 2 GitHub minutes (just to trigger), actual build is FREE

---

### Option 2: Actions Runner Controller (BETTER - 2-4 hours)

Full self-hosted runner setup with native GitHub Actions integration.

#### Step 1: Install ARC Prerequisites (30 min)

```bash
# Install cert-manager (if not already installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available --timeout=300s \
  deployment/cert-manager -n cert-manager
```

#### Step 2: Install ARC Controller (15 min)

```bash
# Create namespace
kubectl create namespace arc-systems

# Install ARC controller
helm install arc \
  --namespace arc-systems \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller

# Verify installation
kubectl get pods -n arc-systems
```

#### Step 3: Create GitHub PAT (5 min)

1. Go to https://github.com/settings/tokens/new
2. Create token with scopes:
   - `repo` (all)
   - `workflow`
   - `admin:org` (if using org-level runners)
3. Save as secret:
   ```bash
   kubectl create secret generic github-token \
     --namespace=arc-systems \
     --from-literal=github_token=YOUR_TOKEN_HERE
   ```

#### Step 4: Deploy Runner Scale Set (15 min)

Create `arc/runner-scale-set.yaml`:

```yaml
apiVersion: actions.github.com/v1alpha1
kind: AutoscalingRunnerSet
metadata:
  name: image-factory-runners
  namespace: arc-systems
spec:
  githubConfigUrl: "https://github.com/craigedmunds/argocd-eda"
  githubConfigSecret: github-token
  
  # Runner configuration
  runnerScaleSetName: arc-runner-set
  
  # Container template with Image Factory builder
  template:
    spec:
      containers:
        - name: runner
          image: ghcr.io/actions/actions-runner:latest
          
          # Enable Docker-in-Docker OR use Image Factory builder
          env:
            - name: DOCKER_HOST
              value: unix:///var/run/docker.sock
          
          volumeMounts:
            - name: work
              mountPath: /runner/_work
            
            # Option A: Mount Docker socket (simpler)
            - name: docker-sock
              mountPath: /var/run/docker.sock
          
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "4"
              memory: 8Gi
      
      volumes:
        - name: work
          emptyDir: {}
        
        # Option A: Docker socket
        - name: docker-sock
          hostPath:
            path: /var/run/docker.sock
            type: Socket
  
  # Auto-scaling configuration
  minRunners: 0          # Scale to zero when idle
  maxRunners: 5          # Max concurrent builds
  
  # Runner lifecycle
  runnerGroup: "default"
```

Apply:
```bash
kubectl apply -f arc/runner-scale-set.yaml
```

#### Step 5: Update Workflows to Use Self-Hosted (15 min)

```yaml
# .github/workflows/backstage.yml
jobs:
  build-and-push:
    runs-on: arc-runner-set  # ← Use self-hosted runner
    steps:
      - uses: actions/checkout@v4
      
      - name: Build with Image Factory
        run: |
          # Image Factory builder is available in runner
          task build IMAGE=backstage TAG=${{ github.sha }}
```

#### Step 6: Test Build (10 min)

```bash
# Trigger a test build
gh workflow run backstage.yml

# Watch runner pods spin up
kubectl get pods -n arc-systems -w

# Check logs
kubectl logs -n arc-systems -l app=arc-runner --tail=100 -f
```

---

## Cost Savings Projection

### Current Trajectory (if staying on GitHub-hosted)

**Based on 6 days usage:**
- 6 days = consumed full monthly allocation
- 30 days = **5x monthly allocation**

| Plan | Free Minutes | Overage Cost |
|------|--------------|--------------|
| Pro (3,000) | 3,000 | 12,000 × $0.006 = **$72/mo** |
| Team (3,000) | 3,000 | 12,000 × $0.006 = **$72/mo** |
| Enterprise (50,000) | 50,000 | 200,000 × $0.006 = **$1,200/mo** |

### After Migration (self-hosted)

| Resource | Cost |
|----------|------|
| GitHub Actions minutes | **$0** (unlimited) |
| K8s cluster overhead | Existing infrastructure |
| Total savings | **$72-1,200/month** |

---

## Why This Happened (Analysis)

Let me check your workflows to understand the usage:

```bash
# Check recent workflow runs
gh run list --limit 20 --json name,conclusion,createdAt,displayTitle

# Check which workflows run most
gh run list --limit 100 --json workflowName | \
  jq -r '.[] | .workflowName' | sort | uniq -c | sort -rn
```

**Common causes:**
1. **Multi-arch builds** (2x time: amd64 + arm64)
2. **Matrix builds** (multiple OS/versions)
3. **Frequent commits** (each triggers builds)
4. **Multiple workflows** per repo
5. **Large images** (long build times)

---

## Migration Priority

### High Priority (Do First)
- ✅ **Backstage** (likely your heaviest build)
- ✅ **Code-server-dev** (probably builds frequently)
- ✅ **E2E test runner** (may run on every PR)

### Medium Priority
- ⚠️ **UV**
- ⚠️ **Metrics service**

### Update workflows in this order to see immediate impact

---

## Comparison: Which Option?

| Factor | Image Factory Jobs | ARC Self-Hosted |
|--------|-------------------|-----------------|
| **Setup time** | ⚡ 1 hour | ⚠️ 2-4 hours |
| **GitHub integration** | ⚠️ Manual trigger | ✅ Native |
| **Workflow changes** | ⚠️ Significant | ✅ Minimal (just runner label) |
| **Debugging** | ✅ Easy (kubectl logs) | ⚠️ Medium |
| **Maintenance** | ✅ Simple | ⚠️ Medium |
| **Best for** | Quick fix | Long-term solution |

### Recommendation: **Do Both!**

1. **Today (1 hour):** Migrate heaviest workflows to Image Factory Jobs
   - Immediate relief
   - Stop the bleeding
   - Use what we just built

2. **This week (4 hours):** Set up ARC for proper long-term solution
   - Better GitHub integration
   - Auto-scaling
   - Native workflow experience

---

## Emergency Workflow Template (Use This Now)

Replace your current workflows with this pattern:

```yaml
name: Build {Image}

on:
  push:
    branches: [main]
    paths: ['{path}/**']
  workflow_dispatch:

jobs:
  # Option 1: Use Image Factory Jobs (IMMEDIATE)
  build-in-cluster:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger K8s Build
        env:
          KUBECONFIG_DATA: ${{ secrets.KUBECONFIG }}
        run: |
          echo "$KUBECONFIG_DATA" | base64 -d > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig
          
          kubectl create job build-${{ github.run_id }} \
            --image=ghcr.io/craigedmunds/image-factory:latest \
            --namespace=image-factory-kargo \
            -- task build IMAGE={image-name} TAG=${{ github.sha }}

  # Option 2: Use ARC (AFTER SETUP)
  # build-self-hosted:
  #   runs-on: arc-runner-set
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Build
  #       run: task build IMAGE={image-name} TAG=${{ github.sha }}
```

---

## Monitoring Post-Migration

### Check GitHub Actions Usage
```bash
# See remaining minutes
gh api /users/{username}/settings/billing/actions

# Or for org
gh api /orgs/{org}/settings/billing/actions
```

### Check Runner Status (ARC)
```bash
# See runners
kubectl get runners -n arc-systems

# See runner pods
kubectl get pods -n arc-systems -l app=arc-runner

# Check controller logs
kubectl logs -n arc-systems -l app=arc-controller -f
```

### Check Build Jobs (Image Factory)
```bash
# See recent builds
kubectl get jobs -n image-factory-kargo --sort-by=.metadata.creationTimestamp

# Check job logs
kubectl logs -n image-factory-kargo job/build-backstage-abc123
```

---

## Rollback Plan (If Needed)

If something goes wrong:

1. **Revert workflow file** to use `runs-on: ubuntu-latest`
2. **Delete ARC** if it's causing issues: `helm uninstall arc -n arc-systems`
3. **Clean up jobs**: `kubectl delete jobs -n image-factory-kargo --all`

---

## Next Steps (Prioritized)

### TODAY (Stop the bleeding)
1. ✅ Build Image Factory builder: `task builder`
2. ✅ Update your heaviest workflow (likely backstage)
3. ✅ Test the build works
4. ✅ Monitor GitHub Actions minutes stop being consumed

### THIS WEEK (Proper solution)
1. Install ARC in your K8s cluster
2. Migrate all workflows to self-hosted runners
3. Set up monitoring and alerts
4. Document the process

### THIS MONTH (Optimize)
1. Tune auto-scaling parameters
2. Optimize build caching
3. Set up build metrics
4. Review and adjust resource limits

---

## Questions?

**Q: Can we mix GitHub-hosted and self-hosted?**  
A: Yes! Use GitHub-hosted for lightweight tasks (tests, linting) and self-hosted for heavy builds.

**Q: What if builds fail on self-hosted?**  
A: You can always fall back to GitHub-hosted temporarily. Just change `runs-on:` label.

**Q: How do we secure self-hosted runners?**  
A: Use ephemeral runners (pod per job), network policies, and limited permissions. We can set this up properly.

**Q: What about build caching?**  
A: Use registry caching (already in Image Factory builder) or persistent volumes for build cache.

---

## Ready to Start?

Pick your path:

```bash
# Path 1: Quick fix with Image Factory Jobs (1 hour)
cd projects/argocd-eda/image-factory
task builder
# Then update your workflows

# Path 2: Proper solution with ARC (4 hours)
kubectl create namespace arc-systems
helm install arc ...
# Follow steps above
```

Let me know which path you want to take and I can help you execute it!
