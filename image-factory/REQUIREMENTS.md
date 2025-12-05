# Image Factory - Requirements

## Problem Statement

When public base images are updated, our internal images that depend on them become stale and potentially vulnerable. We need an automated system that:

1. **Monitors** upstream base images for updates
2. **Waits** a configurable period (default: 7 days) to allow the community to discover vulnerabilities
3. **Rebuilds** our internal images that depend on the updated base image
4. **Cascades** rebuilds through the dependency chain
5. **Operates in a federated model** where image repositories are distributed across multiple repos/teams

## Functional Requirements

### FR1: Image Enrollment
- Developers can enroll images by adding them to `images.yaml`
- Two types of images:
  - **Managed Images**: Have source repo and Dockerfile (we build them)
  - **External Images**: No source repo (third-party images we monitor)
- Enrollment specifies:
  - Image registry and repository
  - Source code location (optional - only for managed images)
  - Dockerfile path (optional - only for managed images)
  - Build workflow/pipeline (optional - only for managed images)
  - Rebuild policies (delay, auto-rebuild)
  - Warehouse configuration (repoURL, allowTags) for external images

### FR2: Dependency Discovery
- System automatically discovers base images from Dockerfiles (managed images only)
- Parses all FROM statements
- Handles multi-stage builds
- Tracks dependency relationships
- Base images are initially treated as external
- Base images can be promoted to managed by adding source info to images.yaml

### FR3: Base Image Monitoring
- Monitors upstream base images for digest changes
- Detects new versions in registries
- Tracks update history
- No polling - event-driven via Kargo Warehouses

### FR4: Rebuild Orchestration
- Waits configurable delay period after base image update
- Triggers rebuilds of dependent images
- Cascades through dependency chain
- Updates state with rebuild attempts and results

### FR5: State Management
- Maintains state files for all images and base images
- Tracks current versions, digests, and update history
- Preserves runtime data across updates
- Configuration (images.yaml) takes precedence over state files
- State files contain warehouse configuration (repoURL, allowTags) for CDK8s
- Analysis tool output must align with CDK8s input requirements

### FR6: Manifest Generation
- CDK8s app reads both images.yaml and state files
- Generates Kargo Warehouse resources for:
  - Base images (discovered from Dockerfiles)
  - External images (enrolled without source)
  - Managed images that become external (source removed)
- Does NOT generate warehouses for managed images (they're built, not monitored)
- Merges images.yaml with state (images.yaml takes precedence)
- Output must be valid Kargo Warehouse YAML

### FR7: GitOps Integration
- All configuration in git
- State changes committed to git
- Kargo resources generated from config and state
- ArgoCD applies resources automatically

## Non-Functional Requirements

### NFR1: Event-Driven Architecture
- No polling or CronJobs
- React to Kargo Freight creation
- Efficient resource usage

### NFR2: Pure Kargo Implementation
- All monitoring through Kargo Warehouses
- All analysis through Kargo AnalysisTemplates
- All orchestration through Kargo Stages
- Unified UI and monitoring

### NFR3: Security
- Credentials stored in Kubernetes Secrets
- Minimal permission scopes
- Audit trail in git
- Support for image signature verification

### NFR4: Scalability
- Add images by editing configuration
- No infrastructure to manage
- Distributed across repos/teams

### NFR5: Testability
- Unit tests for analysis tool (apps/image-factory/test_app.py)
- Unit tests for CDK8s manifest generation (cdk8s/image-factory/test_main.py)
- Integration tests verifying tool → state → CDK8s workflow (image-factory/test_integration.py)
- Tests verify data alignment between tool output and CDK8s input

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

5. **How do we handle image lifecycle transitions?**
   - External → Managed: Add source info to images.yaml
   - Managed → External: Remove source info from images.yaml
   - Base image promoted to managed: Add to images.yaml with source
   - How do we clean up old state files?
