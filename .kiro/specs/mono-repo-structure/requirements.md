# Mono Repo Structure Requirements

## Introduction

This specification defines the organizational structure and conventions for the mono repository containing Kubernetes applications, infrastructure code, and supporting tools. The repository should maintain clear separation of concerns while enabling efficient development workflows and GitOps practices.

## Glossary

- **Mono Repository**: A single repository containing multiple related projects and applications
- **Kustomize Structure**: Directory organization following Kustomize base/overlay patterns
- **Seed Directory**: Bootstrap configuration for initial cluster setup and ArgoCD applications
- **GitOps Workflow**: Development approach where Git commits trigger automated deployments
- **Base Configuration**: Reusable Kubernetes resource definitions
- **Overlay Configuration**: Environment-specific modifications to base configurations
- **Self_Managing_Seed**: ArgoCD application that manages the seed directory itself after initial bootstrap
- **Branch_Targeting_Mechanism**: System for directing all ArgoCD applications to track a specific Git branch
- **Target_Revision_ConfigMap**: ConfigMap containing the Git branch/tag that all applications should track
- **Bootstrap_Applications**: ArgoCD applications created during initial seed deployment that manage subsequent changes

## Requirements

### Requirement 1

**User Story:** As a developer, I want a clear and consistent directory structure, so that I can easily locate, understand, and contribute to any part of the system.

#### Acceptance Criteria

1. WHEN organizing code, THE System SHALL separate application code from infrastructure code in distinct top-level directories
2. WHEN organizing Kubernetes resources, THE System SHALL follow consistent Kustomize base/overlay patterns
3. WHEN projects are structured, THE System SHALL follow consistent naming conventions across all directories
4. WHEN tests are written, THE System SHALL co-locate them with the code they test
5. WHEN documentation is created, THE System SHALL co-locate documentation with relevant code and maintain README files in each major directory
6. WHEN repository-wide documentation is created, THE System SHALL maintain a comprehensive root README that articulates the overall solution with C4 architecture diagrams

### Requirement 2

**User Story:** As a platform engineer, I want a single entry point I can run, so that I can bootstrap new clusters with a single command and have the seed be self-managing thereafter.

#### Acceptance Criteria

1. WHEN bootstrapping a cluster, THE System SHALL require only one manual kubectl apply command
2. WHEN seed configurations are applied, THE System SHALL create all necessary ArgoCD applications from a single location
3. WHEN ArgoCD applications are defined, THE System SHALL eliminate duplicate application definitions
4. WHEN cluster configuration is managed, THE System SHALL include all bootstrap resources in the seed structure
5. WHERE overlays exist for seed configurations, THE System SHALL support environment-specific bootstrap variations
6. WHEN the initial seed is applied manually, THEN the System SHALL create a Bootstrap_Application that manage the seed directory itself
7. WHEN changes are made to the seed configuration, THEN ArgoCD SHALL automatically detect and apply those changes without manual kubectl commands
8. WHEN the seed creates ArgoCD applications, THEN it SHALL create a self-managing seed application that manages the unified seed directory containing both ArgoCD application definitions and platform components

### Requirement 3

**User Story:** As a developer or platform engineer, I want comprehensive documentation that explains the overall architecture and components, so that I can understand how the system works and how components relate to each other.

#### Acceptance Criteria

1. WHEN viewing the root README, THE System SHALL provide an overall solution summary with C4 architecture diagrams showing system context and component relationships
2. WHEN documenting components, THE System SHALL summarize each major component (Backstage, Image Factory, EDA Mesh) with links to detailed README files and relevant specs
3. WHEN describing the Backstage application, THE System SHALL explain its role as an internal developer catalog built with GitHub Actions and deployed with Kargo and ArgoCD
4. WHEN describing the Image Factory, THE System SHALL explain its role in building helper Docker images for use in Kubernetes and local testing environments
5. WHEN describing the EDA Mesh capability, THE System SHALL explain it as one of the platform capabilities that provides event-driven architecture patterns, separating responsibilities between event producers, platform interaction, platform services, and event consumption

### Requirement 4

**User Story:** As a platform engineer, I want efficient GitOps workflows, so that changes to infrastructure and applications can be deployed automatically and safely.

#### Acceptance Criteria

1. WHEN code changes are committed, THE System SHALL enable ArgoCD to detect and sync changes automatically
2. WHEN multiple environments exist, THE System SHALL support independent deployment pipelines through overlay patterns
3. WHEN configuration changes are made, THE System SHALL maintain traceability from Git commits to deployed resources
4. WHEN conflicts occur during sync, THE System SHALL provide clear resolution paths
5. WHERE manual intervention is needed, THE System SHALL minimize the scope and frequency of manual operations

### Requirement 5

**User Story:** As a developer working on feature branches, I want all ArgoCD applications to track the same Git branch, so that I can test infrastructure changes in isolation without affecting other environments.

#### Acceptance Criteria

1. WHEN working on a feature branch, THEN the Branch_Targeting_Mechanism SHALL allow all applications to track that specific branch
2. WHEN the Target_Revision_ConfigMap is configured, THEN all ArgoCD applications with appropriate labels SHALL use the specified target revision
3. WHEN applications support branch targeting, THEN they SHALL be labeled with repo=argocd-eda to enable the targeting mechanism
4. WHEN using the branch targeting component, THEN it SHALL support both single-source and multi-source ArgoCD applications
5. WHEN branch targeting is applied, THEN it SHALL work for both Application and ApplicationSet resources