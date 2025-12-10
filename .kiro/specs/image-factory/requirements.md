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

### Requirement 3: Base Image Monitoring

**User Story:** As a security engineer, I want upstream base images monitored for updates, so that I can rebuild dependent images with security patches.

#### Acceptance Criteria

1. WHEN a base image is tracked, THEN the System SHALL monitor the container registry for digest changes
2. WHEN a base image digest changes, THEN the System SHALL record the update with timestamp
3. WHEN a base image updates, THEN the System SHALL preserve the update history
4. WHEN monitoring base images, THEN the System SHALL use event-driven mechanisms without continuous polling
5. WHEN a base image update is detected, THEN the System SHALL make that information available for rebuild decisions

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
4. WHEN an image is removed from enrollment and has no dependents, THEN the System SHALL stop tracking that image
5. WHEN a previously enrolled image is re-enrolled, THEN the System SHALL restore or create tracking state

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
2. WHEN viewing image tags, THEN the System SHALL display tag name, digest, size, and published date for each version
3. WHEN a managed image is stored in GitHub Container Registry, THEN the System SHALL use the GitHub Packages API to retrieve version information
4. WHEN a managed image is stored in Docker Hub, THEN the System SHALL use the Docker Hub API to retrieve version information
5. WHEN viewing image versions, THEN the System SHALL display the versions in reverse chronological order with the most recent first
6. WHEN the container registry is unavailable, THEN the System SHALL display cached version information or a clear error message
7. WHEN viewing an image version, THEN users SHALL be able to copy the full image reference including digest
8. WHEN multiple pages of versions exist, THEN the System SHALL provide pagination controls to navigate through all versions

### Requirement 13: Build Pipeline Visibility

**User Story:** As a developer, I want to view GitHub Actions workflow runs for my container images in Backstage, so that I can monitor build status and troubleshoot failures without leaving the portal.

#### Acceptance Criteria

1. WHEN viewing a managed image in Backstage, THEN the System SHALL display recent GitHub Actions workflow runs for that image's build workflow
2. WHEN viewing workflow runs, THEN the System SHALL display run status, duration, commit SHA, and timestamp for each run
3. WHEN a managed image is built by a specific workflow in a monorepo, THEN the System SHALL filter workflow runs to show only that specific workflow
4. WHEN viewing a workflow run, THEN users SHALL be able to click through to view the full run details on GitHub
5. WHEN a workflow run fails, THEN the System SHALL display the failure status prominently
6. WHEN a workflow run is in progress, THEN the System SHALL display the current status and allow real-time updates
7. WHEN viewing workflow runs, THEN the System SHALL display the most recent runs first with pagination for older runs
8. WHEN a user has appropriate permissions, THEN the System SHALL provide the ability to re-run failed workflows
9. WHEN a user navigates to the CICD tab on an image, auth creds should not be required, not all users will have a github user & access to the repos. Our internal creds should be used, via a proxy. The creds should not be exposed to the end user.

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

The System SHALL be designed for testability with unit tests for components and integration tests for end-to-end workflows.

## Open Questions

1. **Multi-stage Dockerfiles**: How should we handle Dockerfiles with multiple FROM statements? Track all or just the primary base image?

2. **Critical CVE Response**: Should we support immediate rebuilds that bypass the rebuild delay for critical security vulnerabilities?

3. **Rate Limiting**: How should we handle container registry rate limits (especially Docker Hub)?

4. **State Cleanup**: When images are removed from enrollment, should we automatically archive their state or preserve it indefinitely?

5. **Rebuild Coordination**: When multiple base images update simultaneously, how should we coordinate rebuilds to minimize redundant builds?
