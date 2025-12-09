# Image Factory - Design

## Overview

The Image Factory uses Kargo for all monitoring and event triggering, creating an elegant event-driven system that requires no polling or external schedulers. The system consists of three main components:

1. **Analysis Tool** (`apps/image-factory/app.py`) - Parses Dockerfiles and generates state files
2. **CDK8s App** (`cdk8s/image-factory/main.py`) - Generates Kargo Warehouse manifests
3. **Kargo Resources** - Warehouses, Stages, and AnalysisTemplates that orchestrate the workflow

## Architecture

### Event-Driven Workflow

```
Developer enrolls image in images.yaml
    ↓
CDK8s generates Warehouse + Stage manifests
    ↓
ArgoCD applies resources to cluster
    ↓
Kargo Warehouse detects existing image → Creates Freight
    ↓
Stage requests Freight → Analysis Job runs
    ↓
Analysis Tool parses Dockerfile → Discovers base images
    ↓
State files updated in git
    ↓
CDK8s generates Warehouses for base images
    ↓
ArgoCD applies → Kargo monitors base images
    ↓
Base image updates → New Freight created
    ↓
Rebuild-trigger Stage promotes → GitHub API called
    ↓
GitHub Actions workflow runs → New image built
    ↓
(Cycle repeats)
```

### Key Design Principles

1. **Pure Kargo**: All monitoring through Warehouses, all analysis through AnalysisTemplates, all orchestration through Stages
2. **Event-driven**: No polling or CronJobs, react to Freight creation
3. **GitOps native**: All configuration in git, all changes committed, ArgoCD applies everything
4. **Separation of concerns**: Analysis tool generates state, CDK8s generates manifests, Kargo orchestrates
5. **Data alignment**: Analysis tool output matches CDK8s input requirements exactly

## Components

### 1. Analysis Tool (`apps/image-factory/app.py`)

**Purpose:** Parse Dockerfiles and generate/update state files with warehouse configuration.

**Class Structure:**
```python
class ImageFactoryTool:
    - load_images_yaml() -> List[Dict]
    - parse_dockerfile_base_image(dockerfile_path) -> Optional[str]
    - normalize_base_image_name(image_ref) -> str
    - parse_image_reference(image_ref) -> Dict[str, str]
    - generate_base_image_state(image_ref) -> Dict
    - generate_image_state(image_config, base_images) -> Dict
    - merge_state(existing, new, prefer_new) -> Dict
    - write_base_image_state(state, file_path)
    - write_image_state(state, file_path)
    - process()
```

**Processing Logic:**

1. Load images.yaml enrollment configuration (contains only managed images)
2. For each enrolled managed image:
   - Parse Dockerfile to discover base images from FROM statements
   - Generate state file for the managed image (without warehouse config)
   - For each discovered base image:
     - Generate state file with warehouse config (for monitoring upstream)
     - Track dependency relationship
3. Merge with existing state to preserve runtime data
4. Write formatted YAML with comments

**Key Decisions:**
- Only base images get warehouse config (repoURL, allowTags) for upstream monitoring
- Managed images get state files but no upstream warehouse config (they're built, not monitored upstream)
- Managed images DO get warehouses to monitor the built image in GHCR
- Base images are automatically discovered, never manually enrolled
- State merge preserves: currentDigest, lastBuilt, updateHistory, metadata

### 2. CDK8s App (`cdk8s/image-factory/main.py`)

**Purpose:** Generate Kargo Warehouse resources from merged configuration and state.

**Module Structure:**
```python
lib/
├── data.py          # merge_images(), is_managed_image()
├── warehouses.py    # create_warehouse_*()
├── stages.py        # setup_analysis_stage(), setup_rebuild_trigger_stage()
├── analysis.py      # setup_analysis_template()
└── infrastructure.py # setup_infrastructure()
```

**Generation Logic:**

1. Load images.yaml
2. Load all state files from state/images/ and state/base-images/
3. Merge by name (images.yaml takes precedence)
4. For each merged entry:
   - If has source.repo: It's managed → Create warehouse for monitoring built image
   - If has repoURL + allowTags: Create warehouse for monitoring upstream
5. Create AnalysisTemplate for Dockerfile analysis
6. Create analysis stages for managed images
7. Build dependency graph and create rebuild-trigger stages

**Warehouse Generation Rules:**
- **Managed images**: Generate warehouse to monitor the built image in GHCR (for triggering analysis)
- **Base images**: Generate warehouse to monitor upstream registry (for triggering rebuilds)
- **No manual enrollment**: Base images are discovered automatically, not enrolled by developers

### 3. Kargo Resources

**Warehouse Types:**

1. **Managed Image Warehouses**: Monitor GHCR for newly built images
   - Example: `backstage` watches `ghcr.io/craigedmunds/backstage`
   - Triggers: Analysis stage when new image is pushed

2. **Base Image Warehouses**: Monitor upstream registries for base images
   - Example: `node-22-bookworm-slim` watches `docker.io/library/node:22-bookworm-slim`
   - Triggers: Rebuild-trigger stages for dependent managed images
   - Note: Base images are automatically discovered from Dockerfiles, not manually enrolled

**Stage Types:**

1. **Analysis Stages**: Run Dockerfile analysis when managed images are built
   - Name pattern: `analyze-dockerfile-{image-name}`
   - Subscribes to: Managed image warehouse
   - Runs: Kargo Analysis Job with Analysis Tool
   - Updates: State files in git

2. **Rebuild-Trigger Stages**: Trigger GitHub Actions when base images update
   - Name pattern: `rebuild-trigger-{dependent-image-name}`
   - Subscribes to: Base image warehouse
   - Runs: HTTP step calling GitHub API
   - Triggers: workflow_dispatch with parameters

**AnalysisTemplate:**

Defines a Kubernetes Job that:
- Clones the git repository
- Runs the Analysis Tool with image metadata
- Commits state file changes back to git
- Uses the `uv` container image for Python execution

## Data Models

### Configuration: images.yaml

**Managed Image:**
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

**Note:** Only managed images are enrolled in images.yaml. Base images are discovered automatically from Dockerfiles.

### State: state/images/{image}.yaml

**Managed Image State:**
```yaml
name: backstage
enrolledAt: "2024-12-04T10:00:00Z"
lastDiscovery: "2024-12-04T15:30:00Z"
discoveryStatus: pending  # or: success, failed, external

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
```

**Note:** Managed images don't have warehouse config in their state files because they're built, not monitored upstream. They DO get warehouses created to monitor the built image in GHCR.

### State: state/base-images/{base-image}.yaml

```yaml
name: node-22-bookworm-slim
fullImage: node:22-bookworm-slim
registry: docker.io
repository: library/node
tag: 22-bookworm-slim

# Warehouse configuration for CDK8s
repoURL: docker.io/library/node
allowTags: ^22-bookworm-slim$
imageSelectionStrategy: Lexical

firstDiscovered: "2024-12-04T10:00:00Z"
lastChecked: "2024-12-04T15:30:00Z"

currentDigest: sha256:...
lastUpdated: null
previousDigest: null
rebuildEligibleAt:
  default: null
metadata: {}
updateHistory: []
```

## Data Alignment Contract

**Analysis Tool Output → CDK8s Input:**

The Analysis Tool ensures state files contain these fields for CDK8s:
- `name`: Image identifier (always present)
- `repoURL`: Full registry/repository path (only if needs monitoring)
- `allowTags`: Regex for tag matching (only if needs monitoring)
- `imageSelectionStrategy`: Lexical, SemVer, or NewestBuild (only if needs monitoring)

**CDK8s Input Requirements:**

CDK8s generates warehouses based on:
- **Managed images** (has source.repo): Generate warehouse to monitor built image in GHCR
- **Base images** (has repoURL + allowTags): Generate warehouse to monitor upstream registry

This contract ensures:
- Managed images get warehouses to monitor the built image (for triggering analysis)
- Base images get warehouses to monitor upstream (for triggering rebuilds)
- The system distinguishes between "monitor what we build" and "monitor what we depend on"

## Image Lifecycle Transitions

### New Managed Image Enrollment
1. Developer adds image to images.yaml with source info
2. CDK8s generates warehouse to monitor the built image in GHCR
3. CDK8s generates analysis stage for the image
4. When image is built and pushed, analysis stage runs
5. Analysis tool parses Dockerfile and discovers base images
6. Creates state/images/{name}.yaml (without upstream warehouse config)
7. Creates state/base-images/*.yaml for each discovered base image (with warehouse config)
8. CDK8s generates warehouses to monitor base images upstream
9. CDK8s generates rebuild-trigger stages for base image → managed image dependencies

### Base Image Promoted to Managed
1. Developer enrolls a base image (e.g., node) as a managed image in images.yaml
2. Analysis tool removes warehouse config from base image state (no longer monitoring upstream)
3. CDK8s stops generating upstream warehouse for that base image
4. CDK8s generates warehouse to monitor the built version in GHCR
5. Dependent images now depend on our managed version instead of upstream

### Managed Image Removed from Enrollment
1. Developer removes image from images.yaml
2. CDK8s stops generating warehouse for the built image
3. CDK8s stops generating analysis stage
4. If the image is a dependency of other images, it becomes a base image
5. Analysis tool adds warehouse config to track it as a base image
6. CDK8s generates upstream warehouse to monitor it

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: State file preservation during merge

*For any* existing state file and new configuration, when the Analysis Tool merges them, the runtime data fields (currentDigest, lastBuilt, updateHistory, metadata) SHALL be preserved from the existing state.

**Validates: Requirements 3.4, 3.5**

### Property 2: Warehouse generation consistency

*For any* merged image entry, the CDK8s App SHALL generate a Warehouse if and only if the entry contains both repoURL and allowTags fields.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 3: Managed image identification

*For any* image entry with a source.repo field, the system SHALL classify it as a managed image and SHALL NOT include upstream warehouse configuration in its state file.

**Validates: Requirements 1.1, 2.1**

### Property 4: Base image discovery completeness

*For any* Dockerfile with a FROM statement, the Analysis Tool SHALL create a corresponding base image state file with warehouse configuration.

**Validates: Requirements 2.2, 2.3**

### Property 5: Dockerfile parsing round-trip

*For any* valid Dockerfile, parsing the FROM statement and then formatting the image reference SHALL produce a valid image reference that can be used to create a warehouse.

**Validates: Requirements 2.1, 2.2**

### Property 6: State merge idempotence

*For any* state file, merging it with itself SHALL produce an identical state file.

**Validates: Requirements 3.3, 3.4**

### Property 7: Image lifecycle transition consistency

*For any* base image that is promoted to managed (by enrolling with source info), the state file SHALL have upstream warehouse configuration removed and baseImages field populated.

**Validates: Requirements 7.1, 7.3**

### Property 8: Dependency graph completeness

*For any* managed image with base images, the CDK8s App SHALL create rebuild-trigger stages for each base image dependency.

**Validates: Requirements 2.3, 4.1**

### Property 9: Git commit atomicity

*For any* Analysis Tool execution that updates multiple state files, all changes SHALL be committed together in a single git commit.

**Validates: Requirements 6.3**

### Property 10: Error isolation

*For any* image that fails Dockerfile parsing, the Analysis Tool SHALL continue processing other images without failing the entire batch.

**Validates: Requirements 8.1**

## Integration Points

### With Kargo
- Warehouses monitor registries (built managed images in GHCR, upstream base images)
- Freight triggers analysis (when managed images are built) and rebuilds (when base images update)
- Stages orchestrate workflow (analysis, rebuild triggering)
- AnalysisTemplates run jobs (Dockerfile analysis)

### With ArgoCD
- Applies generated Kargo resources from dist/image-factory.k8s.yaml
- Syncs on git changes automatically
- Manages resource lifecycle (creates, updates, deletes)

### With GitHub/GitLab
- Analysis jobs clone repositories to access Dockerfiles
- Analysis jobs commit state file changes back to git
- Rebuild-trigger stages call workflow_dispatch API
- GitHub Actions workflows build and push images

### With Container Registries
- Kargo Warehouses monitor for digest changes
- Analysis tool parses image references to determine registry/repository
- Built images pushed to GHCR trigger analysis stages

## Security Design

### Credentials Management
- GitHub token stored in `github-credentials` Kubernetes Secret (managed by Kyverno)
- ServiceAccount `image-factory` for Kubernetes API access
- Minimal RBAC permissions (read Freight, create Jobs, update Stages)
- Git credentials for Analysis Jobs to commit changes

### Git Operations
- Analysis jobs commit as "Image Factory Bot <bot@example.com>"
- All changes tracked in git history with descriptive messages
- PR-based workflow for enrollment (manual review of images.yaml changes)

### Future Enhancements
- Image signature verification with cosign
- SBOM and provenance checking
- Vulnerability scanning integration
- Policy enforcement (block unsigned images)

## Error Handling Strategy

### Analysis Tool Errors
- Missing Dockerfile: Log warning, continue processing other images
- Invalid Dockerfile syntax: Log error, mark discoveryStatus as failed
- Missing images.yaml: Log warning, exit gracefully
- State file corruption: Log error, regenerate from images.yaml

### CDK8s App Errors
- Missing required fields: Log warning, skip that image
- Invalid YAML in state files: Log error, skip that file
- File system errors: Fail fast with clear error message

### Kargo Errors
- Analysis Job failure: Stage marks Freight as not verified, allows retry
- GitHub API failure: Log HTTP status code, Stage fails (manual retry)
- Git commit failure: Job fails, Kubernetes retries with backoff

## Testing Strategy

### Unit Tests

**Analysis Tool Tests** (`apps/image-factory/test_app.py`):
- Test Dockerfile parsing with various FROM statement formats
- Test image reference parsing (with/without registry, with/without tag)
- Test state file generation for managed, external, and base images
- Test state merging logic (preserve runtime data, update config)
- Test normalization of image names for filenames

**CDK8s App Tests** (`cdk8s/image-factory/test_main.py`):
- Test warehouse generation for different image types
- Test merge logic (images.yaml precedence over state files)
- Test stage generation (analysis stages, rebuild-trigger stages)
- Test dependency graph building
- Test manifest output validation

### Integration Tests

**End-to-End Workflow** (`image-factory/test_integration.py`):
- Test complete flow: images.yaml → Analysis Tool → state files → CDK8s → manifests
- Test image lifecycle transitions (external → managed, managed → external)
- Test multi-image scenarios with dependencies
- Verify data alignment between Analysis Tool output and CDK8s input

### Property-Based Tests

Future enhancement: Use Hypothesis to generate random:
- Dockerfile content with various FROM statements
- Image references with different formats
- State files with various field combinations
- Verify properties hold across all generated inputs

## Performance Considerations

### Scalability
- Analysis Tool processes images sequentially (simple, predictable)
- CDK8s App loads all state files into memory (acceptable for 100s of images)
- Kargo Warehouses scale independently (one per monitored image)
- Git operations are the bottleneck (consider batching commits)

### Resource Usage
- Analysis Jobs: ~100MB memory, <1 CPU, <30s execution
- CDK8s synthesis: ~200MB memory, <1 CPU, <10s execution
- Kargo Warehouses: Minimal (just API calls to registries)

### Optimization Opportunities
- Batch state file commits (currently one commit per analysis run)
- Cache Dockerfile parsing results (avoid re-parsing unchanged files)
- Parallel image processing in Analysis Tool (currently sequential)
- Incremental CDK8s synthesis (only regenerate changed resources)

## Alternative Architectures Considered

### Kargo Pre-Pipeline Pattern

Could implement as a pre-pipeline for cleaner separation:

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
- Different promotion policies for analysis vs deployment

**Drawbacks:**
- More complex setup
- State files would need to be packaged as artifacts
- Current git-based approach is simpler

**Decision:** Stick with current git-based approach for simplicity. Revisit if we need more complex promotion workflows.

## Backstage Integration

### Overview

To provide better visibility into image relationships and enable self-service enrollment, we integrate the Image Factory with Backstage through custom entity kinds and plugins. This allows developers to visualize dependencies, understand impact of base image updates, and enroll new managed images through a UI.

### Architecture

**Components:**
1. **Backstage Entity Provider** - CDK8s-generated ConfigMaps that Backstage ingests
2. **Custom Entity Kinds** - ManagedImage and BaseImage entity definitions
3. **Backstage Plugins** - Frontend, backend, and common packages for UI and API
4. **Entity Processor** - Transforms Image Factory state into Backstage entities

### Custom Entity Kinds

#### ManagedImage Entity

```yaml
apiVersion: backstage.io/v1alpha1
kind: ManagedImage
metadata:
  name: backstage
  title: Backstage
  description: Backstage developer portal backend
  annotations:
    image-factory.io/registry: ghcr.io
    image-factory.io/repository: craigedmunds/backstage
    image-factory.io/digest: sha256:abc123...
    image-factory.io/last-built: "2024-12-09T10:00:00Z"
    image-factory.io/rebuild-status: up-to-date
spec:
  type: managed-image
  lifecycle: production
  owner: platform-team
  system: image-factory
  source:
    provider: github
    repo: craigedmunds/argocd-eda
    branch: main
    dockerfile: apps/backstage/packages/backend/Dockerfile
    workflow: backstage.yml
  rebuildPolicy:
    delay: 7d
    autoRebuild: true
  dependsOn:
    - resource:node-22-bookworm-slim
      type: base-image
```

#### BaseImage Entity

```yaml
apiVersion: backstage.io/v1alpha1
kind: BaseImage
metadata:
  name: node-22-bookworm-slim
  title: Node 22 Bookworm Slim
  description: Official Node.js 22 base image (Debian Bookworm slim)
  annotations:
    image-factory.io/registry: docker.io
    image-factory.io/repository: library/node
    image-factory.io/tag: 22-bookworm-slim
    image-factory.io/digest: sha256:def456...
    image-factory.io/last-updated: "2024-12-08T15:30:00Z"
spec:
  type: base-image
  lifecycle: production
  owner: upstream
  system: image-factory
  upstream:
    registry: docker.io
    repository: library/node
    tag: 22-bookworm-slim
  dependents:
    - resource:backstage
      type: managed-image
    - resource:uv
      type: managed-image
```

### Data Synchronization via ConfigMaps

Following the existing pattern, the CDK8s App generates ConfigMaps in the `backstage` namespace with the label `eda.io/backstage-catalog: "true"`. Each ConfigMap contains one or more Backstage entities in the `data.catalog` field.

**Generation Approach:**
- CDK8s App reads state files for all images
- For each managed image, generates a ManagedImage entity ConfigMap
- For each base image, generates a BaseImage entity ConfigMap
- ConfigMaps include appropriate labels for filtering and identification

**Update Mechanism:**
1. When state files change (via Analysis Tool or manual updates)
2. CDK8s App regenerates ConfigMaps with updated entity data
3. ArgoCD detects changes and applies updated ConfigMaps
4. Backstage's Kubernetes entity provider picks up changes automatically
5. Entities refresh in the catalog (typically within 1-2 minutes)

### Backstage Plugins

#### Common Package (`@internal/plugin-image-factory-common`)

**Purpose:** Shared types, utilities, and entity definitions

**Provides:**
- Entity kind constants (ManagedImage, BaseImage)
- TypeScript interfaces for image entities and metadata
- Annotation key constants for image-factory.io/* annotations
- Utility functions for parsing entity annotations
- Validation schemas for enrollment data

#### Backend Package (`@internal/plugin-image-factory-backend`)

**Purpose:** Enrollment API for creating new managed images

**Single Endpoint:**
- `POST /api/image-factory/enroll` - Enroll a new managed image

**Enrollment Flow:**
- Validates enrollment request against schema from common package
- Creates a new branch in the git repository
- Adds image entry to images.yaml
- Commits changes and opens a pull request
- Returns PR URL for developer review
- Follows GitOps principles (no direct configuration writes)

**Note:** Reading image data (listing, details, dependencies) uses Backstage's standard catalog API - no custom endpoints needed.

#### Frontend Package (`@internal/plugin-image-factory`)

**Purpose:** UI components for visualization and management

**Key Components:**

1. **ImageCatalogPage** - Browse all managed and base images
   - Uses Backstage catalog API to query ManagedImage and BaseImage entities
   - Table view with filtering and search
   - Links to entity detail pages

2. **ManagedImageEntityPage** - Custom entity page for managed images
   - Displays image metadata from entity annotations
   - Shows source information and rebuild policy from spec
   - Lists base image dependencies with navigation links
   - Shows build history and rebuild status

3. **BaseImageEntityPage** - Custom entity page for base images
   - Displays upstream registry information
   - Shows current digest and last update time
   - Lists dependent managed images with navigation links
   - Shows update history

4. **DependencyGraphCard** - Visual dependency graph component
   - Queries entity relationships via catalog API
   - Renders interactive graph visualization
   - Enables navigation between related entities
   - Highlights update propagation paths

5. **EnrollImageDialog** - Enrollment form component
   - Form fields for all required enrollment information
   - Client-side validation using common package schemas
   - Calls backend enrollment API on submit
   - Displays PR URL on successful enrollment

### Entity Relationships

Backstage's built-in relation system models dependencies between images:
- ManagedImage entities include `dependsOn` relations to their BaseImage dependencies
- BaseImage entities include `dependents` relations to ManagedImage entities that use them
- Relations are bidirectional and enable navigation between entities
- Frontend components query these relations via catalog API to build dependency graphs

### Enrollment Workflow

**User Flow:**
1. Developer clicks "Enroll Image" in Backstage UI
2. Fills out form with image details:
   - Name, registry, repository
   - Source provider (GitHub/GitLab)
   - Source repo, branch, dockerfile path
   - Build workflow name
   - Rebuild delay and auto-rebuild setting
3. Submits form
4. Backend creates PR to add entry to images.yaml
5. Developer reviews and merges PR
6. ArgoCD detects change and triggers CDK8s synthesis
7. Analysis stage runs, discovers base images
8. New entities appear in Backstage catalog

**GitOps Compliance:**
- All changes go through PR review
- No direct writes to configuration
- Audit trail in git history
- Rollback via git revert

### Data Flow

```
State Files (git)
    ↓
CDK8s App reads state
    ↓
Generates ConfigMaps with Backstage entities
    ↓
ArgoCD applies ConfigMaps to backstage namespace
    ↓
Backstage Kubernetes provider ingests entities
    ↓
Entities appear in catalog
    ↓
Frontend displays in UI
    ↓
User enrolls new image via UI
    ↓
Backend creates PR to images.yaml
    ↓
PR merged → Analysis runs → State updated
    ↓
(Cycle repeats)
```

### Implementation Phases

**Phase 1: Entity Generation**
- Add ConfigMap generation to CDK8s App
- Define ManagedImage and BaseImage entity kinds
- Generate entities from state files
- Test entity ingestion in Backstage

**Phase 2: Basic Visualization**
- Create common package with types
- Build entity pages for ManagedImage and BaseImage
- Show basic metadata and relationships
- Add catalog page for browsing images

**Phase 3: Dependency Visualization**
- Implement dependency graph component
- Add interactive visualization
- Show update propagation paths
- Highlight stale images

**Phase 4: Self-Service Enrollment**
- Build backend API for enrollment
- Implement PR creation logic
- Create enrollment form UI
- Add validation and error handling

### Security Considerations

**Authentication:**
- Backend API uses Backstage's built-in auth
- GitHub/GitLab API calls use service account tokens
- PR creation requires appropriate permissions

**Authorization:**
- Enrollment restricted to authenticated users
- PR review provides approval gate
- No direct writes to production configuration

**Data Exposure:**
- Entities are visible to all Backstage users
- Sensitive data (credentials, tokens) not included in entities
- Annotations contain only public metadata

### Container Registry Integration

**Overview:**

Display container image versions and tags directly in Backstage entity pages using a custom card component that fetches data from container registries.

**Architecture:**

```
Backstage Entity Page
    ↓
ImageVersionsCard (React Component)
    ↓
Backend API Proxy
    ↓
Container Registry API (GHCR, Docker Hub, etc.)
    ↓
Returns: versions, tags, digests, metadata
```

**Components:**

1. **ImageVersionsCard** - Frontend React component
   - Displays table of image versions
   - Shows tag, digest, size, published date
   - Provides copy-to-clipboard for image references
   - Handles pagination for large version lists
   - Shows loading and error states

2. **Registry API Proxy** - Backend endpoint
   - `/api/image-factory/images/:name/versions`
   - Proxies requests to container registries
   - Handles authentication (GitHub tokens, Docker Hub credentials)
   - Caches responses to reduce API calls
   - Normalizes response format across registries

3. **Registry Adapters** - Backend services
   - `GitHubPackagesAdapter` - Fetches from GHCR using GitHub API
   - `DockerHubAdapter` - Fetches from Docker Hub API
   - `GenericRegistryAdapter` - Fallback for OCI-compliant registries

**Data Model:**

```typescript
interface ImageVersion {
  tag: string;
  digest: string;
  size: number;
  publishedAt: string;
  platform?: string;
  labels?: Record<string, string>;
}

interface ImageVersionsResponse {
  versions: ImageVersion[];
  totalCount: number;
  page: number;
  pageSize: number;
}
```

**GitHub Packages API Integration:**

```typescript
// GET /user/packages/container/:package/versions
// Requires: GitHub token with read:packages scope
// Returns: List of package versions with metadata
```

**Caching Strategy:**

- Cache version lists for 5 minutes
- Invalidate cache on entity refresh
- Store in memory (Redis for production)

**Error Handling:**

- Registry unavailable: Show cached data or friendly error
- Authentication failure: Prompt for credentials
- Rate limiting: Show message and retry after delay

### GitHub Actions Integration

**Overview:**

Display GitHub Actions workflow runs directly on ManagedImage entity pages using the official Backstage GitHub Actions plugin. This provides visibility into build status, history, and logs without leaving Backstage.

**Architecture:**

```
ManagedImage Entity Page
    ↓
GitHub Actions Card (from @backstage/plugin-github-actions)
    ↓
Backstage GitHub Integration
    ↓
GitHub Actions API
    ↓
Returns: workflow runs, status, logs
```

**Configuration:**

Entities use standard Backstage annotations to link to workflows:

```yaml
metadata:
  annotations:
    github.com/project-slug: craigedmunds/argocd-eda
    github.com/workflows: backstage.yml
```

**Key Features:**

1. **Workflow Filtering** - Shows only the specific workflow for each image (critical for monorepos)
2. **Status Display** - Success, failure, in-progress with visual indicators
3. **Run Details** - Duration, commit SHA, branch, timestamp
4. **Direct Links** - Click through to GitHub for full logs and details
5. **Re-run Support** - Re-trigger failed builds (with permissions)

**Monorepo Support:**

The `github.com/workflows` annotation filters runs to show only the relevant workflow:
- `backstage.yml` - Shows only Backstage image builds
- `uv.yml` - Shows only UV image builds
- Each entity displays its own build history independently

**Authentication:**

Uses existing GitHub integration configuration:

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
```

**Entity Page Integration:**

Add the GitHub Actions card to ManagedImage entity pages:

```typescript
import { EntityGithubActionsContent } from '@backstage/plugin-github-actions';

// In ManagedImage entity page
<EntitySwitch>
  <EntitySwitch.Case if={isManagedImageEntity}>
    <Grid container spacing={3}>
      <Grid item md={6}>
        <EntityAboutCard />
      </Grid>
      <Grid item md={6}>
        <EntityGithubActionsContent />
      </Grid>
    </Grid>
  </EntitySwitch.Case>
</EntitySwitch>
```

**Benefits:**

- No custom API development needed (uses official plugin)
- Automatic updates when workflows run
- Consistent UI with other Backstage GitHub integrations
- Works seamlessly with existing GitHub authentication
- Supports monorepo workflows through annotation filtering

### Testing Strategy

**Entity Generation Tests:**
- Test ConfigMap generation from state files
- Verify entity structure matches schema
- Test relationship generation

**Backend API Tests:**
- Test all endpoints with various inputs
- Test PR creation logic
- Test error handling
- Test registry API proxying
- Test version fetching from GHCR and Docker Hub
- Test caching behavior

**Frontend Tests:**
- Component unit tests
- Integration tests for entity pages
- E2E tests for enrollment workflow
- Test ImageVersionsCard with mock data
- Test pagination and error states

**Integration Tests:**
- Test complete flow: state → ConfigMap → entity → UI
- Test enrollment flow: UI → API → PR → state → entity
- Verify entity updates when state changes
- Test version fetching end-to-end
