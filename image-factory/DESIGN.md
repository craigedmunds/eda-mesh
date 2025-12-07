# Image Factory - Design

## Architecture Overview

**Key Insight:** Use Kargo for ALL monitoring and event triggering. Kargo's Analysis feature runs Dockerfile analysis, and Kargo Stages orchestrate rebuilds.

### Why This is Elegant

**Pure Kargo:**
- All monitoring through Kargo Warehouses
- All analysis through Kargo AnalysisTemplates
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

## Event-Driven Workflow

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
│    CDK8s app (Image Factory manifest generation tool):      │
│    - Reads images.yaml AND state files                     │
│    - Merges them (images.yaml takes precedence)            │
│    - Generates Warehouse YAML for:                         │
│      * External images (no source in images.yaml)          │
│      * Base images (discovered in state/base-images/)      │
│    - Does NOT generate for managed images (built, not monitored)│
│    - Commits to dist/image-factory.qk8s.yaml                │
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
│    - Runs apps/image-factory/app.py in uv container        │
│    - Parses Dockerfile from source repo                    │
│    - Discovers base images from FROM statements            │
│    - Creates/updates state files in git                    │
│    - Analysis completes → Stage verified                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Base Image Warehouse Generation                         │
│    CDK8s app detects new state files:                       │
│    - Reads state/base-images/*.yaml                        │
│    - Generates Warehouse YAML for each base image          │
│    - Commits to dist/image-factory.k8s.yaml                │
│    - ArgoCD applies → Kargo monitors base images           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Base Image Monitoring                                   │
│    Kargo detects base image update → Creates Freight       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Rebuild Decision (Future: Kargo Analysis)               │
│    Analysis Job for base image Freight:                    │
│    - Reads state files                                      │
│    - Checks if 7 days have passed                          │
│    - If yes: Updates state to trigger rebuild              │
│    - If no: Updates state with pending status              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Rebuild Trigger (Future: Kargo Promotion Step)          │
│    Stage promotion step:                                    │
│    - Reads state files                                      │
│    - Triggers workflow_dispatch (GitHub) or pipeline (GitLab)│
│    - Updates state with rebuild attempt                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (Back to step 3 - new image built)
```

## Component Design

### 1. Analysis Tool (`apps/image-factory/app.py`)

**Purpose:** Parses Dockerfiles and generates/updates state files with warehouse configuration

**Inputs:**
- `--image`: Image name
- `--tag`: Image tag
- `--digest`: Image digest
- `--dockerfile`: Path to Dockerfile
- `--source-repo`: Source repository
- `--source-provider`: github or gitlab
- `--git-repo`: Git repository URL
- `--git-branch`: Git branch

**Outputs:**
- `state/images/{image}.yaml`: State file for the image
- `state/base-images/{base-image}.yaml`: State files for discovered base images (with warehouse config)

**Logic:**
1. Load images.yaml enrollment configuration
2. Determine image type:
   - **Managed**: Has source.repo in images.yaml → Parse Dockerfile
   - **External**: No source.repo → Use warehouse config from images.yaml
3. For managed images:
   - Parse Dockerfile to discover base images
   - Generate state WITHOUT warehouse config (managed images are built, not monitored)
4. For external images:
   - Generate state WITH warehouse config (repoURL, allowTags, imageSelectionStrategy)
5. For discovered base images:
   - Generate state WITH warehouse config (parsed from image reference)
   - Add to dependentImages list
6. Merge with existing state (preserving runtime data, images.yaml takes precedence)
7. Ensure output aligns with CDK8s input requirements

**Key Principle:** Only images that need monitoring (external + base images) get warehouse configuration in their state files.

### 2. CDK8s App (`cdk8s/image-factory/main.py`)

**Purpose:** Generates Kargo Warehouse resources from merged configuration and state

**Inputs:**
- `image-factory/images.yaml` (enrollment configuration)
- `image-factory/state/images/*.yaml` (managed and external image state)
- `image-factory/state/base-images/*.yaml` (discovered base image state)

**Outputs:**
- `dist/image-factory.k8s.yaml`: Kargo Warehouse resources

**Logic:**
1. Load images.yaml
2. Load all state files from state/images/ and state/base-images/
3. Merge by name (images.yaml takes precedence for configuration)
4. For each merged entry:
   - Check if it has `repoURL` and `allowTags` fields
   - If yes: Generate Kargo Warehouse resource
   - If no: Skip (it's a managed image that's built, not monitored)
5. Output all warehouses to dist/

**Warehouse Generation Rules:**
- **Base images**: Always have warehouse config → Always generate warehouse
- **External images**: Have warehouse config in images.yaml → Generate warehouse
- **Managed images**: No warehouse config → Skip (they're built by CI/CD)
- **Managed → External**: If source removed from images.yaml, warehouse config added → Generate warehouse

**Key Principle:** The CDK8s app is a pure transformation - it reads merged state and generates warehouses for anything that needs monitoring.

### 3. Kargo Resources (`kustomize/image-factory/`)

**Components:**
- **Warehouse**: Monitors image registries
- **AnalysisTemplate**: Runs analysis tool in K8s Job
- **Stages**: Orchestrate analysis and promotion
- **ConfigMap**: Contains analysis tool source code

**Flow:**
```
Warehouse (backstage) 
  → Freight 
  → Stage (analyze-dockerfile with verification)
  → Stage (analyzed)
```

## Data Model

### Configuration: images.yaml

**Managed Image (has source):**
```yaml
- name: backstage
  registry: ghcr.io
  repository: craigedmunds/backstage
  source:
    provider: github
    repo: craigedmunds/argocd-eda
    branch: main
    dockerfile: apps/backstage/packages/backend/Dockerfile
    workflow: backstage.yml
  rebuildDelay: 7d
  autoRebuild: true
```

**External Image (no source, has warehouse config):**
```yaml
- name: postgres
  registry: docker.io
  repository: library/postgres
  allowTags: ^16-alpine$
  imageSelectionStrategy: Lexical
  rebuildDelay: 30d
  autoRebuild: false
```

### State: state/images/{image}.yaml

**Managed Image State (no warehouse config):**
```yaml
name: backstage
enrolledAt: "2024-12-04T10:00:00Z"
lastDiscovery: "2024-12-04T15:30:00Z"
discoveryStatus: success

enrollment:
  registry: ghcr.io
  repository: craigedmunds/backstage
  source:
    provider: github
    repo: craigedmunds/argocd-eda
    dockerfile: apps/backstage/packages/backend/Dockerfile
  rebuildDelay: 7d
  autoRebuild: true

baseImages:
  - node-22-bookworm-slim

currentVersion: "0.6.5"
currentDigest: sha256:...
lastBuilt: "2024-12-03T12:00:00Z"

rebuildState:
  status: monitoring
  pendingRebuild: false
```

**External Image State (has warehouse config):**
```yaml
name: postgres
enrolledAt: "2024-12-04T10:00:00Z"
discoveryStatus: external

enrollment:
  registry: docker.io
  repository: library/postgres
  rebuildDelay: 30d
  autoRebuild: false

# Warehouse configuration for CDK8s
repoURL: docker.io/library/postgres
allowTags: ^16-alpine$
imageSelectionStrategy: Lexical

baseImages: []
currentDigest: sha256:...
```

### State: state/base-images/{base-image}.yaml

```yaml
name: node-22-bookworm-slim
fullImage: node:22-bookworm-slim
registry: docker.io
repository: library/node
tag: 22-bookworm-slim

# Warehouse configuration (for cdk8s)
repoURL: docker.io/library/node
allowTags: ^22-bookworm-slim$
imageSelectionStrategy: Lexical

firstDiscovered: "2024-12-04T10:00:00Z"
lastChecked: "2024-12-04T15:30:00Z"

dependentImages:
  - backstage

currentDigest: sha256:...
lastUpdated: null
```

## Image Lifecycle Transitions

### New Managed Image
1. Add to images.yaml with source info
2. Analysis tool parses Dockerfile
3. Creates state/images/{name}.yaml WITHOUT warehouse config
4. Discovers base images → Creates state/base-images/*.yaml WITH warehouse config
5. CDK8s generates warehouses for base images only

### New External Image
1. Add to images.yaml WITHOUT source, WITH warehouse config
2. Analysis tool creates state/images/{name}.yaml WITH warehouse config
3. CDK8s generates warehouse for the external image

### External → Managed
1. Add source info to images.yaml
2. Analysis tool updates state, REMOVES warehouse config
3. CDK8s stops generating warehouse (now built by CI/CD)

### Managed → External
1. Remove source info from images.yaml, ADD warehouse config
2. Analysis tool updates state, ADDS warehouse config
3. CDK8s starts generating warehouse (now monitored)

### Base Image → Managed
1. Add base image to images.yaml with source info
2. Analysis tool updates state, REMOVES warehouse config
3. CDK8s stops generating warehouse for that base image

## Data Alignment Contract

**Analysis Tool Output → CDK8s Input:**

The analysis tool MUST ensure state files contain these fields for CDK8s:
- `name`: Image identifier
- `repoURL`: Full registry/repository path (if needs monitoring)
- `allowTags`: Regex for tag matching (if needs monitoring)
- `imageSelectionStrategy`: Lexical, SemVer, or NewestBuild (if needs monitoring)

**CDK8s Input Requirements:**

CDK8s will generate a Warehouse if and only if the merged entry has:
- `repoURL` field present and non-null
- `allowTags` field present and non-null

This contract ensures managed images (built by CI/CD) never get warehouses, while external images and base images (monitored) always do.

## Integration Points

### With Kargo
- Warehouses monitor registries (external images + base images)
- Freight triggers analysis (for managed images)
- Stages orchestrate workflow
- AnalysisTemplates run jobs

### With ArgoCD
- Applies generated Kargo resources
- Syncs on git changes
- Manages resource lifecycle

### With GitHub/GitLab
- Fetches Dockerfiles
- Commits state changes
- Triggers rebuild workflows

## Security Design

1. **Credentials**
   - GitHub token in `ghcr-credentials` secret
   - ServiceAccount `image-factory` for K8s API access
   - Minimal RBAC permissions

2. **Git Operations**
   - Analysis job commits as "Image Factory Bot"
   - All changes tracked in git history
   - PR-based workflow for enrollment

3. **Image Verification** (Future)
   - Verify signatures with cosign
   - Check SBOM and provenance
   - Scan for vulnerabilities

## Alternative: Kargo Pre-Pipeline Pattern

The Image Factory could be implemented as a Kargo pre-pipeline for cleaner separation:

```
Pre-Pipeline (Analysis):
  Warehouse (backstage) → Freight → Stage (analyze) → Creates artifacts (state files)
                                                              ↓
Main Pipeline (Deployment):                                   ↓
  Warehouse (state files) ← subscribes to artifacts ──────────┘
    ↓
  Freight → Stage (dev) → Stage (staging) → Stage (prod)
```

**Benefits:**
- Clean separation between analysis and deployment
- Analysis results become versioned artifacts
- Main pipeline only cares about state
- Different promotion policies for analysis vs deployment
