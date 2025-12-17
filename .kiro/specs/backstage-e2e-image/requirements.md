# Backstage E2E Test Image Requirements

## Introduction

This specification defines the requirements for a dedicated Docker image that contains all Backstage acceptance tests and their dependencies, enabling reliable and self-contained E2E testing in Kubernetes environments, particularly for Kargo verification workflows.

## Glossary

- **E2E_Test_Image**: A Docker image containing all acceptance tests, dependencies, and test execution scripts
- **Test_Discovery**: Automated detection and execution of test files across multiple plugin directories
- **Kargo_Verification**: Automated testing phase that runs after deployment to validate functionality
- **Playwright_Tests**: Browser-based acceptance tests using the Playwright testing framework
- **Plugin_Tests**: Acceptance tests specific to individual Backstage plugins
- **Central_Tests**: Core platform acceptance tests that validate overall Backstage functionality
- **Test_Artifacts**: Output files from test execution including reports, screenshots, and traces

## Requirements

### Requirement 1

**User Story:** As a platform engineer, I want a self-contained Docker image for E2E testing, so that Kargo verification can run reliably without depending on ConfigMaps or external file mounts.

#### Acceptance Criteria

1. WHEN the E2E_Test_Image is built, THE System SHALL include all acceptance test files from the central tests directory
2. WHEN the E2E_Test_Image is built, THE System SHALL include all plugin-specific acceptance test files
3. WHEN the E2E_Test_Image is built, THE System SHALL include all test helper libraries and utilities
4. WHEN the E2E_Test_Image is built, THE System SHALL pre-install all npm dependencies required for test execution
5. WHEN the E2E_Test_Image is built, THE System SHALL include the post-deployment E2E test execution script

### Requirement 2

**User Story:** As a developer, I want the E2E test image to automatically discover tests, so that new plugin tests are included without manual configuration changes.

#### Acceptance Criteria

1. WHEN the test execution script runs, THE System SHALL automatically discover all test files matching the pattern `tests/acceptance/**/*.spec.ts`
2. WHEN the test execution script runs, THE System SHALL automatically discover all test files matching the pattern `tests/acceptance/**/*.test.ts`
3. WHEN plugin tests are discovered, THE System SHALL preserve the original directory structure for import resolution
4. WHEN tests are executed, THE System SHALL use a single Playwright installation to avoid conflicts
5. WHEN new plugins with tests are added, THE System SHALL include them without requiring image rebuild configuration changes

### Requirement 3

**User Story:** As a platform engineer, I want the E2E test image to integrate seamlessly with Kargo verification, so that deployment validation is automated and reliable.

#### Acceptance Criteria

1. WHEN used in Kargo_Verification, THE E2E_Test_Image SHALL accept the deployment URL as a parameter
2. WHEN used in Kargo_Verification, THE E2E_Test_Image SHALL perform health checks before running tests
3. WHEN used in Kargo_Verification, THE E2E_Test_Image SHALL output Test_Artifacts to a mounted volume
4. WHEN used in Kargo_Verification, THE E2E_Test_Image SHALL return appropriate exit codes for success/failure
5. WHEN used in Kargo_Verification, THE E2E_Test_Image SHALL support test filtering and execution options

### Requirement 4

**User Story:** As a developer, I want comprehensive test artifact collection, so that I can debug test failures and track test execution history.

#### Acceptance Criteria

1. WHEN tests are executed, THE System SHALL generate HTML test reports with detailed results
2. WHEN tests fail, THE System SHALL capture screenshots of the failure state
3. WHEN tests fail, THE System SHALL capture browser traces for debugging
4. WHEN tests are executed, THE System SHALL generate JUnit XML reports for CI integration
5. WHEN tests are executed, THE System SHALL collect execution metadata including timestamps and environment information

### Requirement 5

**User Story:** As a platform engineer, I want the E2E test image to be version-controlled and cacheable, so that test execution is fast and reproducible.

#### Acceptance Criteria

1. WHEN the E2E_Test_Image is built, THE System SHALL use Docker layer caching for npm dependencies
2. WHEN the E2E_Test_Image is built, THE System SHALL tag the image with the Git commit hash
3. WHEN the E2E_Test_Image is built, THE System SHALL include metadata about the source code version
4. WHEN the E2E_Test_Image is used, THE System SHALL ensure test results are reproducible for the same code version
5. WHEN the E2E_Test_Image is updated, THE System SHALL maintain backward compatibility with existing Kargo configurations

### Requirement 6

**User Story:** As a developer, I want the E2E test image build process to be automated, so that new test images are available whenever code changes.

#### Acceptance Criteria

1. WHEN code is pushed to the main branch, THE System SHALL automatically build a new E2E_Test_Image
2. WHEN the E2E_Test_Image build completes, THE System SHALL push the image to the container registry
3. WHEN the E2E_Test_Image build fails, THE System SHALL notify developers of the failure
4. WHEN plugin tests are modified, THE System SHALL trigger a new image build
5. WHEN the image build process runs, THE System SHALL validate that all tests can be discovered and executed