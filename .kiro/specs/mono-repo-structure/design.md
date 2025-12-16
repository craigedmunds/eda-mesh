# Mono Repository Structure Design

## Overview

This design establishes a clear, consistent structure for the mono repository that houses multiple platform capabilities including Backstage (developer portal), Image Factory (container lifecycle management), and EDA Mesh (event-driven architecture). The design focuses on consolidating the current dual seed structure into a single entry point while maintaining clear separation of concerns and enabling efficient GitOps workflows.

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

### Consolidation Strategy

The current structure has unnecessary duplication between `./seed` and `./kustomize/seed`. The consolidation will:

1. **Merge seed configurations** into `./kustomize/seed` as the single source of truth
2. **Eliminate duplicate ArgoCD applications** (seed-application and kustomize-seed-application)
3. **Provide single bootstrap command** via `kubectl apply -k kustomize/seed/overlays/{environment}`
4. **Maintain overlay support** for environment-specific configurations

## Components and Interfaces

### Seed Structure (Consolidated)

```
platform/kustomize/seed/
├── argocd/
│   ├── kustomization.yaml          # ArgoCD installation configuration
│   ├── argocd-namespace.yaml       # ArgoCD namespace with labels
│   └── argocd-install.yaml         # ArgoCD installation
├── eda/
│   ├── eda-mesh-app.yaml
│   └── kustomization.yaml
├── backstage/
│   ├── backstage-app.yaml
│   ├── backstage-kargo-app.yaml
│   └── kustomization.yaml
├── image-factory/
│   ├── image-factory-app.yaml
│   └── kustomization.yaml
├── supporting-applications/
│   ├── central-secret-store-app.yaml
│   ├── kargo-app.yaml
│   ├── e2e-test-runner-app.yaml
│   └── kustomization.yaml
└── overlays/
    ├── local/
    │   ├── pi/                     # Pi environment overlay
    │   │   └── kustomization.yaml  # Includes: argocd + eda + backstage + image-factory + supporting-applications
    │   └── craig/                  # Craig environment overlay
    │       └── kustomization.yaml  # Includes: argocd + eda + backstage + supporting-applications
    └── production/                 # Production overlay
        └── kustomization.yaml      # Includes: eda + backstage + image-factory (no supporting apps)
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
    command: "kubectl apply -k kustomize/seed/overlays/local"
    environments:
      - "local"
      - "production"
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
- Property 4.2 stands alone as it specifically addresses overlay pattern support

**Property 1: Repository Structure Consistency**
*For any* major directory in the repository, it should follow consistent organizational patterns with appropriate Kustomize base/overlay structure, consistent naming conventions, co-located tests, and README documentation
**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

**Property 2: Seed Configuration Completeness**
*For any* environment overlay, the consolidated seed should contain all necessary ArgoCD applications without duplication, include all bootstrap resources, and support environment-specific variations
**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

**Property 3: Component Documentation Linking**
*For any* major component, its documentation should include links to detailed README files and relevant specifications
**Validates: Requirements 3.2**

**Property 4: Overlay Pattern Support**
*For any* service with multiple environments, it should support independent deployment through properly structured overlay patterns
**Validates: Requirements 4.2**

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