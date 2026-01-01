# Mono Repository Structure Implementation Plan

## Overview

This implementation plan restructures the mono repository to consolidate capabilities into clear top-level directories, eliminate the dual seed structure, and provide flexible deployment options through improved Kustomize organization.

## Tasks

- [x] 1. Create new top-level capability directories
  - Create `backstage/` directory structure with app and kustomize subdirectories
  - Create `image-factory/` directory structure consolidating all Image Factory components
  - Create `eda/` directory structure for event-driven architecture capability
  - Create `platform/` directory for shared infrastructure
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Consolidate Backstage capability
  - [x] 2.1 Move Backstage application from `apps/backstage/` to `backstage/app/`
    - Move all Backstage source code, packages, and plugins
    - Update internal references and import paths
    - _Requirements: 1.1, 2.2_

  - [x] 2.2 Move Backstage infrastructure to `backstage/kustomize/`
    - Move `kustomize/backstage/` to `backstage/kustomize/`
    - Move `kustomize/backstage-kargo/` to `backstage/kustomize/kargo/`
    - Update path references in kustomization files
    - _Requirements: 1.2, 2.2_

- [ ] 3. Consolidate Image Factory capability
  - [x] 3.1 Move Image Factory application to `image-factory/app/`
    - Move `apps/image-factory/` to `image-factory/app/`
    - Update Docker build contexts and references
    - _Requirements: 1.1, 2.2_

  - [x] 3.2 Move Image Factory state and configuration
    - Move `image-factory/` contents to `image-factory/` root (preserving state/, scripts/, etc.)
    - Ensure no conflicts with new app/ subdirectory
    - _Requirements: 1.1, 2.2_

  - [x] 3.3 Move Image Factory infrastructure to `image-factory/cdk8s/`
    - Move `cdk8s/image-factory/` to `image-factory/cdk8s/`
    - Update CDK8s output paths and references
    - _Requirements: 1.2, 2.2_

- [ ] 4. Consolidate EDA capability
  - [x] 4.1 Move EDA mesh components to `eda/mesh/`
    - Move `mesh/` to `eda/mesh/`
    - Update references in Helm charts and Kustomize configs
    - _Requirements: 1.1, 2.2_

  - [x] 4.2 Move EDA infrastructure to `eda/kustomize/`
    - Move `kustomize/mesh/` to `eda/kustomize/mesh/`
    - Move `kustomize/confluent/` to `eda/kustomize/confluent/`
    - Move `kustomize/camel-karavan/` to `eda/kustomize/camel-karavan/`
    - _Requirements: 1.2, 2.2_

  - [x] 4.3 Move EDA Helm charts to `eda/helm/`
    - Move relevant Helm charts from `helm/` to `eda/helm/`
    - Update chart references and dependencies
    - _Requirements: 1.2, 2.2_

  - [ ]* 4.4 Write property test for EDA structure consistency
    - **Property 1: Repository Structure Consistency**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

- [x] 5. Create consolidated seed structure
  - [x] 5.1 Create new platform seed structure
    - Create `platform/kustomize/seed/` directory structure
    - Create `argocd/`, `eda/`, `backstage/`, `image-factory/`, `supporting-applications/` subdirectories
    - _Requirements: 2.1, 2.2_

  - [x] 5.2 Move ArgoCD installation to `platform/kustomize/seed/argocd/`
    - Move ArgoCD namespace and installation configs
    - Create kustomization.yaml for ArgoCD components
    - _Requirements: 2.2, 2.4_

  - [x] 5.3 Create capability-specific application definitions
    - Create EDA ArgoCD applications in `platform/kustomize/seed/eda/`
    - Create Backstage ArgoCD applications in `platform/kustomize/seed/backstage/`
    - Create Image Factory ArgoCD applications in `platform/kustomize/seed/image-factory/`
    - Update application paths to point to new capability locations
    - _Requirements: 2.2, 2.3_

  - [x] 5.4 Create supporting applications directory
    - Move supporting app definitions to `platform/kustomize/seed/supporting-applications/`
    - Create separate files for each supporting application
    - _Requirements: 2.2, 2.3_

  - [ ]* 5.5 Write property test for seed configuration completeness
    - **Property 2: Seed Configuration Completeness**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

- [x] 6. Create environment overlays
  - [x] 6.1 Create local environment overlays
    - Create `platform/kustomize/seed/overlays/local/pi/` with full capability set
    - Create `platform/kustomize/seed/overlays/local/craig/` without Image Factory
    - _Requirements: 2.5, 4.2_

  - [x] 6.2 Create production overlay
    - Create `platform/kustomize/seed/overlays/production/` excluding supporting applications
    - _Requirements: 2.5, 4.2_

  - [ ]* 6.3 Write property test for overlay pattern support
    - **Property 6: Overlay Pattern Support**
    - **Validates: Requirements 4.2**

- [x] 7. Update shared platform infrastructure
  - [x] 7.1 Move shared Kustomize resources to `platform/kustomize/`
    - Move `kustomize/_common/` to `platform/kustomize/_common/`
    - Move `kustomize/central-secret-store/` to `platform/kustomize/central-secret-store/`
    - Move `kustomize/kargo/` to `platform/kustomize/kargo/`
    - _Requirements: 1.2, 2.4_

  - [x] 7.2 Move remaining CDK8s infrastructure to `platform/cdk8s/`
    - Move any remaining `cdk8s/` components to `platform/cdk8s/`
    - _Requirements: 1.2_

- [x] 8. Update documentation and metadata
  - [x] 8.1 Create capability README files
    - Create `backstage/README.md` explaining Backstage capability
    - Create `image-factory/README.md` explaining Image Factory capability
    - Create `eda/README.md` explaining EDA capability
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 8.2 Update root README with architecture overview
    - Add C4 architecture diagrams showing system context and component relationships
    - Summarize each major capability with links to detailed documentation
    - Update bootstrap instructions to use new consolidated seed structure
    - _Requirements: 3.1, 3.2_

  - [x] 8.3 Create repository metadata file
    - Create `.repo-metadata.yaml` with capability definitions and bootstrap commands
    - _Requirements: 1.3_

  - [ ]* 8.4 Write property test for component documentation linking
    - **Property 5: Component Documentation Linking**
    - **Validates: Requirements 3.2**

- [x] 9. Update supporting applications
  - [x] 9.1 Reorganize remaining apps
    - Keep `e2e-test-runner` and `uv` in `apps/` as supporting applications
    - Update any references to moved applications
    - _Requirements: 1.1_

  - [x] 9.2 Update build and deployment scripts
    - Update any scripts that reference old paths
    - Update CI/CD pipelines to use new structure
    - _Requirements: 2.2_

- [x] 10. Checkpoint - Validate new structure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement self-managing seed mechanism
  - [x] 11.1 Create self-managing seed applications
    - Create ArgoCD applications in the seed that manage the seed directory itself
    - Configure applications to point to `platform/kustomize/seed` path
    - Set up automatic sync policies for self-management
    - _Requirements: 2.6, 2.7, 2.8_

  - [ ]* 11.2 Write property test for self-managing seed behavior
    - **Property 3: Self-Managing Seed Behavior**
    - **Validates: Requirements 2.6, 2.7, 2.8**

- [x] 12. Implement branch targeting mechanism
  - [x] 12.1 Ensure branch targeting component is available
    - Verify `platform/kustomize/_common/components/argocd-branch-targetrevision/` exists
    - Update component to support all ArgoCD resource types (Application, ApplicationSet)
    - _Requirements: 5.4, 5.5_

  - [x] 12.2 Add branch targeting to environment overlays
    - Add branch targeting component to local environment overlays
    - Configure target revision ConfigMaps for feature branch development
    - _Requirements: 5.1, 5.2_

  - [x] 12.3 Label applications for branch targeting
    - Ensure all ArgoCD applications have `repo=argocd-eda` label
    - Verify applications support branch targeting mechanism
    - _Requirements: 5.3_

  - [x] 12.4 Enhance branch targeting for helm parameters
    - Update branch targeting component to support helm parameter replacement
    - Add feature_branch parameter support to replace service-specific branch parameters
    - Update component to handle both targetRevision and helm parameter updates
    - _Requirements: 5.6, 5.7, 5.8_

  - [x] 12.5 Update helm charts to use generic feature_branch parameter
    - Replace argocd.lob_services.branch with feature_branch in mesh-lob helm chart
    - Update ApplicationSets to use feature_branch parameter instead of service-specific names
    - Remove manual patches in overlays that are now handled by the component
    - _Requirements: 5.7, 5.8_

  - [x] 12.6 Add comprehensive kustomize tests for branch targeting
    - Create test folders for each location that uses the branch targeting component
    - Add tests to validate targetRevision replacement in git sources
    - Add tests to validate feature_branch parameter replacement in helm applications
    - Add tests for both Application and ApplicationSet resources
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 12.7 Write property test for enhanced branch targeting functionality
    - **Property 4: Branch Targeting Functionality**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**

- [ ] 13. Migration and cleanup
  - [ ] 13.1 Add comprehensive kustomize testing infrastructure
    - Update root Taskfile.yaml to include `test:kustomize` task
    - Ensure `test:kustomize` runs all kustomize unit tests (ingress + branch targeting)
    - Add test validation to CI/CD pipeline
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ] 13.2 Test bootstrap process with self-managing seed
    - Test `kubectl apply -k platform/kustomize/seed/overlays/local/pi`
    - Verify self-managing applications are created and functional
    - Test that subsequent changes to seed are automatically applied
    - _Requirements: 2.1, 2.6, 2.7_

  - [ ] 13.3 Test branch targeting functionality
    - Configure a feature branch target revision
    - Verify all labeled applications switch to the target branch
    - Test with both single-source and multi-source applications
    - Test helm parameter replacement functionality
    - _Requirements: 5.1, 5.2, 5.4, 5.6, 5.7, 5.8_

  - [ ] 13.4 Remove deprecated seed directory
    - Remove old `seed/` directory after confirming new structure works
    - Update any remaining references
    - _Requirements: 2.3_

  - [ ]* 13.5 Write integration tests for complete bootstrap process
    - Test complete platform deployment from consolidated structure
    - Test multi-environment overlay functionality
    - Test self-managing seed behavior
    - Test branch targeting across environments
    - _Requirements: 2.1, 2.5, 2.6, 2.7, 5.1, 5.2_

  - [ ] 13.3 Remove deprecated seed directory
    - Remove old `seed/` directory after confirming new structure works
    - Update any remaining references
    - _Requirements: 2.3_

  - [ ]* 13.4 Write integration tests for complete bootstrap process
    - Test complete platform deployment from consolidated structure
    - Test multi-environment overlay functionality
    - Test self-managing seed behavior
    - Test branch targeting across environments
    - _Requirements: 2.1, 2.5, 2.6, 2.7, 5.1, 5.2_

- [x] 14. Implement CI/CD testing infrastructure
  - [x] 14.1 Standardize component test structure
    - Ensure any components use the flexible test directory structure where they include the test types appropriate to their case (always unit/ integration/ and/or acceptance)
    - Ensure each component has appropriate Taskfile.yaml with test tasks for its test types (always named unit, integration or acceptance)
    - Update existing components to follow flexible test organization
    - _Requirements: 7.1, 7.4_

  - [x] 14.2 Create component-specific test tasks following the concrete pattern
    - Add test tasks (`test:unit`, `test:integration`, `test:acceptance`, `test:all`) to component Taskfiles based on what test types each component actually has
    - Ensure all test logic resides in Taskfile.yaml, not in GitHub Actions workflows
    - Ensure test tasks are composable and can run independently
    - Document test execution in component README files
    - _Requirements: 7.6, 7.4_

  - [x] 14.3 Create reusable GitHub Actions workflows for component testing
    - Create `_component-test-fast.yml` for pre-deployment testing (unit + integration tests only)
    - Create `_component-test-acceptance.yml` for post-deployment testing (acceptance tests only)
    - Create lightweight component workflow files that call the appropriate reusable workflow
    - Use GitHub-native `paths:` filtering to trigger only when component files change
    - Include the reusable workflow file in path triggers so changes to test logic trigger all component tests
    - Leverage GitHub's automatic parallel execution of separate workflows
    - Include conditional job execution using `hashFiles()` to skip test levels that don't exist
    - Ensure reusable workflows use ONLY `task {test-type}` commands, never inline test commands
    - Create manual acceptance test workflows for debugging deployed systems
    - _Requirements: 7.3, 7.7, 7.2_

  - [x] 14.4 Implement local change detection for testing
    - Add root-level `test:changed` task that detects components with changes compared to main branch
    - Add `test:changed:unit`, `test:changed:integration`, `test:changed:acceptance` tasks for specific test levels
    - Create reusable change detection script that works for both local development and CI/CD
    - Document workflow for developers to test only changed components locally
    - _Requirements: 7.3, 7.2_

  - [x] 14.4 Implement synchronization validation mechanisms
    - Add root-level `validate:ci-sync` task to check that workflows use task commands exclusively
    - Add validation that no workflow files contain inline test commands (pytest, npm test, etc.)
    - Add validation that all test workflows use `task test:` pattern
    - Include validation in CI/CD pipeline to prevent drift
    - _Requirements: 7.2, 7.5_

  - [x] 14.5 Create consolidated repository maintenance workflow
    - Create `repo-maintenance.yml` workflow that handles all repository maintenance tasks
    - Include component workflow generation from `.repo-metadata.yaml` component definitions
    - Include taskfile documentation generation (`task docs:taskfile`)
    - Include CI/CD synchronization validation (`task validate:ci-sync`)
    - Include any future repository maintenance tasks
    - Configure workflow to run only on PR checks when relevant files change (fail if maintenance needed)
    - Include generation scripts in path triggers to catch changes to maintenance logic
    - Document the consolidated maintenance approach and extensibility for future tasks
    - _Requirements: 7.2, 7.5, 7.7_

  - [ ]* 14.6 Write property tests for CI/CD testing structure
    - **Property 11: Test Level Organization**
    - **Property 12: Local-CI/CD Test Parity**
    - **Property 13: Component Test Isolation**
    - **Property 14: Decentralized Test Configuration**
    - **Property 15: Minimal Centralized Workflows**
    - **Property 16: Composable Test Execution**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

- [x] 15. Fix CI/CD testing architecture and implement workflow generation
  - [x] 15.1 Create .repo-metadata.yaml with component definitions
    - Define all components with paths, test trigger paths, and optional image configuration
    - Use presence of `image` section to determine if component builds Docker images
    - Use introspection for test discovery rather than explicit configuration
    - Use declarative approach with minimal configuration overhead
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 15.2 Create workflow generation script with proper Python environment
    - Create `scripts/generate-component-workflows.py` that reads `.repo-metadata.yaml`
    - Create `scripts/Taskfile.yaml` with venv management following existing patterns (CI vs local)
    - Create `scripts/requirements.txt` with Jinja2 and PyYAML dependencies
    - Implement test capability discovery (check for tests/unit/, tests/integration/, tests/acceptance/ directories)
    - Implement Taskfile.yaml introspection to detect available test tasks
    - Generate workflows that only include test jobs for discovered test types
    - Create Jinja2 templates in `scripts/templates/` for maintainable workflow generation
    - _Requirements: 7.4, 7.5, 7.6_

  - [x] 15.3 Fix reusable workflow architecture
    - Replace `_component-test-full.yml` with `_component-test-acceptance.yml` (acceptance tests only)
    - Keep `_component-test-fast.yml` for unit + integration tests (pre-deployment)
    - Remove the flawed approach of running all test types together
    - _Requirements: 7.1, 7.2_

  - [x] 15.4 Create manual acceptance testing workflow
    - Create single `manual-acceptance-tests.yml` workflow with component selection
    - Use workflow_dispatch with component choice input (populated from .repo-metadata.yaml)
    - Eliminate duplication of manual triggers across component workflows
    - _Requirements: 7.3, 7.6_

  - [x] 15.5 Generate and validate new component workflows
    - Run generation script to create new component workflows
    - Validate generated workflows only include discovered test capabilities
    - Test that workflows trigger correctly on path changes
    - Remove old hand-written workflows after validation
    - _Requirements: 7.2, 7.5, 7.7_

- [x] 16. Fix test dependency management across components
  - [x] 16.1 Fix duplicate workflow runs by optimizing triggers
    - Update workflow template to use `pull_request` for PR validation and `push` only for main branch
    - This prevents duplicate runs when pushing to PR branches (which trigger both push and pull_request events)
    - Regenerate all component workflows with the optimized trigger configuration
    - Remove any old conflicting workflows that haven't been cleaned up
    - _Requirements: 7.3, 7.5_

  - [x] 16.2 Standardize Python test execution patterns across all components
    - Update image-factory Taskfile.yaml to use the established CI/local pattern: `python -m pytest` in CI, `.venv/bin/python -m pytest` locally
    - Remove inconsistent `uv run pytest` commands that fail due to missing dev dependencies
    - Ensure all Python components follow the same conditional execution pattern used by platform components
    - Update any other Python components with similar dependency issues
    - _Requirements: 7.2, 7.4_

  - [x] 16.3 Validate test execution across all components
    - Run `task test:unit` for each component to ensure tests execute successfully both locally and in CI
    - Fix any remaining dependency or execution issues
    - Ensure consistent test execution patterns across Python and Node.js components
    - _Requirements: 7.2, 7.6_

  - [ ]* 16.4 Write property test for test execution consistency
    - **Property 17: Test Execution Consistency**
    - **Validates: Requirements 7.2, 7.4**

- [ ] 17. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.