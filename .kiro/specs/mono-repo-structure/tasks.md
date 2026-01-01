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

- [ ] 14. Implement CI/CD testing infrastructure
  - [ ] 14.1 Standardize component test structure
    - Create flexible test directory structure where components include only needed test types (unit/, integration/, acceptance/)
    - Ensure each component has appropriate Taskfile.yaml with test tasks for its test types
    - Update existing components to follow flexible test organization
    - _Requirements: 7.1, 7.4_

  - [ ] 14.2 Create component-specific test tasks
    - Add test tasks (`test:unit`, `test:integration`, `test:acceptance`, `test:all`) to component Taskfiles based on what test types each component actually has
    - Ensure test tasks are composable and can run independently
    - Document test execution in component README files
    - _Requirements: 7.6, 7.4_

  - [ ] 14.3 Implement path-based selective test execution
    - Create CI/CD workflows that use path-based change detection (GitHub Actions `paths:` semantics)
    - Add logic to run only tests for components that have changed based on file paths
    - Ensure component test isolation is maintained
    - _Requirements: 7.3, 7.7_

  - [ ] 14.4 Create minimal CI/CD workflow integration
    - Create minimal CI/CD workflow files that use path-based triggering and delegate to component-specific tasks
    - Ensure local and CI/CD test execution use identical commands
    - Support consolidation of component workflows into repo-level workflows with path-based triggering
    - Document CI/CD integration approach
    - _Requirements: 7.2, 7.5, 7.7_

  - [ ]* 14.5 Write property tests for CI/CD testing structure
    - **Property 11: Test Level Organization**
    - **Property 12: Local-CI/CD Test Parity**
    - **Property 13: Component Test Isolation**
    - **Property 14: Decentralized Test Configuration**
    - **Property 15: Minimal Centralized Workflows**
    - **Property 16: Composable Test Execution**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

- [ ] 15. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.