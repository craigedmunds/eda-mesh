# Mono Repository Structure Design

## Overview

This design establishes a clear, consistent structure for the mono repository that houses multiple platform capabilities including Backstage (developer portal), Image Factory (container lifecycle management), and EDA Mesh (event-driven architecture). The design implements a self-managing seed mechanism that enables GitOps management of the platform infrastructure itself, along with branch targeting capabilities for isolated feature development.

## Architecture

### High-Level Structure

```
├── backstage/              # Backstage capability (complete)
│   ├── app/                # Backstage application (from apps/backstage/)
│   │   ├── packages/       # Backstage packages and plugins
│   │   ├── plugins/        # Custom plugins (image-factory, etc.)
│   │   └── app-config.yaml # Backstage configuration
│   ├── kustomize/          # Backstage Kubernetes configs
│   └── README.md           # Backstage documentation
├── image-factory/          # Image Factory capability (complete)
│   ├── app/                # Docker service (from apps/image-factory/)
│   │   ├── app.py          # Python Flask application
│   │   └── pyproject.toml  # Python dependencies
│   ├── state/              # Image state management
│   ├── scripts/            # Operational scripts
│   ├── images.yaml         # Image configuration
│   ├── cdk8s/              # Infrastructure as code (from cdk8s/image-factory/)
│   │   ├── main.py         # CDK8s infrastructure definitions
│   │   └── pyproject.toml  # CDK8s dependencies
│   └── README.md           # Image Factory documentation
├── eda/                    # Event-Driven Architecture capability (complete)
│   ├── mesh/               # EDA mesh business logic
│   │   ├── producers/      # Event producers
│   │   ├── consumers/      # Event consumers
│   │   ├── services/       # Platform services
│   │   └── lobs/           # Line of business applications
│   ├── kustomize/          # EDA Kubernetes configs (mesh, confluent, etc.)
│   ├── helm/               # EDA Helm charts (mesh-consumer, mesh-lob, etc.)
│   └── README.md           # EDA capability documentation
├── apps/                   # Supporting/development applications
│   ├── e2e-test-runner/    # End-to-end testing utilities
│   └── uv/                 # UV service application
├── platform/               # Shared platform infrastructure
│   ├── kustomize/          # Shared Kubernetes configs
│   │   ├── _common/        # Common Kustomize resources
│   │   ├── seed/           # Consolidated bootstrap configuration
│   │   ├── central-secret-store/ # Secret management
│   │   └── kargo/          # Kargo deployment configs
│   └── cdk8s/              # CDK8s infrastructure code
└── seed/                   # DEPRECATED - to be removed after consolidation
```

### Self-Managing Seed Architecture

The repository implements a self-managing seed mechanism that provides:

1. **Manual Bootstrap**: Initial deployment via `kubectl apply -k platform/kustomize/seed/overlays/{environment}`
2. **Self-Management**: The seed creates ArgoCD applications that manage the consolidated seed directory itself
3. **Branch Targeting**: All applications can track specific Git branches for isolated development
4. **Environment Overlays**: Support for environment-specific configurations (local/pi, local/craig, production)

### Bootstrap Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant K8s as Kubernetes
    participant ArgoCD as ArgoCD
    participant Git as Git Repository

    Dev->>K8s: kubectl apply -k platform/kustomize/seed/overlays/local/craig
    K8s->>ArgoCD: Creates ArgoCD + seed applications
    ArgoCD->>Git: Monitors seed/ directory
    Git->>ArgoCD: Detects changes to seed
    ArgoCD->>K8s: Applies seed changes automatically
    Note over ArgoCD,K8s: Self-managing from this point
```

## Components and Interfaces

### Branch Targeting Mechanism

The repository implements a branch targeting system that allows all ArgoCD applications to track a specific Git branch for isolated development. The enhanced mechanism supports both `targetRevision` updates and helm parameter updates using the same value:

```yaml
# platform/kustomize/_common/components/argocd-branch-targetrevision/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

replacements:
  # Update targetRevision for git sources
  - source:
      kind: ConfigMap
      name: argocd-branch-targetrevision
      fieldPath: data.targetRevision
    targets:
      - select:
          kind: Application
          labelSelector: "repo=argocd-eda,argocd-branch-targetrevision=true,argocd-branch-targetrevision-strategy notin (multisource),source-type!=helm"
        fieldPaths:
          - spec.source.targetRevision
      - select:
          kind: Application
          labelSelector: "repo=argocd-eda,argocd-branch-targetrevision=true,argocd-branch-targetrevision-strategy in (multisource),source-type!=helm"
        fieldPaths:
          - spec.sources.*.targetRevision
      - select:
          kind: ApplicationSet
          labelSelector: "repo=argocd-eda,argocd-branch-targetrevision=true,argocd-branch-targetrevision-strategy notin (multisource),source-type!=helm"
        fieldPaths:
          - spec.generators.0.git.revision
          - spec.template.spec.source.targetRevision
      - select:
          kind: ApplicationSet
          labelSelector: "repo=argocd-eda,argocd-branch-targetrevision=true,argocd-branch-targetrevision-strategy in (multisource),source-type!=helm"
        fieldPaths:
          - spec.generators.*.git.revision
          - spec.template.spec.sources.*.targetRevision
  
  # Update helm parameters for branch targeting (using same targetRevision value)
  - source:
      kind: ConfigMap
      name: argocd-branch-targetrevision
      fieldPath: data.targetRevision
    targets:
      - select:
          kind: Application
          labelSelector: "repo=argocd-eda,argocd-branch-targetrevision=true,source-type=helm"
        fieldPaths:
          - spec.source.helm.parameters.[name=feature_branch].value
      - select:
          kind: ApplicationSet
          labelSelector: "repo=argocd-eda,argocd-branch-targetrevision=true,source-type=helm"
        fieldPaths:
          - spec.template.spec.source.helm.parameters.[name=feature_branch].value
```

**Usage in Overlays:**
```yaml
# platform/kustomize/seed/overlays/local/craig/kustomization.yaml
components:
  - ../../../_common/components/argocd-branch-targetrevision

configMapGenerator:
  - name: argocd-branch-targetrevision
    behavior: replace
    literals:
      - targetRevision=feature/backstage-events
```

### Consolidated Seed Structure

```
platform/kustomize/seed/
├── argocd/                         # ArgoCD installation and configuration
│   ├── argocd-namespace.yaml       # ArgoCD namespace
│   ├── argocd-config-map.yaml      # ArgoCD configuration
│   ├── argocd-projects.yaml        # ArgoCD projects
│   └── kustomization.yaml          # ArgoCD resources
├── backstage/                      # Backstage applications
│   ├── backstage-app.yaml          # Main Backstage application
│   ├── backstage-kargo-app.yaml    # Backstage Kargo integration
│   └── kustomization.yaml          # Backstage applications
├── eda/                           # EDA applications  
│   ├── eda-mesh-app.yaml          # EDA mesh application
│   └── kustomization.yaml          # EDA applications
├── image-factory/                 # Image Factory applications
│   ├── image-factory-app.yaml     # Image Factory application
│   └── kustomization.yaml          # Image Factory applications
├── supporting-applications/       # Supporting applications
│   ├── kargo-app.yaml             # Kargo application
│   ├── central-secret-store-app.yaml # Secret management
│   ├── cert-manager-app.yaml      # Certificate management
│   ├── confluent-app.yaml         # Confluent Kafka platform
│   ├── kafka-app.yaml             # Open source Kafka
│   └── kustomization.yaml          # Supporting applications
├── kustomization.yaml             # Main seed kustomization
└── overlays/                      # Environment-specific configs
    ├── local/
    │   ├── pi/                    # Pi environment (full capabilities)
    │   │   └── kustomization.yaml # Includes all components + branch targeting
    │   └── craig/                 # Craig environment (no Image Factory)
    │       └── kustomization.yaml # Excludes Image Factory + branch targeting
    └── production/                # Production environment (core only)
        └── kustomization.yaml     # Core components only
```

### Messaging Infrastructure Components

The platform offers multiple messaging infrastructure options to support demonstrating different technologies, use cases and environment constraints:

#### Confluent Kafka Platform
- **Purpose**: Enterprise-grade Kafka platform with additional tooling and management capabilities
- **Deployment**: ArgoCD application pointing to `eda/kustomize/confluent/`
- **Target Environments**: Development and testing environments where enterprise features are beneficial
- **Configuration**: Kustomize-based configuration with ingress for management interfaces

#### Open Source Kafka
- **Purpose**: Lightweight, single-node Kafka deployment for development and testing
- **Deployment**: ArgoCD application using upstream Helm charts
- **Target Environments**: Resource-constrained development environments
- **Configuration**: Minimal configuration suitable for local development workflows

Both messaging platforms are managed as supporting applications, allowing environment overlays to selectively include them based on requirements and resource constraints.

### CI/CD Testing Architecture

The repository implements a distributed testing approach that enables efficient CI/CD pipelines while maintaining local development parity. **Critical architectural principle: Unit/integration tests validate source code (pre-deployment), acceptance tests validate running systems (post-deployment) - these contexts should never be mixed.**

#### Test Level Organization
```
component/
├── src/                    # Source code
├── tests/                  # Only test types the component needs
│   ├── unit/              # Fast tests, no dependencies (optional)
│   ├── integration/       # Medium speed, internal deps (optional)
│   └── acceptance/        # Slow tests, external deps (optional)
├── Taskfile.yaml          # Component-specific test tasks
└── README.md              # Testing documentation
```

#### Component-Specific Testing
Each component defines only the test tasks it needs:
- `task test:unit` - Fast unit tests (if component has unit tests)
- `task test:integration` - Integration tests (if component has integration tests)
- `task test:acceptance` - End-to-end acceptance tests (if component has acceptance tests)
- `task test:all` - Complete test suite for that component (local development only)

#### Test Execution Contexts
- **Pre-deployment (GitHub Actions)**: Unit + Integration tests only (validates source code)
- **Post-deployment (Kargo verification)**: Acceptance tests only (validates running system)
- **Manual validation (GitHub Actions)**: Acceptance tests only (for debugging deployed systems)
- **Local development**: Any combination via `task test:*` commands

#### Workflow Generation Architecture

Component workflows are generated from `.repo-metadata.yaml` using intelligent test discovery:

**Repository Metadata Structure:**
```yaml
repository:
  name: "argocd-eda"
  type: "mono-repo"
  components:
    - name: "backstage"
      path: "backstage"
      app_path: "backstage/app"
      test_trigger_paths:
        - 'backstage/**'
        - '!backstage/*.md'
        - '!backstage/Taskfile.yaml'
      image:
        registry: "craigedmunds/backstage"
        dockerfile: "backstage/app/packages/backend/Dockerfile"
        context: "backstage/app"
      description: "Internal developer catalog and portal"
      
    - name: "uv"
      path: "apps/uv"
      app_path: "apps/uv"
      test_trigger_paths:
        - 'apps/uv/**'
        - '!apps/uv/*.md'
        - '!apps/uv/Taskfile.yaml'
      image:
        registry: "craigedmunds/uv"
        dockerfile: "apps/uv/Dockerfile"
        context: "apps/uv"
      description: "UV service application"
      
    - name: "eda-mesh"
      path: "eda/mesh"
      app_path: "eda/mesh"
      test_trigger_paths:
        - 'eda/mesh/**'
      # No image section = no image build
      description: "EDA mesh components"
```

**Workflow Generation Structure:**
```
scripts/
├── Taskfile.yaml                    # Python venv management
├── requirements.txt                 # Jinja2, PyYAML dependencies  
├── generate-component-workflows.py  # Main generation script
└── templates/
    ├── component-workflow.yml.j2    # Component workflow template
    └── manual-acceptance.yml.j2     # Manual acceptance template
```

**Scripts Taskfile.yaml:**
```yaml
version: '3'

tasks:
  install:
    desc: Install Python dependencies for workflow generation
    dir: scripts
    cmds:
      - cmd: echo "📦 Installing workflow generation dependencies..."
        silent: true
      - cmd: |
          if [ -n "$CI" ]; then
            # In CI, install directly
            pip install -r requirements.txt
          else
            # Locally, use venv
            python3 -m venv .venv
            .venv/bin/pip install -r requirements.txt
          fi
      - cmd: echo "✅ Dependencies installed"
        silent: true

  generate:
    desc: Generate component workflows from .repo-metadata.yaml
    dir: scripts
    deps: [install]
    cmds:
      - cmd: |
          if [ -n "$CI" ]; then
            python generate-component-workflows.py
          else
            .venv/bin/python generate-component-workflows.py
          fi
```

**Test Capability Discovery:**
The generation script automatically discovers which test types each component supports by:
1. Checking for `tests/unit/`, `tests/integration/`, `tests/acceptance/` directories
2. Parsing `Taskfile.yaml` for `test:unit:`, `test:integration:`, `test:acceptance:` tasks
3. Generating workflows that only include jobs for discovered test capabilities
4. Eliminating "No tests found" messages by not generating non-existent test jobs

**Generated Workflow Structure:**
- **Component workflows**: Auto-generated, trigger on path changes, run fast tests (unit + integration)
- **Manual acceptance workflow**: Single shared workflow with component selection dropdown
- **Reusable workflows**: `_component-test-fast.yml` (pre-deployment), `_component-test-acceptance.yml` (post-deployment)

#### CI/CD Integration Strategy
- **Test Context Separation**: Unit/integration tests run against source code (pre-deployment), acceptance tests run against deployed systems (post-deployment)
- **Local Parity**: Same commands run locally and in CI/CD
- **Path-Based Selective Execution**: Use GitHub Actions `paths:` semantics to trigger tests only for changed components
- **Composable Tests**: Each test level can be run independently
- **Minimal Centralization**: CI/CD workflows delegate to component-specific tasks
- **Component Autonomy**: Each component defines its own test structure and requirements

#### Test Execution Contexts
- **Pre-deployment (GitHub Actions)**: Unit + Integration tests only (validates source code)
- **Post-deployment (Kargo verification)**: Acceptance tests only (validates running system)
- **Manual validation (GitHub Actions)**: Acceptance tests only (for debugging deployed systems)

#### Concrete Implementation Example

**Sample Component Structure (backstage/app/):**
```
backstage/app/
├── src/
├── tests/
│   ├── unit/
│   │   └── test_plugins.py
│   ├── integration/
│   │   └── test_api_integration.py
│   └── acceptance/
│       └── test_ui_flows.py
├── Taskfile.yaml
└── README.md
```

**Component Taskfile.yaml:**
```yaml
# backstage/app/Taskfile.yaml
version: '3'

tasks:
  test:unit:
    desc: "Run unit tests for Backstage app"
    dir: tests/unit
    cmds:
      - pytest --verbose --tb=short

  test:integration:
    desc: "Run integration tests for Backstage app"
    dir: tests/integration
    cmds:
      - pytest --verbose --tb=short --timeout=30

  test:acceptance:
    desc: "Run acceptance tests for Backstage app"
    dir: tests/acceptance
    cmds:
      - playwright test --reporter=line

  test:all:
    desc: "Run all tests for Backstage app"
    deps: [test:unit, test:integration, test:acceptance]
```

**Generated Component Workflow (.github/workflows/backstage.yml):**
```yaml
# Auto-generated from .repo-metadata.yaml
name: Backstage

on:
  push:
    paths:
      - 'backstage/**'
      - '!backstage/*.md'
      - '!backstage/Taskfile.yaml'
      - '.github/workflows/backstage.yml'
  pull_request:
    paths:
      - 'backstage/**'

jobs:
  # Only generated if unit tests discovered
  unit-tests:
    uses: ./.github/workflows/_component-test-fast.yml
    with:
      component-path: 'backstage/app'
      component-name: 'Backstage App'
      test-type: 'unit'

  # Only generated if integration tests discovered  
  integration-tests:
    needs: unit-tests
    uses: ./.github/workflows/_component-test-fast.yml
    with:
      component-path: 'backstage/app'
      component-name: 'Backstage App'
      test-type: 'integration'

  # Build job only generated if build_image: true
  build-and-push:
    needs: [unit-tests, integration-tests]
    uses: ./.github/workflows/_docker-build.yml
    with:
      app_name: 'Backstage'
      image_name: 'craigedmunds/backstage'
      dockerfile: 'backstage/app/packages/backend/Dockerfile'
      context: 'backstage/app'
```

**Manual Acceptance Test Workflow (.github/workflows/manual-acceptance-tests.yml):**
```yaml
name: Manual Acceptance Tests

on:
  workflow_dispatch:
    inputs:
      component:
        description: 'Component to test'
        required: true
        type: choice
        options:
          # Auto-populated from .repo-metadata.yaml components with acceptance tests
          - backstage/app
          - image-factory/app
          - apps/uv
      environment:
        description: 'Target environment'
        required: false
        default: 'local'
        type: choice
        options:
          - local
          - staging

jobs:
  acceptance-tests:
    uses: ./.github/workflows/_component-test-acceptance.yml
    with:
      component-path: ${{ inputs.component }}
      component-name: ${{ inputs.component }}
      environment: ${{ inputs.environment }}
```

#### Synchronization Mechanisms

**1. Command Parity Enforcement:**
- GitHub Actions MUST use `task {test-type}` commands, never inline test commands
- Local development MUST use same `task {test-type}` commands
- All test logic resides in component Taskfile.yaml, not in GitHub Actions

**2. Path-Based Change Detection:**
- Each component has its own GitHub Actions workflow file
- Workflows trigger only when files in that component's directory change
- Path patterns include both source code and the workflow file itself
- This ensures tests run when either code or test configuration changes

**3. Dependency and Environment Consistency:**
- Component Taskfile.yaml defines all dependencies and setup steps
- GitHub Actions workflows delegate setup to Taskfile tasks when needed
- Environment-specific setup (like installing dependencies) happens in Taskfile tasks

**4. Validation Patterns:**
```yaml
# Root-level validation task (Taskfile.yaml)
validate:ci-sync:
  desc: "Validate that all GitHub Actions use task commands"
  cmds:
    - |
      # Check that no workflow files contain inline test commands
      if grep -r "pytest\|npm test\|go test" .github/workflows/; then
        echo "ERROR: Found inline test commands in workflows"
        exit 1
      fi
    - |
      # Check that all workflows use task commands
      if ! grep -r "task test:" .github/workflows/; then
        echo "ERROR: Workflows must use 'task test:' commands"
        exit 1
      fi
```

**5. Component Workflow Template:**
All component workflows follow this pattern:
- Trigger on paths specific to that component
- Use `task` commands exclusively for test execution
- Include the workflow file itself in path triggers
- Run test levels in dependency order (unit → integration → acceptance)
- Use component working directory for all task commands

#### Alternative Approaches for Workflow Organization

**Recommended: Reusable Workflows with Lightweight Component Files**

**Fast Test Workflow (Pre-deployment):**
```yaml
# .github/workflows/_component-test-fast.yml
name: Fast Component Test (Unit + Integration)

on:
  workflow_call:
    inputs:
      component-path:
        required: true
        type: string
        description: 'Path to the component directory (e.g., backstage/app)'
      component-name:
        required: true
        type: string
        description: 'Human-readable component name (e.g., Backstage App)'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: arduino/setup-task@v1
      - name: Run unit tests for ${{ inputs.component-name }}
        run: |
          if [ -f "Taskfile.yaml" ] && grep -q "test:unit:" Taskfile.yaml; then
            task test:unit
          else
            echo "No unit tests found for ${{ inputs.component-name }}"
          fi
        working-directory: ${{ inputs.component-path }}

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    if: hashFiles(format('{0}/tests/integration/**', inputs.component-path)) != ''
    steps:
      - uses: actions/checkout@v4
      - uses: arduino/setup-task@v1
      - name: Run integration tests for ${{ inputs.component-name }}
        run: task test:integration
        working-directory: ${{ inputs.component-path }}
```

**Acceptance Test Workflow (Post-deployment):**
```yaml
# .github/workflows/_component-test-acceptance.yml
name: Acceptance Test (Post-deployment)

on:
  workflow_call:
    inputs:
      component-path:
        required: true
        type: string
        description: 'Path to the component directory (e.g., backstage/app)'
      component-name:
        required: true
        type: string
        description: 'Human-readable component name (e.g., Backstage App)'
      environment:
        required: false
        type: string
        default: 'local'
        description: 'Target environment for acceptance tests'

jobs:
  acceptance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: arduino/setup-task@v1
      - name: Run acceptance tests for ${{ inputs.component-name }}
        run: |
          if [ -f "Taskfile.yaml" ] && grep -q "test:acceptance:" Taskfile.yaml; then
            task test:acceptance
          else
            echo "No acceptance tests found for ${{ inputs.component-name }}"
          fi
        working-directory: ${{ inputs.component-path }}
        env:
          TEST_ENVIRONMENT: ${{ inputs.environment }}
```

**Lightweight Component Workflows:**
```yaml
# .github/workflows/test-backstage-app.yml
name: Test Backstage App

on:
  push:
    paths:
      - 'backstage/app/**'
      - '.github/workflows/test-backstage-app.yml'
      - '.github/workflows/reusable-component-test.yml'
  pull_request:
    paths:
      - 'backstage/app/**'

jobs:
  test:
    uses: ./.github/workflows/reusable-component-test.yml
    with:
      component-path: 'backstage/app'
      component-name: 'Backstage App'
```

```yaml
# .github/workflows/test-image-factory-app.yml
name: Test Image Factory App

on:
  push:
    paths:
      - 'image-factory/app/**'
      - '.github/workflows/test-image-factory-app.yml'
      - '.github/workflows/reusable-component-test.yml'
  pull_request:
    paths:
      - 'image-factory/app/**'

jobs:
  test:
    uses: ./.github/workflows/reusable-component-test.yml
    with:
      component-path: 'image-factory/app'
      component-name: 'Image Factory App'
```

**Benefits of Reusable Workflows:**
- **Minimal duplication**: Core test logic defined once in reusable workflow
- **Lightweight component files**: Each component workflow is ~15 lines
- **Parallel execution**: Still maintains GitHub-native parallel execution
- **Easy maintenance**: Update test logic in one place
- **Consistent behavior**: All components use identical test patterns
- **Path-based triggering**: Each component still triggers independently

**Consolidated Repository Maintenance Workflow:**
```yaml
# .github/workflows/repo-maintenance.yml
name: Repository Maintenance

on:
  pull_request:
    paths:
      - '.repo-metadata.yaml'
      - 'Taskfile.yaml'
      - '.github/workflows/repo-maintenance.yml'
      - 'scripts/generate-*.py'
  workflow_dispatch:     # Allow manual triggering

jobs:
  maintenance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - uses: arduino/setup-task@v1
      
      - name: Generate component workflows
        run: |
          # Generate component test workflows from .repo-metadata.yaml
          python scripts/generate-component-workflows.py
          
      - name: Update taskfile documentation
        run: |
          # Generate/update taskfile steering documentation
          task docs:taskfile
          
      - name: Validate CI/CD synchronization
        run: |
          # Validate that all workflows use task commands
          task validate:ci-sync
          
      - name: Update repository documentation
        run: |
          # Update any auto-generated documentation
          task docs:update
          
      - name: Check for maintenance drift
        run: |
          if ! git diff --quiet; then
            echo "ERROR: Repository maintenance tasks produced changes"
            echo "This indicates the repository is out of sync with its metadata"
            echo "Please run 'task docs:update' locally and commit the changes"
            git diff
            exit 1
          else
            echo "✅ Repository maintenance is up to date"
          fi
```

**Root Taskfile Tasks for Maintenance:**
```yaml
# Root Taskfile.yaml (maintenance tasks)
tasks:
  docs:taskfile:
    desc: "Generate/update the taskfile steering documentation"
    cmds:
      - python scripts/generate-taskfile-docs.py > .kiro/steering/taskfile.md
      
  docs:update:
    desc: "Update all auto-generated documentation"
    deps: [docs:taskfile]
    cmds:
      - echo "All documentation updated"
      
  validate:ci-sync:
    desc: "Validate that all GitHub Actions use task commands"
    cmds:
      - |
        # Check that no workflow files contain inline test commands
        if grep -r "pytest\|npm test\|go test" .github/workflows/ --exclude="*.md"; then
          echo "ERROR: Found inline test commands in workflows"
          exit 1
        fi
      - |
        # Check that all test workflows use task commands
        if ! grep -r "task test:" .github/workflows/ --exclude="*.md" | grep -v "_component-test.yml"; then
          echo "WARNING: Some workflows may not use task commands"
        fi
```

**File Structure with Naming Conventions:**
```
.github/workflows/
├── _component-test.yml             # Reusable component test workflow
├── _kustomize-test.yml             # Reusable kustomize test workflow  
├── test-backstage-app.yml          # Component workflows
├── test-image-factory-app.yml      
├── test-eda-mesh.yml              
└── repo-maintenance.yml            # Consolidated maintenance tasks
```

**Reusable Workflow:**
```yaml
# .github/workflows/_component-test.yml
name: Component Test

on:
  workflow_call:
    inputs:
      component-path:
        required: true
        type: string
        description: 'Path to the component directory (e.g., backstage/app)'
      component-name:
        required: true
        type: string
        description: 'Human-readable component name (e.g., Backstage App)'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: arduino/setup-task@v1
      - name: Run unit tests for ${{ inputs.component-name }}
        run: |
          if [ -f "Taskfile.yaml" ] && grep -q "test:unit:" Taskfile.yaml; then
            task test:unit
          else
            echo "No unit tests found for ${{ inputs.component-name }}"
          fi
        working-directory: ${{ inputs.component-path }}

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    if: hashFiles(format('{0}/tests/integration/**', inputs.component-path)) != ''
    steps:
      - uses: actions/checkout@v4
      - uses: arduino/setup-task@v1
      - name: Run integration tests for ${{ inputs.component-name }}
        run: task test:integration
        working-directory: ${{ inputs.component-path }}

  acceptance-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: hashFiles(format('{0}/tests/acceptance/**', inputs.component-path)) != ''
    steps:
      - uses: actions/checkout@v4
      - uses: arduino/setup-task@v1
      - name: Run acceptance tests for ${{ inputs.component-name }}
        run: task test:acceptance
        working-directory: ${{ inputs.component-path }}
```

**Component Workflow:**
```yaml
# .github/workflows/test-backstage-app.yml
name: Test Backstage App

on:
  push:
    paths:
      - 'backstage/app/**'
      - '.github/workflows/test-backstage-app.yml'
      - '.github/workflows/_component-test.yml'
  pull_request:
    paths:
      - 'backstage/app/**'

jobs:
  test:
    uses: ./.github/workflows/_component-test.yml
    with:
      component-path: 'backstage/app'
      component-name: 'Backstage App'
```

**Additional Reusable Workflows:**
```yaml
# .github/workflows/_kustomize-test.yml
name: Kustomize Test

on:
  workflow_call:
    inputs:
      kustomize-path:
        required: true
        type: string

jobs:
  kustomize-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test kustomize build
        run: kustomize build .
        working-directory: ${{ inputs.kustomize-path }}
```

#### Local Change Detection and Testing

**Root-Level Tasks for Change Detection:**
```yaml
# Root Taskfile.yaml
tasks:
  test:changed:
    desc: "Run tests for components that have changed compared to main"
    cmds:
      - |
        # Get list of changed files compared to main
        CHANGED_FILES=$(git diff --name-only origin/main...HEAD)
        
        # Determine which components have changes
        COMPONENTS=""
        if echo "$CHANGED_FILES" | grep -q "^backstage/app/"; then
          COMPONENTS="$COMPONENTS backstage/app"
        fi
        if echo "$CHANGED_FILES" | grep -q "^image-factory/app/"; then
          COMPONENTS="$COMPONENTS image-factory/app"
        fi
        if echo "$CHANGED_FILES" | grep -q "^eda/mesh/"; then
          COMPONENTS="$COMPONENTS eda/mesh"
        fi
        
        # Run tests for each changed component
        for component in $COMPONENTS; do
          echo "Running tests for $component"
          (cd "$component" && task test:all)
        done

  test:changed:unit:
    desc: "Run unit tests for components that have changed"
    cmds:
      - |
        # Similar logic but only run unit tests
        CHANGED_FILES=$(git diff --name-only origin/main...HEAD)
        # ... (same detection logic)
        for component in $COMPONENTS; do
          if [ -f "$component/Taskfile.yaml" ] && grep -q "test:unit" "$component/Taskfile.yaml"; then
            echo "Running unit tests for $component"
            (cd "$component" && task test:unit)
          fi
        done

  test:all:
    desc: "Run all tests for all components (full test suite)"
    cmds:
      - task: backstage/app:test:all
      - task: image-factory/app:test:all
      - task: eda/mesh:test:all
```

**Enhanced Component Detection Script:**
```bash
#!/bin/bash
# scripts/detect-changed-components.sh

# Get changed files compared to main branch
CHANGED_FILES=$(git diff --name-only origin/main...HEAD)

# Define component mappings
declare -A COMPONENT_PATHS=(
  ["backstage/app"]="backstage-app"
  ["image-factory/app"]="image-factory-app"
  ["eda/mesh"]="eda-mesh"
  ["platform/kustomize"]="platform-kustomize"
)

CHANGED_COMPONENTS=()

for path in "${!COMPONENT_PATHS[@]}"; do
  if echo "$CHANGED_FILES" | grep -q "^$path/"; then
    CHANGED_COMPONENTS+=("${COMPONENT_PATHS[$path]}")
  fi
done

# Output as JSON array for GitHub Actions
printf '%s\n' "${CHANGED_COMPONENTS[@]}" | jq -R . | jq -s .
```

### Application Structure Standards

Each application in `apps/` follows consistent patterns:
- **Source code** in language-appropriate structure
- **Tests** co-located with source using `.test.{ext}` suffix
- **README.md** explaining the application purpose and setup
- **Dockerfile** for containerization
- **Configuration files** in root or `config/` directory

### Infrastructure Structure Standards

Each service in `kustomize/` follows Kustomize patterns:
- **base/** directory with core resource definitions
- **overlays/** directory for environment-specific modifications
- **kustomization.yaml** files defining resource composition
- **README.md** explaining the service and deployment

## Data Models

### Repository Metadata

```yaml
# .repo-metadata.yaml (new file)
repository:
  name: "argocd-eda"
  type: "mono-repo"
  capabilities:
    - name: "backstage"
      type: "capability"
      path: "backstage"
      infrastructure: "backstage/kustomize"
      description: "Internal developer catalog and portal"
      production: true
    - name: "image-factory"
      type: "capability"
      path: "image-factory"
      infrastructure: "image-factory/kustomize"
      description: "Container lifecycle management system"
      production: true
    - name: "eda"
      type: "capability"
      path: "eda"
      infrastructure: "eda/kustomize"
      description: "Event-driven architecture platform"
      production: true
  supporting_apps:
    - name: "e2e-test-runner"
      path: "apps/e2e-test-runner"
      description: "End-to-end testing utilities"
      production: false
    - name: "uv"
      path: "apps/uv"
      description: "UV service application"
      production: false
  bootstrap:
    command: "kubectl apply -k platform/kustomize/seed/overlays/{environment}"
    environments:
      local:
        pi: "kubectl apply -k platform/kustomize/seed/overlays/local/pi/"
        craig: "kubectl apply -k platform/kustomize/seed/overlays/local/craig/"
      production: "kubectl apply -k platform/kustomize/seed/overlays/production/"
```

### ArgoCD Application Template

```yaml
# Template for all ArgoCD applications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${APP_NAME}
  namespace: argocd
  labels:
    repo: argocd-eda
    capability: ${CAPABILITY}
spec:
  project: eventing
  source:
    repoURL: https://github.com/craigedmunds/argocd-eda
    path: kustomize/${APP_NAME}
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: ${TARGET_NAMESPACE}
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
    automated:
      prune: true
      selfHeal: true
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing the prework analysis, several properties can be consolidated:
- Properties 1.2, 1.3, 1.4, 1.5 all relate to structural consistency and can be combined into comprehensive structural validation properties
- Properties 2.2, 2.3, 2.4, 2.5 all relate to seed configuration correctness and can be combined
- Properties 2.6, 2.7, 2.8 all relate to self-managing seed behavior and can be combined
- Properties 5.1, 5.2, 5.3, 5.4, 5.5 all relate to branch targeting functionality and can be combined

**Property 1: Repository Structure Consistency**
*For any* major directory in the repository, it should follow consistent organizational patterns with appropriate Kustomize base/overlay structure, consistent naming conventions, co-located tests, and README documentation
**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

**Property 2: Seed Configuration Completeness**
*For any* environment overlay, the seed should contain all necessary ArgoCD applications without duplication, include all bootstrap resources, and support environment-specific variations
**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

**Property 3: Self-Managing Seed Behavior**
*For any* seed deployment, applying the seed should create ArgoCD applications that manage the seed directory itself, and subsequent changes to seed configuration should be automatically detected and applied by ArgoCD
**Validates: Requirements 2.6, 2.7, 2.8**

**Property 4: Branch Targeting Functionality**
*For any* ArgoCD application labeled with repo=argocd-eda, when a target revision ConfigMap is configured, the application should use the specified target revision regardless of whether it's a single-source, multi-source, Application, or ApplicationSet resource, and helm applications should have their feature_branch parameter updated to match the target revision
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**

**Property 5: Component Documentation Linking**
*For any* major component, its documentation should include links to detailed README files and relevant specifications
**Validates: Requirements 3.2**

**Property 6: Overlay Pattern Support**
*For any* service with multiple environments, it should support independent deployment through properly structured overlay patterns
**Validates: Requirements 4.2**

**Property 7: Messaging Infrastructure Options**
*For any* messaging infrastructure deployment, the system should provide both enterprise (Confluent) and open source Kafka options as supporting applications
**Validates: Requirements 6.1, 6.2**

**Property 8: Kafka Configuration Appropriateness**
*For any* open source Kafka deployment, the configuration should specify single-node setup suitable for development environments
**Validates: Requirements 6.3**

**Property 9: Selective Messaging Deployment**
*For any* environment overlay, it should be able to selectively include or exclude messaging infrastructure components based on environment requirements
**Validates: Requirements 6.4**

**Property 10: Messaging Application Consistency**
*For any* messaging infrastructure ArgoCD application, it should follow the same structural patterns and labeling conventions as other supporting applications
**Validates: Requirements 6.5**

**Property 11: Test Level Organization**
*For any* component with tests, it should organize tests into unit, integration, and acceptance levels with appropriate directory structure and clear separation of dependencies
**Validates: Requirements 7.1**

**Property 12: Local-CI/CD Test Parity**
*For any* component with tests, the Taskfile commands used for local testing should be the same as those referenced in CI/CD pipeline configurations
**Validates: Requirements 7.2**

**Property 13: Component Test Isolation**
*For any* component, its test execution should be independent and not require running tests from other components to validate its functionality
**Validates: Requirements 7.3**

**Property 14: Decentralized Test Configuration**
*For any* component with tests, all test configuration and execution logic should be located within the component directory rather than in centralized CI/CD workflow files
**Validates: Requirements 7.4**

**Property 15: Minimal Centralized Workflows**
*For any* CI/CD workflow file, it should delegate to component-specific test processes rather than containing inline test logic, keeping centralized workflow files minimal
**Validates: Requirements 7.5**

**Property 16: Composable Test Execution**
*For any* component with tests, it should provide separate, independently executable tasks for unit tests, integration tests, and acceptance tests
**Validates: Requirements 7.6**

## Error Handling

### Migration Error Scenarios

1. **ArgoCD Application Conflicts**
   - **Scenario**: Existing applications conflict during consolidation
   - **Resolution**: Pause existing applications, apply consolidated structure, resume with new paths

2. **Missing Resources**
   - **Scenario**: Resources missing after consolidation
   - **Resolution**: Validate all resources exist in consolidated structure before migration

3. **Overlay Conflicts**
   - **Scenario**: Environment overlays conflict with base configuration
   - **Resolution**: Use Kustomize validation to ensure overlay compatibility

### Documentation Validation

1. **Missing README Files**
   - **Detection**: Automated checks for README presence in major directories
   - **Resolution**: Generate template README files with component descriptions

2. **Broken Links**
   - **Detection**: Link validation in documentation
   - **Resolution**: Update links to point to correct locations after consolidation

## Testing Strategy

### Unit Testing
- **Repository Structure Validation**: Tests to verify directory organization follows standards
- **Kustomize Configuration Tests**: Validate that Kustomize builds succeed for all overlays
- **Documentation Link Tests**: Verify all internal links in documentation are valid

### Property-Based Testing
- **Structural Consistency Properties**: Generate random directory structures and validate they follow organizational patterns
- **Seed Configuration Properties**: Generate various environment configurations and validate completeness
- **Overlay Pattern Properties**: Generate overlay combinations and validate they produce valid Kubernetes resources

### Integration Testing
- **Bootstrap Process Testing**: Test complete cluster bootstrap from consolidated seed
- **ArgoCD Application Sync Testing**: Verify all applications sync successfully after consolidation
- **Cross-Component Integration**: Test that applications can discover and interact with each other

### End-to-End Testing
- **Complete Platform Deployment**: Deploy entire platform from consolidated structure
- **Multi-Environment Testing**: Validate different environment overlays work correctly
- **Documentation Navigation**: Test that documentation provides clear navigation paths between components

The testing approach will use **pytest** for Python components and **bash/kubectl** for Kubernetes validation, with property-based testing implemented using **Hypothesis** for Python tests and **custom generators** for Kubernetes resource validation.