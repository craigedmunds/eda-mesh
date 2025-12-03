# Image Factory

## Overview

The Image Factory monitors upstream base images (e.g., `node:22-bookworm-slim`) and automatically triggers rebuilds of dependent internal images when base images are updated, with a configurable delay period to allow for vulnerability discovery and patching.

## Problem Statement

When public base images are updated, our internal images that depend on them become stale and potentially vulnerable. We need an automated system that:

1. **Monitors** upstream base images for updates
2. **Waits** a configurable period (default: 7 days) to allow the community to discover vulnerabilities
3. **Rebuilds** our internal images that depend on the updated base image
4. **Cascades** rebuilds through the dependency chain
5. **Operates in a federated model** where image repositories are distributed across multiple repos/teams

## Architecture: Fully Kargo-Driven

**Key Insight:** Use Kargo for ALL monitoring and event triggering. Kargo's Analysis feature runs Dockerfile analysis, and Kargo Stages orchestrate rebuilds.

### Fully Event-Driven Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Enrollment                                                │
│    Developer adds image to images.yaml                      │
│    ↓                                                         │
│    PR merged to main                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Manifest Generation                                      │
│    Image Factory manifest generation tool:                  │
│    - Reads images.yaml                                      │
│    - Generates Warehouse YAML for each image               │
│    - Generates Stage with Analysis for each image          │
│    - Commits to kustomize/{image}/kargo/                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ArgoCD Applies Resources                                │
│    - Syncs Warehouse and Stage to cluster                  │
│    - Kargo starts monitoring registry                      │
│    - Kargo detects existing image → Creates Freight        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Kargo Analysis (Triggered by Freight)                   │
│    Stage requests Freight → Analysis Job runs:              │
│    - Fetches Dockerfile from source repo                   │
│    - Parses base images from FROM statements               │
│    - Creates/updates state files in git                    │
│    - Analysis completes → Stage verified                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Base Image Warehouse Generation                         │
│    Image Factory manifest generation tool:                  │
│    - Detects new state files in git                        │
│    - Generates Warehouse YAML for each base image          │
│    - Commits to kustomize/image-factory/base-images/       │
│    - ArgoCD applies → Kargo monitors base images           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Base Image Monitoring                                   │
│    Kargo detects base image update → Creates Freight       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Rebuild Decision (Kargo Analysis)                       │
│    Analysis Job for base image Freight:                    │
│    - Reads state files                                      │
│    - Checks if 7 days have passed                          │
│    - If yes: Updates state to trigger rebuild              │
│    - If no: Updates state with pending status              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Rebuild Trigger (Kargo Promotion Step)                  │
│    Stage promotion step:                                    │
│    - Reads state files                                      │
│    - Triggers workflow_dispatch (GitHub) or pipeline (GitLab)│
│    - Updates state with rebuild attempt                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (Back to step 3 - new image built)
```

### Why This is Elegant

**Pure Kargo:**
- All monitoring through Kargo Warehouses
- All analysis through Kargo Analysis
- All orchestration through Kargo Stages
- No external schedulers or CronJobs

**Event-driven:**
- Freight creation triggers analysis
- Analysis updates state
- State changes trigger manifest generation
- Manifests applied by ArgoCD

**GitOps native:**
- All configuration in git (images.yaml, state/)
- All Kargo resources generated from config
- ArgoCD applies everything
- Full audit trail

**Important:** The Image Factory treats all enrolled images as external, even if their source code happens to be in this repo. The factory only cares about published container images and their dependencies.

## Complete Flow Example

**Enrolling the backstage image:**

1. **Developer action:** Add backstage to `images.yaml` → Create PR → Merge to main

2. **ArgoCD generates and applies resources:**
   - ArgoCD syncs and detects `images.yaml` change
   - Runs manifest generation tool (e.g., cdk8s, helm, kustomize plugin)
   - Tool reads `images.yaml` and generates:
     - Warehouse for backstage
     - Stage with Analysis for backstage
   - ArgoCD applies generated resources to cluster
   - Kargo starts monitoring `ghcr.io/craigedmunds/backstage`

3. **Kargo detects existing backstage image:**
   - Finds current version (e.g., 0.6.5) in registry
   - Creates Freight in `backstage-kargo` namespace

4. **Kargo Analysis runs:**
   - Stage "analyze" requests the Freight
   - Analysis Job starts:
     - Fetches `apps/backstage/packages/backend/Dockerfile` from GitHub
     - Parses and discovers: `FROM node:22-bookworm-slim`
     - Creates `state/base-images/node-22-bookworm-slim.yaml`
     - Updates `state/images/backstage.yaml` with base image reference
     - Commits state files to git
   - Analysis completes → Stage verified

6. **ArgoCD generates and applies base image resources:**
   - ArgoCD syncs and detects new `state/base-images/node-22-bookworm-slim.yaml`
   - Runs manifest generation tool
   - Tool reads state file and generates:
     - Warehouse for node-22-bookworm-slim
     - Stage with Analysis for node-22-bookworm-slim
   - ArgoCD applies generated resources to cluster
   - Kargo starts monitoring `docker.io/library/node:22-bookworm-slim`

7. **Kargo detects current node image:**
   - Finds current digest in Docker Hub
   - Creates Freight in `image-factory-kargo` namespace

8. **Node.js releases update** (days/weeks later):
   - New digest for `node:22-bookworm-slim` appears
   - Kargo detects it → Creates new Freight

9. **Kargo Analysis runs for base image:**
   - Stage for node-22-bookworm-slim requests Freight
   - Analysis Job:
     - Reads `state/base-images/node-22-bookworm-slim.yaml`
     - Checks if 7 days have passed since last update
     - If yes: Updates state to mark dependents for rebuild
     - If no: Updates state with "waiting" status
     - Commits state changes

10. **Wait 7 days** (vulnerability discovery period)

11. **Kargo Promotion Step triggers rebuild:**
    - Stage promotion step reads state
    - Sees backstage needs rebuild
    - Triggers `workflow_dispatch` on backstage.yml
    - Updates state with rebuild attempt

12. **Backstage builds:**
   - GitHub Action runs
   - Builds new image with updated node:22-bookworm-slim
   - Pushes to `ghcr.io/craigedmunds/backstage:0.6.6`

13. **Kargo detects new backstage version:**
   - Creates new Freight in `backstage-kargo` namespace
   - Kargo promotes through stages (dev → staging → prod)

**Key Insight:** Everything is triggered by Kargo Freight creation. No polling, no CronJobs, just pure event-driven Kargo workflows.

### Alternative: Kargo Pre-Pipeline Pattern

The Image Factory could be implemented as a Kargo pre-pipeline:

```
Pre-Pipeline (Analysis):
  Warehouse (backstage) → Freight → Stage (analyze) → Creates artifacts (state files)
                                                              ↓
Main Pipeline (Deployment):                                   ↓
  Warehouse (state files) ← subscribes to artifacts ──────────┘
    ↓
  Freight → Stage (dev) → Stage (staging) → Stage (prod)
```

**How it works:**

1. **Pre-pipeline Stage** runs Dockerfile analysis
2. **Stage creates artifacts** (commits state files to git)
3. **Main pipeline Warehouse** subscribes to git repo (state files)
4. **Main pipeline detects changes** and creates Freight
5. **Main pipeline promotes** through environments

**Benefits:**
- Clean separation between analysis and deployment
- Analysis results become versioned artifacts
- Main pipeline only cares about state, not how it was discovered
- Can have different promotion policies for analysis vs deployment

**Example:**

```yaml
# Pre-pipeline
apiVersion: kargo.akuity.io/v1alpha1
kind: Stage
metadata:
  name: analyze
  namespace: backstage-kargo
spec:
  requestedFreight:
    - origin:
        kind: Warehouse
        name: backstage
      sources:
        direct: true
  
  promotionTemplate:
    spec:
      steps:
        - uses: git-clone
          config:
            repoURL: https://github.com/craigedmunds/argocd-eda.git
            checkout:
              - branch: main
                path: ./repo
        
        - uses: exec
          as: analyze
          config:
            command: |
              # Analyze Dockerfile and update state files
              /app/analyze --image backstage --freight ${{ freight.images[0].tag }}
        
        - uses: git-commit
          config:
            path: ./repo
            message: "chore: update state for backstage@${{ freight.images[0].tag }}"
        
        - uses: git-push
          config:
            path: ./repo
            targetBranch: main
---
# Main pipeline Warehouse subscribes to state files
apiVersion: kargo.akuity.io/v1alpha1
kind: Warehouse
metadata:
  name: backstage-state
  namespace: backstage-kargo
spec:
  subscriptions:
    - git:
        repoURL: https://github.com/craigedmunds/argocd-eda.git
        includePaths:
          - image-factory/state/images/backstage.yaml
```

This pattern could eliminate the need for separate Analysis resources and make the workflow more explicit.

## Configuration & State Management

### Enrollment vs. Discovered State

**Enrollment (images.yaml)** - Minimal, human-maintained:
- Which images to track
- Where to find their source
- Basic rebuild policies

**Discovered State (state/)** - Auto-generated by Analysis Jobs:
- Parsed Dockerfile dependencies
- Base image update timestamps
- Dependency graph
- Rebuild history
- Current versions

### File Organization

```
image-factory/
├── images.yaml                    # Enrollment registry (human-edited)
├── state/
│   ├── images/                    # Our internal images (Analysis-generated)
│   │   ├── backstage.yaml
│   │   ├── mesh-consumer.yaml
│   │   └── uv-service.yaml
│   └── base-images/               # Upstream base images (Analysis-generated)
│       ├── node-22-bookworm-slim.yaml
│       ├── python-3.12-alpine.yaml
│       └── nginx-1.25-alpine.yaml
└── README.md
```

### images.yaml Structure (Enrollment)

```yaml
# Minimal enrollment configuration - supports both GitHub and GitLab
images:
  # GitHub example
  - name: backstage
    registry: ghcr.io
    repository: craigedmunds/backstage
    source:
      provider: github
      repo: craigedmunds/argocd-eda
      branch: main
      dockerfile: apps/backstage/packages/backend/Dockerfile
      workflow: backstage.yml  # GitHub Actions workflow file
    rebuildDelay: 7d    # Optional, defaults to 7d
    autoRebuild: true   # Optional, defaults to true

  # GitLab example
  - name: mesh-consumer
    registry: registry.gitlab.com
    repository: myorg/mesh-consumer
    source:
      provider: gitlab
      repo: myorg/internal-services  # GitLab project path
      branch: main
      dockerfile: services/mesh-consumer/Dockerfile
      pipeline: .gitlab-ci.yml
      job: build-mesh-consumer  # Specific job name to trigger
    rebuildDelay: 7d
    autoRebuild: true
```

### state/images/{image}.yaml Structure

```yaml
# Auto-generated by Kargo Analysis Job
name: backstage
enrolledAt: "2024-12-04T10:00:00Z"
lastDiscovery: "2024-12-04T15:30:00Z"

# Discovered from Dockerfile
baseImages:
  - node-22-bookworm-slim

# Discovered from dependency graph
dependentImages: []

# Current published state
currentVersion: "0.6.5"
currentDigest: sha256:def456...
lastBuilt: "2024-12-03T12:00:00Z"

# Rebuild tracking
rebuildState:
  status: pending
  pendingRebuild: true
  rebuildReason: "Base image node-22-bookworm-slim updated"
  rebuildScheduledFor: "2024-12-11T10:00:00Z"
  triggeredBy: base-image-update

# History
rebuildHistory:
  - triggeredAt: "2024-12-03T12:00:00Z"
    reason: "Manual trigger"
    baseImageSnapshots:
      node-22-bookworm-slim: sha256:abc123...
    resultVersion: "0.6.5"
    success: true
```

### state/base-images/{base-image}.yaml Structure

```yaml
# Auto-generated by Kargo Analysis Job
name: node-22-bookworm-slim
fullImage: node:22-bookworm-slim
registry: docker.io
repository: library/node
tag: 22-bookworm-slim

# Monitoring state
lastChecked: "2024-12-04T15:30:00Z"
currentDigest: sha256:abc123def456...
lastUpdated: "2024-11-27T08:00:00Z"
previousDigest: sha256:old123...

# Images that depend on this base image
dependentImages:
  - backstage
  - mesh-consumer

# Update history
updateHistory:
  - detectedAt: "2024-11-27T08:00:00Z"
    digest: sha256:abc123def456...
    triggeredRebuilds:
      - backstage
      - mesh-consumer
```

## Image Factory Manifest Generation Tool

The manifest generation tool reads configuration and state files to generate Kargo resources. It can be implemented as:

- **CLI tool** (e.g., Go binary, Python script)
- **Kubernetes controller** (watches ConfigMaps/files)
- **GitHub Action** (runs on push)
- **GitLab CI job** (runs on push)
- **Pre-commit hook** (generates locally)

### Responsibilities

1. **From images.yaml** → Generate Warehouse + Stage for each enrolled image
2. **From state/base-images/** → Generate Warehouse + Stage for each discovered base image
3. **Idempotent** → Can be run multiple times safely
4. **Validates** → Ensures generated YAMLs are valid

### Example Usage

```bash
# Generate all Kargo resources
image-factory generate

# Generate only for specific image
image-factory generate --image backstage

# Validate without writing
image-factory generate --dry-run
```

## Kargo Resources

### Warehouse (Generated from images.yaml)

```yaml
apiVersion: kargo.akuity.io/v1alpha1
kind: Warehouse
metadata:
  name: backstage
  namespace: backstage-kargo
spec:
  subscriptions:
    - image:
        repoURL: ghcr.io/craigedmunds/backstage
        semverConstraint: ">=0.6.0"
        discoveryLimit: 10
```

### Stage with Analysis (Generated from images.yaml)

```yaml
apiVersion: kargo.akuity.io/v1alpha1
kind: Stage
metadata:
  name: analyze
  namespace: backstage-kargo
spec:
  requestedFreight:
    - origin:
        kind: Warehouse
        name: backstage
      sources:
        direct: true
  
  verification:
    analysisTemplates:
      - name: analyze-dockerfile
    args:
      - name: image-name
        value: backstage
      - name: dockerfile-path
        value: apps/backstage/packages/backend/Dockerfile
      - name: source-repo
        value: craigedmunds/argocd-eda
      - name: source-provider
        value: github
```

### AnalysisTemplate (Shared)

```yaml
apiVersion: kargo.akuity.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: analyze-dockerfile
  namespace: image-factory-kargo
spec:
  args:
    - name: image-name
    - name: dockerfile-path
    - name: source-repo
    - name: source-provider
  metrics:
    - name: dockerfile-analysis
      provider:
        job:
          spec:
            template:
              spec:
                serviceAccountName: image-factory
                containers:
                  - name: analyzer
                    image: image-factory-analyzer:latest
                    command: ["/app/analyze"]
                    args:
                      - "--image={{args.image-name}}"
                      - "--dockerfile={{args.dockerfile-path}}"
                      - "--repo={{args.source-repo}}"
                      - "--provider={{args.source-provider}}"
                    env:
                      - name: GITHUB_TOKEN
                        valueFrom:
                          secretKeyRef:
                            name: image-factory-secrets
                            key: github-token
                      - name: GITLAB_TOKEN
                        valueFrom:
                          secretKeyRef:
                            name: image-factory-secrets
                            key: gitlab-token
                restartPolicy: Never
```

## Benefits

**Pure Kargo:**
- No external schedulers or CronJobs
- All logic in Kargo Stages and Analysis
- Unified UI and monitoring

**Event-driven:**
- Immediate reaction to Freight creation
- No polling overhead
- Efficient resource usage

**GitOps native:**
- All config in git
- Generated manifests version controlled
- Full audit trail

**Scalable:**
- Add images by editing images.yaml
- Kargo handles all orchestration
- No infrastructure to manage

## Security Considerations

1. **Credential Management**
   - Store tokens in Kubernetes Secrets
   - Use ServiceAccount for Kargo API access
   - Minimal scope permissions

2. **Vulnerability Scanning**
   - Continue using Trivy in build pipelines
   - Monitor CVE databases during waiting period

3. **Supply Chain Security**
   - Verify image signatures (cosign)
   - Check SBOM and provenance attestations

4. **Audit Trail**
   - All state changes in git
   - Kargo Analysis results tracked
   - Rebuild history in state files

## Open Questions

1. **How do we handle breaking changes in base images?**
   - Should we test images before promoting?
   - Need a rollback mechanism?

2. **What if a base image has a critical CVE?**
   - Should we rebuild immediately (skip waiting period)?
   - How do we get notified of CVEs?

3. **How do we handle multi-stage builds with multiple base images?**
   - Track all FROM statements?
   - Prioritize by stage?

4. **How do we handle rate limiting?**
   - Docker Hub has strict rate limits
   - Need caching strategy?
   - Should we use a pull-through cache?

## Next Steps

1. **Build manifest generation tool** - CLI or controller
2. **Create AnalysisTemplate** - Dockerfile analyzer container
3. **Test with backstage** - Use as pilot project
4. **Add base image monitoring** - Complete the loop
5. **Iterate and expand** - Add more images and features
