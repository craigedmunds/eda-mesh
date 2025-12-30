# Image Factory - Requirements

## Introduction

When public container base images are updated, our internal images that depend on them become stale and potentially vulnerable. We need an automated system to monitor upstream base images, track dependencies, and orchestrate rebuilds of our internal images with appropriate delays to allow the community to discover vulnerabilities.

## Glossary

- **System**: The Image Factory automated rebuild system
- **Managed Image**: A container image we build and maintain in our repositories
- **Base Image**: An upstream container image that our managed images depend on (automatically discovered)
- **Enrollment**: Registering a managed image for automated tracking and rebuilds
- **Rebuild Delay**: Configurable waiting period after base image updates before triggering rebuilds
- **Dependency**: Relationship between a managed image and its base image

## Requirements

### Requirement 1: Managed Image Enrollment

**User Story:** As a developer, I want to enroll my container images for automated tracking, so that they stay up-to-date with their base images.

#### Acceptance Criteria

1. WHEN a developer enrolls a managed image with source repository information, THEN the System SHALL track that image for rebuild orchestration
2. WHEN an enrollment specifies a rebuild delay period, THEN the System SHALL wait that period after base image updates before triggering rebuilds
3. WHEN an enrollment specifies auto-rebuild as enabled, THEN the System SHALL automatically trigger rebuilds when conditions are met
4. WHEN an enrollment specifies auto-rebuild as disabled, THEN the System SHALL NOT automatically trigger rebuilds
5. WHEN an enrollment specifies a build workflow, THEN the System SHALL use that workflow for triggering rebuilds

### Requirement 2: Dependency Discovery

**User Story:** As a developer, I want the system to automatically discover which base images my containers depend on, so that I don't have to manually specify dependencies.

#### Acceptance Criteria

1. WHEN a managed image is enrolled, THEN the System SHALL analyze the image source to discover base image dependencies
2. WHEN a base image dependency is discovered, THEN the System SHALL track that base image for updates
3. WHEN a base image is updated, THEN the System SHALL identify all managed images that depend on it
4. WHEN dependencies change, THEN the System SHALL update the dependency tracking
5. WHEN a managed image has no discoverable dependencies, THEN the System SHALL record that state
6. WHEN analyzing multi-stage Dockerfiles, THEN the System SHALL track all base images from all FROM statements
7. WHEN multiple FROM statements reference the same base image, THEN the System SHALL track it only once per managed image

### Requirement 3: Base Image Monitoring

**User Story:** As a security engineer, I want upstream base images monitored for updates, so that I can rebuild dependent images with security patches.

#### Acceptance Criteria

1. WHEN a base image is tracked, THEN the System SHALL monitor the container registry for digest changes
2. WHEN a base image digest changes, THEN the System SHALL record the update with timestamp
3. WHEN a base image updates, THEN the System SHALL preserve the update history
4. WHEN monitoring base images, THEN the System SHALL use event-driven mechanisms without continuous polling
5. WHEN a base image update is detected, THEN the System SHALL make that information available for rebuild decisions
6. WHEN monitoring base images (unmanaged upstream images), THEN the System SHALL limit checks to once per day maximum to avoid rate limiting
7. WHEN configuring Kargo Warehouses for base images, THEN the System SHALL set refresh intervals to 24 hours to respect rate limits
8. WHEN multiple base images from the same registry are monitored, THEN the System SHALL coordinate Warehouse configurations to minimize total registry requests

### Requirement 4: Rebuild Orchestration

**User Story:** As a developer, I want dependent images automatically rebuilt when base images update, so that my images stay current without manual intervention.

#### Acceptance Criteria

1. WHEN a base image updates and the rebuild delay has elapsed, THEN the System SHALL trigger rebuilds of dependent managed images
2. WHEN triggering a rebuild, THEN the System SHALL invoke the configured build workflow for that image
3. WHEN a rebuild is triggered, THEN the System SHALL pass context about which base image triggered the rebuild
4. WHEN multiple base images update, THEN the System SHALL coordinate rebuilds to avoid redundant builds
5. WHEN a rebuild completes, THEN the System SHALL record the rebuild timestamp and result

### Requirement 5: State Tracking

**User Story:** As a platform engineer, I want image state tracked persistently, so that I have an audit trail and can recover from failures.

#### Acceptance Criteria

1. WHEN the System processes an image, THEN the System SHALL persist the current state
2. WHEN state is updated, THEN the System SHALL preserve historical data including digests and timestamps
3. WHEN configuration changes, THEN the System SHALL merge new configuration with existing runtime data
4. WHEN state is persisted, THEN the System SHALL store it in a version-controlled repository
5. WHEN state is retrieved, THEN the System SHALL provide both configuration and runtime data

### Requirement 6: Configuration Management

**User Story:** As a platform engineer, I want all configuration managed through version control, so that changes are auditable and recoverable.

#### Acceptance Criteria

1. WHEN a developer enrolls an image, THEN the enrollment SHALL be recorded in a version-controlled configuration file
2. WHEN configuration changes, THEN the changes SHALL be committed to version control with descriptive messages
3. WHEN the System updates state, THEN the updates SHALL be committed to version control
4. WHEN configuration is applied, THEN the System SHALL use the version from the repository
5. WHEN configuration conflicts occur, THEN the configuration file SHALL take precedence over runtime state

### Requirement 7: Image Lifecycle Management

**User Story:** As a developer, I want to change image enrollment without losing tracking data, so that I can adapt to changing requirements.

#### Acceptance Criteria

1. WHEN a base image is promoted to managed by enrolling it with source information, THEN the System SHALL begin tracking it as a managed image
2. WHEN a managed image is demoted by removing it from enrollment, THEN the System SHALL continue monitoring it as a base image if other images depend on it
3. WHEN an image transitions between managed and base, THEN the System SHALL preserve historical tracking data
4. WHEN an image is removed from enrollment and has no dependents, THEN the System SHALL archive the tracking data to an _archive directory
5. WHEN a previously enrolled image is re-enrolled, THEN the System SHALL restore archived tracking data if available, otherwise create new tracking state
6. WHEN archiving image data, THEN the System SHALL preserve all historical information including digests, timestamps, and update history
7. WHEN restoring archived data, THEN the System SHALL validate that the restored state is compatible with current configuration

### Requirement 8: Error Handling

**User Story:** As a platform engineer, I want the system to handle errors gracefully, so that transient failures don't break the entire workflow.

#### Acceptance Criteria

1. WHEN dependency discovery fails for one image, THEN the System SHALL continue processing other images
2. WHEN a rebuild trigger fails, THEN the System SHALL log the error with sufficient detail for debugging
3. WHEN monitoring detects an error, THEN the System SHALL record the error state and continue monitoring other images
4. WHEN configuration is invalid, THEN the System SHALL report specific validation errors
5. WHEN transient failures occur, THEN the System SHALL retry with appropriate backoff

### Requirement 9: Multi-Repository Support

**User Story:** As a platform engineer, I want to support images across multiple repositories and teams, so that the system scales across the organization.

#### Acceptance Criteria

1. WHEN images are enrolled from different source repositories, THEN the System SHALL track all of them
2. WHEN images use different container registries, THEN the System SHALL monitor all registries
3. WHEN images use different build systems, THEN the System SHALL support triggering builds in each system
4. WHEN teams manage their own images, THEN the System SHALL support distributed enrollment
5. WHEN images have different rebuild policies, THEN the System SHALL apply policies independently per image

### Requirement 10: Observability

**User Story:** As a platform engineer, I want visibility into system operations, so that I can monitor health and troubleshoot issues.

#### Acceptance Criteria

1. WHEN the System performs operations, THEN the System SHALL log activities with appropriate detail
2. WHEN errors occur, THEN the System SHALL log errors with context for troubleshooting
3. WHEN images are rebuilt, THEN the System SHALL record rebuild events with timestamps and outcomes
4. WHEN base images update, THEN the System SHALL record update events with digest information
5. WHEN querying system state, THEN the System SHALL provide current status for all tracked images

### Requirement 11: Backstage Integration

**User Story:** As a developer, I want to visualize image relationships and dependencies in Backstage, so that I can understand the impact of base image updates and navigate the image catalog.

#### Acceptance Criteria

1. WHEN a managed image is enrolled, THEN the System SHALL create a Backstage entity representing that image
2. WHEN a base image is discovered, THEN the System SHALL create a Backstage entity representing that base image
3. WHEN dependencies exist between images, THEN the System SHALL represent those relationships in Backstage entity metadata
4. WHEN viewing an image in Backstage, THEN users SHALL see the image's base dependencies and dependent images
5. WHEN viewing an image in Backstage, THEN users SHALL see current state including digest, last build time, and rebuild status
6. WHEN base image updates occur, THEN the Backstage entities SHALL reflect the updated state
7. WHEN navigating the Backstage catalog, THEN users SHALL be able to filter and search for images by type, registry, or dependency
8. WHEN viewing dependency graphs, THEN users SHALL see visual representations of image relationships
9. WHEN a developer creates a managed image through Backstage, THEN the System SHALL enroll that image in the configuration
10. WHEN creating a managed image through Backstage, THEN the developer SHALL provide required information including name, registry, repository, source location, and rebuild policies
11. WHEN a managed image is created through Backstage, THEN the System SHALL commit the enrollment to version control and trigger initial analysis

### Requirement 12: Container Registry Integration

**User Story:** As a developer, I want to view container image versions and tags directly in Backstage, so that I can see the version history and select specific versions without leaving the portal.

#### Acceptance Criteria

1. WHEN viewing a managed image in Backstage, THEN the System SHALL display available image tags from the container registry
2. WHEN viewing image tags, THEN the System SHALL display tag name, digest, published date, and platform information for each version
3. WHEN a managed image is stored in GitHub Container Registry, THEN the System SHALL use the GitHub Packages API to retrieve version information through backend proxy
4. WHEN a managed image is stored in Docker Hub, THEN the System SHALL use the Docker Hub API to retrieve version information through backend proxy
5. WHEN viewing image versions, THEN the System SHALL filter out non-semantic version tags (SHA tags, "latest", "main", etc.) to show only meaningful versions
6. WHEN viewing image versions, THEN the System SHALL display the versions in reverse chronological order with the most recent first
7. WHEN the container registry is unavailable, THEN the System SHALL display cached version information or a clear error message with retry option
8. WHEN viewing an image version, THEN users SHALL be able to copy the full image reference including both tag and digest formats
9. WHEN multiple pages of versions exist, THEN the System SHALL provide pagination controls to navigate through all versions
10. WHEN viewing image versions, THEN users SHALL be able to refresh the data manually to get the latest versions
11. WHEN clicking on version information, THEN users SHALL be able to navigate to the registry page for that specific version

### Requirement 13: Build Pipeline Visibility

**User Story:** As a developer, I want to view GitHub Actions workflow runs for my container images in Backstage, so that I can monitor build status and troubleshoot failures without leaving the portal.

#### Acceptance Criteria

1. WHEN viewing a managed image in Backstage, THEN the System SHALL display recent GitHub Actions workflow runs for that image's build workflow
2. WHEN viewing workflow runs, THEN the System SHALL display run status, commit SHA, commit message, and relative timestamp for each run
3. WHEN a managed image is built by a specific workflow in a monorepo, THEN the System SHALL filter workflow runs to show only that specific workflow
4. WHEN viewing a workflow run, THEN users SHALL be able to click through to view the full run details on GitHub
5. WHEN a workflow run has a commit SHA, THEN the System SHALL provide clickable links to the commit on GitHub
6. WHEN workflow runs have long commit messages, THEN the System SHALL truncate them with tooltips showing the full message
7. WHEN a workflow run fails, THEN the System SHALL display the failure status prominently with appropriate error icons
8. WHEN a workflow run is in progress, THEN the System SHALL display the current status with running indicators
9. WHEN viewing workflow runs, THEN the System SHALL display the most recent runs first with pagination for older runs
10. WHEN a user has appropriate permissions, THEN the System SHALL provide the ability to re-run failed workflows
11. WHEN a user navigates to the CI/CD tab on an image, THEN authentication credentials SHALL NOT be required from the user
12. WHEN accessing GitHub APIs, THEN the System SHALL use backend proxy with service credentials, not user-level OAuth
13. WHEN GitHub API calls fail, THEN the System SHALL provide clear error messages and retry mechanisms
14. WHEN formatting timestamps, THEN the System SHALL use relative time format (e.g., "2h ago", "yesterday") for better user experience

### Requirement 15: Critical Security Response

**User Story:** As a security engineer, I want to bypass normal rebuild delays for critical security vulnerabilities, so that urgent patches can be deployed immediately.

#### Acceptance Criteria

1. WHEN a critical CVE is identified in a base image, THEN the System SHALL support immediate rebuild triggers that bypass configured rebuild delays
2. WHEN triggering an emergency rebuild, THEN the System SHALL log the security justification and override reason
3. WHEN multiple images are affected by the same CVE, THEN the System SHALL coordinate emergency rebuilds to prioritize critical applications
4. WHEN an emergency rebuild is triggered, THEN the System SHALL notify relevant teams through configured channels
5. WHEN emergency rebuilds complete, THEN the System SHALL resume normal rebuild delay policies for subsequent updates
6. WHEN configuring emergency rebuild capabilities, THEN the System SHALL require appropriate authorization and audit trails
7. WHEN emergency rebuilds are used, THEN the System SHALL track usage metrics to prevent abuse of the bypass mechanism

### Requirement 16: Rebuild Coordination

**User Story:** As a platform engineer, I want intelligent coordination when multiple base images update simultaneously, so that rebuild resources are used efficiently.

#### Acceptance Criteria

1. WHEN multiple base images update within a short time window, THEN the System SHALL batch rebuild decisions to minimize redundant builds
2. WHEN a managed image depends on multiple base images that have updated, THEN the System SHALL trigger only one rebuild incorporating all updates
3. WHEN rebuild resources are limited, THEN the System SHALL prioritize rebuilds based on image criticality and dependency depth
4. WHEN coordinating rebuilds, THEN the System SHALL respect individual image rebuild delay configurations
5. WHEN rebuild coordination conflicts occur, THEN the System SHALL default to the most conservative (longest) delay among affected images
6. WHEN batching rebuilds, THEN the System SHALL provide clear visibility into which base image updates triggered each rebuild
7. WHEN rebuild coordination is active, THEN the System SHALL prevent duplicate rebuild triggers for the same managed image within the coordination window

### Requirement 17: Verification Re-triggering

**User Story:** As a developer, I want verification to be re-triggered when source code changes, so that I can validate configuration and analysis changes without waiting for new image builds.

#### Acceptance Criteria

1. WHEN a managed image warehouse is created, THEN the System SHALL add a git subscription to monitor the source repository for changes
2. WHEN source code changes occur in monitored paths, THEN the System SHALL create new freight to trigger verification workflows
3. WHEN monitoring managed image source repositories, THEN the System SHALL include the app folder path and image factory directory in the git subscription
4. WHEN git subscriptions detect changes, THEN the System SHALL trigger analysis and verification stages without requiring new image builds
5. WHEN configuring git subscriptions, THEN the System SHALL monitor the same branch specified in the managed image enrollment
6. WHEN multiple changes occur in rapid succession, THEN the System SHALL batch freight creation to avoid excessive verification runs
7. WHEN git subscription paths are configured, THEN the System SHALL include both the specific app directory and the shared image factory configuration directory

**User Story:** As a platform engineer, I want GitHub Actions and Container Registry functionality organized as reusable components, so that these features can be maintained efficiently and potentially used by other teams.

#### Acceptance Criteria

1. WHEN implementing GitHub Actions functionality, THEN the System SHALL separate reusable components from image-factory specific code
2. WHEN creating container registry integration, THEN the System SHALL implement registry clients as modular, testable components
3. WHEN building UI components, THEN the System SHALL create components that can work with any Backstage entity type, not just ManagedImage entities
4. WHEN implementing API clients, THEN the System SHALL use consistent patterns for backend proxy authentication across all GitHub integrations
5. WHEN organizing code, THEN the System SHALL group related functionality into logical packages (common utilities, UI components, API clients)
6. WHEN creating shared utilities, THEN the System SHALL implement functions like date formatting and version filtering as reusable utilities
7. WHEN implementing authentication, THEN the System SHALL use a single, consistent approach for GitHub API authentication across all components
8. WHEN testing GitHub functionality, THEN the System SHALL provide comprehensive test coverage including unit tests, component tests, and integration tests

## Non-Functional Requirements

### NFR1: Event-Driven Architecture

The System SHALL use event-driven architecture to minimize resource usage and respond promptly to changes.

### NFR2: GitOps Principles

The System SHALL follow GitOps principles with all configuration and state stored in version control and changes applied through git operations.

### NFR3: Security

The System SHALL store credentials securely, use minimal permission scopes, maintain audit trails, and support future image signature verification.

### NFR4: Scalability

The System SHALL support adding images through configuration changes without requiring infrastructure modifications, and SHALL support distributed deployment across multiple repositories and teams.

### NFR5: Testability

The System SHALL be designed for testability with unit tests for components and integration tests for end-to-end workflows. The acceptance test infrastructure SHALL provide unified test execution, custom screenshot management, and comprehensive artifact organization for reliable E2E validation.

## Open Questions

~~1. **Multi-stage Dockerfiles**: How should we handle Dockerfiles with multiple FROM statements? Track all or just the primary base image?~~
**RESOLVED**: Track all base images from all FROM statements (see Requirement 2.6-2.7)

~~2. **Critical CVE Response**: Should we support immediate rebuilds that bypass the rebuild delay for critical security vulnerabilities?~~
**RESOLVED**: Yes, support emergency rebuilds with proper authorization and audit trails (see Requirement 15)

~~3. **Rate Limiting**: How should we handle container registry rate limits (especially Docker Hub)?~~
**RESOLVED**: Limit public registry checks to once per day maximum, coordinate Warehouse refresh intervals (see Requirement 3.6-3.8)

~~4. **State Cleanup**: When images are removed from enrollment, should we automatically archive their state or preserve it indefinitely?~~
**RESOLVED**: Archive state to _archive directory, restore if re-enrolled (see Requirement 7.4-7.7)

~~5. **Rebuild Coordination**: When multiple base images update simultaneously, how should we coordinate rebuilds to minimize redundant builds?~~
**RESOLVED**: Batch rebuild decisions, prioritize by criticality, respect individual delays (see Requirement 16)

### Requirement 18: Image User Updates

**User Story:** As a platform engineer, I want any system component that references managed images to be automatically updated when those images are rebuilt, so that infrastructure stays current with managed dependencies without manual intervention.

#### Acceptance Criteria

1. WHEN any system component uses a managed image in its configuration files, THEN the System SHALL create Kargo promotion stages to update those references automatically
2. WHEN a managed image referenced by system components is updated, THEN the System SHALL trigger the appropriate promotion stage to update the configuration files
3. WHEN updating dependencies, THEN the System SHALL use Kargo's built-in promotion tasks (kustomize-set-image, yaml-update, helm-update-image) based on the file format
4. WHEN updates are made, THEN the System SHALL use Kargo's git-commit and git-push tasks with descriptive commit messages
5. WHEN multiple dependencies update simultaneously, THEN the System SHALL coordinate promotion stages to batch updates appropriately
6. WHEN promotion stages fail, THEN the System SHALL log the error and continue normal operations without blocking other workflows
7. WHEN configuring dependencies, THEN the System SHALL support both Kustomize-based updates (kustomize-set-image) and direct file updates (yaml-update)
8. WHEN creating promotion stages for updates, THEN the System SHALL generate appropriate Kargo stage configurations in the CDK8s output
9. WHEN a managed image has references in multiple file formats, THEN the System SHALL create separate promotion stages for each format type
10. WHEN updating image references, THEN the System SHALL use Kargo's image templating syntax to reference the latest image versions
