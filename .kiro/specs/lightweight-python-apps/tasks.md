# Implementation Plan: Lightweight Python Applications

## Overview

This plan refactors the backstage-catalog-api to follow the lightweight Python app pattern, then adds testing infrastructure. The approach is to extract embedded code, set up the directory structure, add unit tests, and update Kustomize configuration.

## Tasks

- [ ] 1. Create application directory structure
  - Create `eda/mesh/services/backstage-catalog-api/` directory
  - Create `tests/` subdirectory with `__init__.py`
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 7.1, 7.2_

- [ ] 2. Extract Python code from ConfigMap
  - [ ] 2.1 Extract app.py from configmap.yaml to file
    - Copy the embedded Python code from `data.app.py` in configmap.yaml
    - Save as `eda/mesh/services/backstage-catalog-api/app.py`
    - _Requirements: 1.1, 1.4_
  
  - [ ] 2.2 Extract pyproject.toml from configmap.yaml to file
    - Copy the embedded TOML from `data.pyproject.toml` in configmap.yaml
    - Save as `eda/mesh/services/backstage-catalog-api/pyproject.toml`
    - Add pytest and testing dependencies to dev-dependencies
    - _Requirements: 1.2, 3.2_

- [ ] 3. Create unit tests
  - [ ] 3.1 Create test configuration
    - Create `tests/conftest.py` with pytest fixtures
    - Set up mocking for Kubernetes client
    - _Requirements: 3.1, 3.5_
  
  - [ ] 3.2 Write tests for root endpoint
    - Test that GET / returns 200 OK
    - Test that response contains valid YAML
    - Test that response includes Location kind
    - Mock Kubernetes API to return sample ConfigMaps
    - _Requirements: 3.3, 3.4, 3.6_
  
  - [ ] 3.3 Write tests for ConfigMap endpoint
    - Test that GET /{namespace}/{configmap} returns ConfigMap data
    - Test error handling when ConfigMap doesn't exist
    - Test handling of empty ConfigMap data
    - _Requirements: 3.3, 3.4, 3.6_

- [ ]* 4. Add property test for directory structure
  - **Property 1: Application Directory Structure**
  - **Validates: Requirements 1.1, 1.2, 3.1, 7.2**
  - Create test that verifies app.py, pyproject.toml, and tests/ exist
  - Run for all apps matching the pattern eda/mesh/**/

- [ ] 5. Update Kustomize configuration
  - [ ] 5.1 Update kustomization.yaml to use configMapGenerator
    - Add configMapGenerator section
    - Reference app.py and pyproject.toml with relative paths
    - Use pattern: `../../../mesh/services/backstage-catalog-api/`
    - _Requirements: 2.1, 2.2, 2.4, 7.4_
  
  - [ ] 5.2 Remove embedded code from configmap.yaml
    - Delete the `data.app.py` and `data.pyproject.toml` sections
    - Keep only metadata and labels
    - Or delete configmap.yaml entirely if only used for code
    - _Requirements: 1.4_
  
  - [ ] 5.3 Verify deployment mounts ConfigMap correctly
    - Check that deployment.yaml mounts ConfigMap to /integration
    - Verify volumeMount configuration is correct
    - _Requirements: 5.1_

- [ ]* 6. Add property test for Kustomize configuration
  - **Property 6: ConfigMap Generator Configuration**
  - **Validates: Requirements 2.4**
  - Verify kustomization.yaml contains configMapGenerator with correct files

- [ ] 7. Add task command for running tests
  - [ ] 7.1 Add test task to Taskfile.yaml
    - Create `eda:test:unit` task
    - Accept APP parameter for app name
    - Accept CATEGORY parameter (default: services)
    - Install dev dependencies with uv
    - Run pytest
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [ ] 7.2 Test the task command locally
    - Run `task eda:test:unit APP=backstage-catalog-api`
    - Verify dependencies are installed
    - Verify tests execute successfully
    - _Requirements: 4.1, 4.2, 4.4_

- [ ]* 8. Add property test for pytest execution
  - **Property 9: Task Command Invokes Pytest**
  - **Validates: Requirements 4.2**
  - Verify running the task command invokes pytest

- [ ] 9. Test Kustomize build
  - [ ] 9.1 Build kustomization locally
    - Run `task eda:build` or `kubectl kustomize`
    - Verify ConfigMap is generated with app.py and pyproject.toml
    - Verify ConfigMap has hash suffix
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 9.2 Test ConfigMap regeneration on file change
    - Modify app.py (add a comment)
    - Rebuild kustomization
    - Verify ConfigMap name has different hash suffix
    - _Requirements: 2.3_

- [ ]* 10. Add property test for ConfigMap generation
  - **Property 4: ConfigMap Generation**
  - **Validates: Requirements 2.1, 2.2**
  - Build kustomization and verify ConfigMap contains app.py and pyproject.toml

- [ ]* 11. Add property test for hash suffix changes
  - **Property 5: Hash Suffix on File Change**
  - **Validates: Requirements 2.3**
  - Modify file, rebuild, verify ConfigMap name changed

- [ ] 12. Checkpoint - Verify local testing works
  - Ensure all unit tests pass
  - Ensure kustomize build succeeds
  - Ensure task commands work
  - Ask the user if questions arise

- [ ] 13. Deploy and verify
  - [ ] 13.1 Deploy to test environment
    - Apply kustomization to cluster
    - Verify pod starts successfully
    - Check pod logs for errors
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 13.2 Test the deployed application
    - Port-forward to the service
    - Send GET request to root endpoint
    - Verify response is valid YAML
    - Verify Kubernetes API integration works
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 14. Add CI/CD integration
  - [ ] 14.1 Update GitHub Actions workflow
    - Add step to run unit tests for backstage-catalog-api
    - Use the task command: `task eda:test:unit APP=backstage-catalog-api`
    - Fail build if tests fail
    - _Requirements: 4.3_
  
  - [ ] 14.2 Test CI workflow
    - Create a PR with a test change
    - Verify tests run in CI
    - Verify build fails if tests fail

- [ ] 15. Document the pattern
  - [ ] 15.1 Create README for backstage-catalog-api
    - Document the application structure
    - Explain how to run tests locally
    - Explain how to deploy
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 15.2 Update main EDA README
    - Add section on lightweight Python apps
    - Link to backstage-catalog-api as example
    - Document the task commands

- [ ] 16. Final checkpoint
  - Ensure all tests pass locally and in CI
  - Ensure application works in deployed environment
  - Ensure documentation is complete
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests
- Focus on backstage-catalog-api as the first example
- Pattern can be replicated for other lightweight Python apps
- UV base image requires no changes
- ConfigMap size limit is 1MB (sufficient for most apps)
