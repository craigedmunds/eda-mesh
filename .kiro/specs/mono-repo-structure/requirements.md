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
6. WHEN applications use Helm charts with branch parameters, THEN the Branch_Targeting_Mechanism SHALL update helm parameter values to match the target revision
7. WHEN the branch targeting component is configured, THEN it SHALL use a generic parameter name "feature_branch" instead of service-specific parameter names
8. WHEN helm applications have branch-related parameters, THEN they SHALL be automatically updated by the branch targeting component without requiring manual patches

### Requirement 6

**User Story:** As a platform engineer, I want to provide multiple messaging infrastructure options, so that developers can choose the appropriate messaging solution for their use case and environment constraints.

#### Acceptance Criteria

1. WHEN supporting messaging infrastructure, THE System SHALL provide both enterprise and open source Kafka options
2. WHEN deploying Confluent Kafka, THE System SHALL treat it as a supporting application available in development environments
3. WHEN deploying open source Kafka, THE System SHALL provide a simple single-node configuration suitable for development and testing
4. WHEN configuring environment overlays, THE System SHALL allow selective deployment of messaging infrastructure based on environment needs
5. WHEN managing supporting applications, THE System SHALL maintain consistent ArgoCD application patterns for all messaging infrastructure components

### Requirement 7

**User Story:** As a developer, I want automated testing workflows that run efficiently in CI/CD pipelines, so that I can get fast feedback on changes and ensure code quality without running unnecessary tests.

#### Acceptance Criteria

1. WHEN tests are organized, THE System SHALL support multiple test levels from fastest (unit tests with no dependencies) to medium speed (integration tests with internal dependencies) to slowest (acceptance tests with external dependencies and/or browser-based testing) where each component includes only the test levels it requires
2. WHEN running tests locally, THE System SHALL provide the same test processes via Taskfile commands as those used in CI/CD pipeline checks
3. WHEN changes are made to a component, THE System SHALL run only tests appropriate to that component by default rather than all repository tests using path-based change detection
4. WHEN test processes are defined for each component, THE System SHALL locate test configuration and execution solely within that component directory rather than in centralized CI/CD workflow files
5. WHEN CI/CD workflows are created, THE System SHALL minimize the number of centralized workflow files by using component-specific test processes and support path-based triggering for selective execution
6. WHEN tests are executed, THE System SHALL support running unit tests, integration tests, and acceptance tests as separate, composable operations where each component defines only the test types it needs
7. WHEN pipeline checks are configured, THE System SHALL use path-based change detection to determine which components have changed and run appropriate tests for those components only