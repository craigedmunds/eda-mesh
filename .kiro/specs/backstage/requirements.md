# Requirements Document

## Introduction

This specification defines the requirements for a Backstage developer portal platform that includes automated deployment pipelines using Kargo for GitOps promotions, comprehensive testing infrastructure, and integration with GitHub and container registries. The platform provides a software catalog and developer portal capabilities while supporting automated deployment and validation workflows.

## Glossary

- **Backstage_Platform**: The developer portal system including frontend, backend, and core plugins
- **Kargo_System**: GitOps promotion engine that manages progressive delivery workflows
- **Container_Registry**: Registry storing Backstage container images (ghcr.io)
- **Git_Repository**: Version control system storing deployment configurations and source code
- **ArgoCD**: GitOps continuous delivery tool for Kubernetes deployments
- **Acceptance_Tests**: End-to-end Playwright tests validating application functionality (also referred to as E2E tests)
- **Local_K8s_Cluster**: Local Kubernetes cluster where Backstage is deployed
- **Catalog_Entities**: Backstage entities including Components, Systems, APIs, and Resources
- **GitHub_Integration**: Integration with GitHub for authentication, API access, and repository management
- **Promotion_Pipeline**: Automated workflow for advancing application versions through deployment stages
- **Kustomize_Overlays**: Environment-specific Kubernetes configuration overlays
- **Analysis_Template**: Kargo resource defining verification steps for deployment validation
- **ConfigMap_Scripts**: Scripts embedded directly in Kubernetes ConfigMaps (anti-pattern to be eliminated)
- **Script_Repository**: Proper file-based storage for scripts and automation code
- **GitOps_Best_Practices**: Industry standards for managing Kubernetes configurations in Git repositories
- **Test_Discovery_System**: Automated system for locating and executing tests across multiple directories
- **Plugin_Tests**: Acceptance tests specific to individual Backstage plugins located in plugin directories
- **Unified_Test_Runner**: Single test execution entry point that orchestrates distributed test suites
- **E2E_Artifacts**: End-to-end test outputs including screenshots, videos, traces, and HTML reports stored in `.backstage-e2e-artifacts` directory
- **Artifact_Directory**: The `.backstage-e2e-artifacts` folder containing timestamped test run subdirectories
- **Test_Run_Directory**: Individual timestamped subdirectories within the artifact directory (e.g., `backstage-acceptance-20251215-161003`)
- **Central_Environment_Variables**: Shared environment configuration for test execution including storage paths for screenshots, videos, traces, and other test artifacts
- **Image_Factory_Tests**: Acceptance tests specific to the image factory plugin functionality
- **Functional_Acceptance_Tests**: High-level tests that validate user-facing functionality without implementation details
- **Test_Duplication**: Multiple tests covering the same functionality or user workflow
- **Artifact_Retention_Policy**: Rules governing how many test run artifacts to retain and when to clean up old ones
- **Artifact_Storage_Path**: Environment variable defining where test artifacts (screenshots, videos, traces) should be stored during execution
- **Image_Version**: The specific version tag of our custom Backstage container image currently deployed
- **Backstage_Framework_Version**: The version of the underlying Backstage framework being used
- **Version_File**: File embedded in the container image containing both our image version and Backstage framework version (e.g., `/app/version.json`)
- **Version_Comment**: HTML comment in the page source showing both the current image version and Backstage framework version
- **Version_Verification**: Dedicated Kargo verification step that validates version information via HTTP request
- **Homepage**: The main landing page of the Backstage platform that users see when first accessing the system

## Requirements

### Requirement 1

**User Story:** As a developer, I want a fully functional Backstage platform, so that I can access a unified developer portal with software catalog capabilities.

#### Acceptance Criteria

1. WHEN the Backstage_Platform starts, THEN it SHALL load successfully with all core plugins enabled
2. WHEN users navigate to the platform, THEN the Backstage_Platform SHALL display the software catalog interface
3. WHEN users browse the catalog, THEN the Backstage_Platform SHALL show entities with proper metadata and relationships
4. WHEN GitHub_Integration is configured, THEN the Backstage_Platform SHALL authenticate users and access repository data
5. WHEN accessing the platform locally, THEN the Backstage_Platform SHALL be available at http://localhost:3000

### Requirement 2

**User Story:** As a DevOps engineer, I want automatic Kargo promotions when new Backstage images are published, so that deployments happen without manual intervention.

#### Acceptance Criteria

1. WHEN a new Backstage image is published to ghcr.io/craigedmunds/backstage, THEN the Kargo_System SHALL detect the new image automatically
2. WHEN the image meets the semver constraint >=0.6.0, THEN the Kargo_System SHALL trigger a promotion to the local stage
3. WHEN the promotion executes, THEN the Kargo_System SHALL update the Git_Repository with the new image tag in Kustomize_Overlays
4. WHEN Git_Repository changes are pushed, THEN ArgoCD SHALL sync and deploy the new version to Local_K8s_Cluster
5. WHEN the deployment completes, THEN the Backstage_Platform SHALL be accessible at https://backstage.127.0.0.1.nip.io

### Requirement 3

**User Story:** As a quality assurance engineer, I want comprehensive acceptance tests to validate Backstage functionality after deployment, so that I can ensure the platform works correctly.

#### Acceptance Criteria

1. WHEN a Backstage deployment completes, THEN the Acceptance_Tests SHALL verify the platform is accessible and responsive
2. WHEN testing navigation, THEN the Acceptance_Tests SHALL confirm core navigation elements are visible and functional
3. WHEN testing the catalog, THEN the Acceptance_Tests SHALL verify entities are displayed with proper metadata
4. WHEN testing entity details, THEN the Acceptance_Tests SHALL validate that entity relationships and links work correctly
5. WHEN Acceptance_Tests complete, THEN the system SHALL report detailed test results with pass/fail status

### Requirement 4

**User Story:** As a platform administrator, I want robust configuration management and integration capabilities, so that the Backstage platform can integrate with external systems and handle various deployment environments.

#### Acceptance Criteria

1. WHEN configuring GitHub_Integration, THEN the Backstage_Platform SHALL support GitHub API proxy endpoints with proper authentication
2. WHEN configuring container registries, THEN the Backstage_Platform SHALL support Docker Hub API proxy for registry integration
3. WHEN deploying via Kubernetes, THEN the Backstage_Platform SHALL support in-cluster service account authentication
4. WHEN managing catalog locations, THEN the Backstage_Platform SHALL load entities from local files and support template-based scaffolding
5. WHEN handling secrets, THEN the Backstage_Platform SHALL use environment variables for sensitive configuration data

### Requirement 5

**User Story:** As a developer, I want the scaffolder functionality to work properly, so that I can create new projects and components through templates.

#### Acceptance Criteria

1. WHEN accessing the scaffolder, THEN the Backstage_Platform SHALL display available software templates
2. WHEN creating a new component, THEN the Backstage_Platform SHALL execute template actions successfully
3. WHEN templates are processed, THEN the Backstage_Platform SHALL generate proper project structures and configurations
4. WHEN scaffolding completes, THEN the Backstage_Platform SHALL register new entities in the catalog
5. WHEN using GitHub integration, THEN the Backstage_Platform SHALL create repositories and configure webhooks properly

### Requirement 6

**User Story:** As a system administrator, I want monitoring and error handling capabilities, so that I can troubleshoot issues and maintain system reliability.

#### Acceptance Criteria

1. WHEN Promotion_Pipeline steps execute, THEN the Kargo_System SHALL log detailed operation information
2. WHEN integration failures occur, THEN the Backstage_Platform SHALL implement retry mechanisms with exponential backoff
3. WHEN Acceptance_Tests fail, THEN the system SHALL capture detailed error information and screenshots
4. WHEN Git_Repository operations fail, THEN the Kargo_System SHALL provide diagnostic information and retry logic
5. WHEN system health is checked, THEN the Backstage_Platform SHALL report status of all integrated components

### Requirement 7

**User Story:** As a DevOps engineer, I want the Kargo configuration to follow GitOps best practices with clean separation of concerns, so that scripts are maintainable and Kubernetes manifests are focused on resource definitions.

#### Acceptance Criteria

1. WHEN reviewing Kargo configuration, THEN no ConfigMaps SHALL contain embedded Python, shell, or other executable code
2. WHEN scripts are needed for verification, THEN they SHALL be stored in dedicated script directories with proper file extensions
3. WHEN Kubernetes resources reference scripts, THEN they SHALL use volume mounts or init containers to access external script files
4. WHEN examining analysis templates, THEN there SHALL be only one template per distinct verification purpose
5. WHEN manual resource files exist, THEN they SHALL either be removed or have clear documentation explaining their purpose

### Requirement 8

**User Story:** As a quality assurance engineer, I want a unified acceptance test execution system integrated with Kargo verification, so that deployment validation provides clear and consistent feedback.

#### Acceptance Criteria

1. WHEN executing tests via local_e2e.py with --kubernetes flag, THEN the Test_Discovery_System SHALL locate and execute acceptance tests from /workspace/backstage/app/tests/acceptance and plugin-specific directories without duplication
2. WHEN Kargo verification runs, THEN Acceptance_Tests SHALL execute exactly once per promotion and produce artifacts with consistent naming patterns based on promotion and freight IDs
3. WHEN tests are distributed across multiple directories, THEN the Test_Discovery_System SHALL eliminate duplicate test execution while maintaining proper test isolation and producing consolidated reports
4. WHEN Acceptance_Tests complete, THEN they SHALL produce accessible test reports and artifacts including screenshots, videos, and traces with clear traceability of which tests ran from which locations
5. WHEN tests fail, THEN failure information SHALL be clearly visible in Kargo promotion status and debugging artifacts including screenshots SHALL be easily accessible for investigation
6. WHEN Kargo AnalysisTemplate executes verification, THEN it SHALL use appropriate failureLimit, interval, and count settings to prevent unintended test retries or duplicate executions
7. WHEN test execution completes (success or failure), THEN the system SHALL not automatically retry tests and SHALL generate exactly one artifact directory per promotion
8. WHEN investigating test execution issues, THEN artifact directory names SHALL provide clear traceability to specific Kargo promotions and freight without ambiguous suffixes
9. WHEN Kargo verification executes, THEN the system SHALL write all test execution logs to a dedicated log file and declare it as an artifact in the Verification spec for access through the Kargo UI

### Requirement 9

**User Story:** As a developer, I want automatic cleanup of old e2e test artifacts, so that my disk space doesn't fill up with outdated test results and I can focus on recent test outcomes.

#### Acceptance Criteria

1. WHEN Acceptance_Tests complete, THEN the system SHALL retain only the 3 most recent Test_Run_Directory entries in the Artifact_Directory
2. WHEN more than 3 Test_Run_Directory entries exist, THEN the system SHALL automatically delete the oldest directories based on timestamp
3. WHEN cleaning up artifacts, THEN the system SHALL preserve the directory structure and only remove complete test run directories
4. WHEN artifact cleanup occurs, THEN the system SHALL log which directories were removed for audit purposes
5. WHEN the cleanup process fails, THEN the system SHALL continue test execution and log the cleanup failure without blocking tests

### Requirement 10

**User Story:** As a test engineer, I want all plugin tests to use centralized environment variables for screenshot storage, so that test artifacts are consistently stored and accessible across all plugins.

#### Acceptance Criteria

1. WHEN Plugin_Tests execute, THEN they SHALL use Central_Environment_Variables for Artifact_Storage_Path configuration
2. WHEN environment variables are not available, THEN Plugin_Tests SHALL fail with clear error messages indicating missing configuration
3. WHEN test artifacts are captured, THEN they SHALL be stored in the path specified by Central_Environment_Variables
4. WHEN multiple plugins run tests, THEN they SHALL all use the same environment variable configuration for consistency
5. WHEN test configuration changes, THEN all Plugin_Tests SHALL automatically use the updated Central_Environment_Variables without code changes

### Requirement 11

**User Story:** As a quality assurance engineer, I want clean, focused acceptance tests for the image factory plugin, so that tests are maintainable and provide clear feedback about functionality without duplication.

#### Acceptance Criteria

1. WHEN reviewing Image_Factory_Tests, THEN there SHALL be no Test_Duplication covering the same user workflows
2. WHEN Image_Factory_Tests execute, THEN they SHALL focus on high-level Functional_Acceptance_Tests rather than implementation details
3. WHEN test failures occur, THEN Image_Factory_Tests SHALL provide clear feedback about which user functionality is broken
4. WHEN new functionality is added, THEN Image_Factory_Tests SHALL cover the user-facing behavior without testing internal implementation
5. WHEN tests are organized, THEN Image_Factory_Tests SHALL follow consistent naming and structure patterns with other Plugin_Tests

### Requirement 12

**User Story:** As a system administrator, I want automated artifact management that integrates seamlessly with the existing test infrastructure, so that cleanup happens without manual intervention or interference with test execution.

#### Acceptance Criteria

1. WHEN the Unified_Test_Runner executes, THEN it SHALL automatically trigger artifact cleanup after test completion
2. WHEN Kargo verification runs, THEN artifact cleanup SHALL occur without interfering with test result reporting
3. WHEN artifact cleanup runs, THEN it SHALL work correctly regardless of the test execution environment (local, CI, Kargo)
4. WHEN cleanup completes, THEN the system SHALL ensure the most recent test artifacts remain accessible for debugging
5. WHEN multiple test runs occur simultaneously, THEN artifact cleanup SHALL handle concurrent access safely without corruption

### Requirement 13

**User Story:** As a developer or operator, I want to verify both the current image version and Backstage framework version through a dedicated Kargo verification step, so that I can confirm the correct versions are deployed without relying on heavy browser-based testing.

#### Acceptance Criteria

1. WHEN users view the Backstage_Platform homepage source, THEN the system SHALL include both the current Image_Version and Backstage_Framework_Version in HTML comments
2. WHEN the HTML comments are included, THEN they SHALL be clearly formatted and easily identifiable in the page source
3. WHEN a Kargo verification step runs, THEN it SHALL make an HTTP request to the homepage and verify both version comments are present and accurate
4. WHEN version information is unavailable, THEN the system SHALL include HTML comments indicating which versions could not be determined
5. WHEN the version verification fails, THEN the Kargo promotion SHALL fail with clear error messages indicating which version check failed

