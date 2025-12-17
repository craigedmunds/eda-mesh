# Implementation Plan - Back to Basics

## Core Issues to Resolve

- [x] 1. Fix Kyverno credential management
  - ✅ Created central secret store with tag-based policies
  - ✅ Removed old hardcoded namespace policies
  - ✅ Implemented generic secret distribution via `secrets.eda/*` labels
  - ✅ Added Kargo-specific labeling policy for `kargo.akuity.io/cred-type`
  - [ ] Test warehouse authentication with new central secret store
  - [ ] Verify freight is created automatically when new images are published
  - _Requirements: 2.1, 2.2_

- [ ] 2. Fix Kargo promotion execution
  - Investigate why promotions are created but not executed (no status updates)
  - Check shard configuration and controller processing
  - Ensure promotions run through all steps: git-clone → kustomize-set-image → git-commit → git-push → argocd-update → argocd-wait-for-sync
  - Verify ArgoCD integration works correctly
  - _Requirements: 2.2, 2.3_

- [ ] 3. Enable automatic promotion
  - Configure stage for automatic promotion when new freight is available
  - Test end-to-end flow: new image → warehouse discovers → freight created → promotion triggered → deployment updated
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4. Implement basic post-deployment validation
  - Create simple health check verification (without full acceptance tests initially)
  - Add basic deployment readiness validation
  - Configure stage verification with simple web checks
  - _Requirements: 3.1, 3.2_

- [ ] 5. Add comprehensive acceptance testing
  - Integrate existing Playwright tests from apps/backstage/packages/app/e2e-tests/
  - Configure acceptance test execution in Kargo verification phase
  - Add deployment readiness checks before running tests
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 6. Add advanced error handling and monitoring
  - Implement rollback mechanism if tests fail
  - Create comprehensive logging for the entire pipeline
  - Add retry logic and timeout handling
  - _Requirements: 6.1, 6.2, 6.4_

## Configuration Consolidation (New Requirements 7 & 8)

- [ ] 7. Extract scripts from ConfigMaps to external files
- [x] 7.1 Create scripts directory structure
  - Create `kustomize/backstage-kargo/scripts/` directory
  - Create subdirectories for different script types
  - _Requirements: 7.2_

- [x] 7.2 Extract acceptance test runner script
  - Move Python script from configmap.yaml to `scripts/acceptance-test-runner.py`
  - Ensure proper file permissions and structure
  - _Requirements: 7.1, 7.2_

- [x] 7.3 Extract environment setup script
  - Move shell script from configmap.yaml to `scripts/setup-environment.sh`
  - Make script executable and properly structured
  - _Requirements: 7.1, 7.2_

- [x] 7.4 Clean up the rest of the backstage-kargo folder
  - Remove unecessary & mostly duplicated resources

- [ ] 8. Consolidate duplicate analysis templates
- [x] 8.1 Analyze existing templates for functionality overlap
  - Review analysis-template.yaml, e2e-analysis-template.yaml, backstage-e2e-verification.yaml
  - Identify unique functionality in each template
  - _Requirements: 7.4_

- [-] 8.2 Create consolidated verification template
  - Design single parameterized template for all verification types
  - Include health checks, acceptance tests, and other verification steps
  - _Requirements: 7.4_

- [ ] 8.3 Update template to use external scripts
  - Modify template to mount scripts from external files
  - Configure proper volume mounts and init containers
  - _Requirements: 7.3_

- [ ] 9. Clean up manual and duplicate files
- [ ] 9.1 Evaluate manual resource files
  - Review manual-freight.yaml and manual-promotion.yaml
  - Determine if they serve testing purposes or should be removed
  - _Requirements: 7.5_

- [ ] 9.2 Remove or document manual files
  - Either delete obsolete manual files or move to examples/testing directory
  - Add clear documentation for any retained files
  - _Requirements: 7.5_

- [ ] 9.3 Update kustomization.yaml
  - Remove references to deleted duplicate templates
  - Add references to new consolidated resources
  - _Requirements: 7.4_

- [ ] 10. Implement reliable acceptance test execution with artifact storage
- [ ] 10.1 Configure artifact storage volume
  - Set up volume mount to `/Users/craig/src/hmrc-eis/eda/argocd-eda/.backstage-e2e-artifacts`
  - Ensure proper permissions and directory structure
  - _Requirements: 8.2, 8.4_

- [x] 10.2 Update acceptance test execution logic
  - Modify scripts to store test outputs in mounted artifact directory
  - Implement proper error handling and reporting
  - _Requirements: 8.1, 8.3_

- [ ] 10.3 Configure test report generation
  - Ensure Playwright generates HTML reports and screenshots
  - Store all artifacts in accessible format
  - _Requirements: 8.2_

- [ ] 11. Validate consolidated configuration
- [ ] 11.1 Test configuration deployment
  - Deploy consolidated configuration to local cluster
  - Verify all resources are created correctly
  - _Requirements: 8.5_

- [ ] 11.2 Test acceptance verification workflow
  - Trigger Kargo promotion with new configuration
  - Verify acceptance tests execute and produce artifacts
  - _Requirements: 8.1, 8.2_

- [ ] 11.3 Validate artifact accessibility
  - Confirm test reports and screenshots are accessible
  - Verify debugging information is available
  - _Requirements: 8.4_

- [ ] 12. Update documentation and finalize
- [ ] 12.1 Update README and documentation
  - Document new configuration structure
  - Explain script organization and usage
  - _Requirements: 7.5_

- [ ] 12.2 Clean up old files
  - Remove old ConfigMap with embedded scripts
  - Remove duplicate analysis templates
  - _Requirements: 7.1, 7.4_

- [ ] 12.3 Final validation
  - Run complete end-to-end test of consolidated configuration
  - Verify all requirements are met
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Test Organization Implementation

- [x] 13. Implement unified test execution system
- [x] 13.1 Create Playwright configuration for test discovery
  - Create `kustomize/backstage-kargo/playwright.config.ts` with glob patterns
  - Configure patterns to match `apps/backstage/tests/acceptance/**/*.spec.ts` and `apps/backstage/plugins/**/tests/acceptance/**/*.spec.ts`
  - Set up HTML reporter and artifact collection
  - _Requirements: 8.1_

- [x] 13.2 Update package.json test commands
  - Modify `kustomize/backstage-kargo/package.json` to use Playwright with new config
  - Ensure `test:docker` command executes all discovered tests
  - Configure proper working directory and paths
  - _Requirements: 8.1_

- [x] 13.3 Reorganize existing plugin tests
  - Move `apps/backstage/plugins/image-factory/e2e-tests/` to `apps/backstage/plugins/image-factory/tests/acceptance/`
  - Update any references to the old directory structure
  - Ensure test files use consistent naming patterns (*.spec.ts)
  - _Requirements: 8.1_

- [x] 14. Implement consolidated test reporting
- [x] 14.1 Configure Playwright reporters
  - Set up HTML reporter for human-readable results
  - Configure JUnit XML reporter for CI integration
  - Set up artifact collection (screenshots, traces) in proper directories
  - _Requirements: 8.4_

- [x] 14.2 Update test execution scripts
  - Modify existing test runner scripts to use new Playwright configuration
  - Ensure proper artifact storage in mounted volumes
  - Add traceability information to test reports
  - _Requirements: 8.4_

- [ ] 15. Integrate with Kargo verification
- [ ] 15.1 Update Kargo analysis templates
  - Modify existing analysis templates to use new test execution approach
  - Ensure proper integration with unified test runner
  - Configure timeout and retry policies for test execution
  - _Requirements: 8.2_

- [ ] 15.2 Test Kargo integration
  - Verify that Kargo promotions trigger unified test execution
  - Ensure test results properly feed back to Kargo promotion status
  - Validate artifact collection and accessibility
  - _Requirements: 8.2, 8.5_

- [ ]* 15.3 Write property test for Kargo integration
  - **Property 16: Kargo test integration**
  - **Validates: Requirements 8.2**

- [ ]* 15.4 Write property test for test failure reporting
  - **Property 18: Test failure reporting**
  - **Validates: Requirements 8.5**

- [ ] 16. Validate unified test system
- [ ] 16.1 Test discovery across multiple directories
  - Verify that tests from both central and plugin directories are discovered
  - Ensure no tests are missed due to location or naming
  - Validate proper test isolation between different test suites
  - _Requirements: 8.1, 8.3_

- [ ] 16.2 End-to-end validation
  - Run complete test suite via `npm run test:docker`
  - Verify consolidated reporting with traceability
  - Ensure integration with Kargo verification works correctly
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 16.3 Documentation and cleanup
  - Update README files to document new test organization
  - Remove any obsolete test runner scripts or configurations
  - Document how plugin teams should organize their tests
  - _Requirements: 8.1_

## Local Artifact Management Implementation

- [x] 17. Implement artifact retention and cleanup system
- [ ] 17.1 Create artifact cleanup service
  - ✅ Artifact cleanup is already implemented in post_deployment_e2e.py
  - ✅ Creates timestamped directories with retention logic
  - ✅ Includes logging and error handling for cleanup operations
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 17.2 Implement cleanup integration with test runner
  - ✅ Cleanup is integrated with the unified test runner
  - ✅ Cleanup triggers automatically after test completion
  - ✅ Handles concurrent access through unique timestamped directories
  - _Requirements: 12.1, 12.5_

- [ ]* 17.3 Write property test for artifact retention
  - **Property 19: Artifact retention policy**
  - **Validates: Requirements 9.1, 9.2**

- [ ]* 17.4 Write property test for cleanup integrity
  - **Property 20: Cleanup directory integrity**
  - **Validates: Requirements 9.3, 9.4**

- [ ]* 17.5 Write property test for cleanup error handling
  - **Property 21: Cleanup error handling**
  - **Validates: Requirements 9.5**

- [ ] 18. Implement centralized environment variable configuration
- [x] 18.1 Create central environment configuration
  - ✅ Standardized environment variables are defined (TEST_RESULTS_DIR, PLAYWRIGHT_HTML_REPORT, etc.)
  - ✅ Configuration validation and error handling implemented in post_deployment_e2e.py
  - ✅ Fallback mechanisms for missing configuration implemented
  - _Requirements: 10.1, 10.2_

- [ ] 18.2 Update plugin tests to use central configuration
  - Plugin tests currently don't have individual playwright configs
  - They rely on the unified test runner's central configuration
  - Need to verify this works correctly for all plugins
  - _Requirements: 10.3, 10.4, 10.5_

- [ ]* 18.3 Write property test for centralized environment variables
  - **Property 22: Centralized environment variable usage**
  - **Validates: Requirements 10.1, 10.2**

- [ ]* 18.4 Write property test for artifact storage consistency
  - **Property 23: Artifact storage consistency**
  - **Validates: Requirements 10.3, 10.4, 10.5**

- [ ] 19. Clean up and optimize image factory tests
- [ ] 19.1 Audit image factory tests for duplication and debug files
  - Current tests include: auth-investigation, debug, improved-auth, js-debug, working-auth, etc.
  - Many appear to be debugging/investigation files rather than proper acceptance tests
  - Identify which tests cover actual user workflows vs debugging
  - _Requirements: 11.1_

- [ ] 19.2 Separate local vs Kargo test execution requirements
  - Clarify whether image factory tests should run locally, in Kargo, or both
  - Define different test suites for local development vs deployment validation
  - Remove debug/investigation tests from acceptance test suite
  - _Requirements: 11.2, 11.3_

- [ ] 19.3 Create focused functional acceptance tests
  - Keep only: enrollment workflow, template validation, navigation tests
  - Remove: auth-investigation, debug, improved-auth, js-debug, working-auth
  - Ensure tests validate user-facing functionality with clear failure messages
  - _Requirements: 11.2, 11.3, 11.5_

- [ ]* 19.4 Write property test for test failure feedback
  - **Property 24: Test failure feedback quality**
  - **Validates: Requirements 11.3**

- [x] 20. Integrate artifact management with Kargo verification
- [x] 20.1 Update Kargo verification for artifact management
  - ✅ Kargo verification already triggers artifact management through post_deployment_e2e.py
  - ✅ Cleanup doesn't interfere with test result reporting (artifacts stored before cleanup)
  - ✅ Artifact management integrated into verification workflow
  - _Requirements: 12.2_

- [ ] 20.2 Test environment-independent cleanup
  - Verify cleanup works correctly in local development environment (not just Kargo)
  - Ensure recent artifacts remain accessible after cleanup
  - Test concurrent cleanup safety during simultaneous runs
  - _Requirements: 12.3, 12.4, 12.5_

- [ ]* 20.3 Write property test for integrated cleanup execution
  - **Property 25: Integrated cleanup execution**
  - **Validates: Requirements 12.1, 12.2**

- [ ]* 20.4 Write property test for environment-independent cleanup
  - **Property 26: Environment-independent cleanup**
  - **Validates: Requirements 12.3, 12.4**

- [ ]* 20.5 Write property test for concurrent cleanup safety
  - **Property 27: Concurrent cleanup safety**
  - **Validates: Requirements 12.5**

- [ ] 21. Validate complete artifact management system
- [ ] 21.1 Test local artifact management workflow
  - Run multiple local test executions to generate artifacts
  - Verify that .backstage-e2e-artifacts directory gets managed properly
  - Confirm plugin tests use centralized environment configuration
  - _Requirements: 9.1, 9.2, 10.1, 10.3_

- [ ] 21.2 Implement local artifact cleanup (separate from Kargo)
  - Current cleanup only works in Kargo environment
  - Need local cleanup mechanism for .backstage-e2e-artifacts directory
  - Ensure recent artifacts remain accessible for local debugging
  - _Requirements: 9.4, 12.4_

- [ ] 21.3 Validate plugin test environment variable usage
  - Verify that plugin tests (eda, image-factory) use central environment variables
  - Test that artifacts from plugin tests go to correct locations
  - Ensure consistent behavior across all plugin tests
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [x] 22. Update acceptance test script for verification execution consistency
- [x] 22.1 Update run-acceptance-tests.sh to handle verification execution
  - Ensure the script works correctly when called from Kargo verification
  - Update the script to handle both promotion and verification phases
  - Configure the script to work with `verification.reuse: false` setting
  - _Requirements: 8.2_

- [x] 22.2 Configure Stage for consistent verification execution
  - Add `verification.reuse: false` to Stage spec to disable verification caching
  - Ensure verification runs for every promotion during development
  - Test that verification executes consistently for the same freight
  - _Requirements: 8.2_

- [x] 22.3 Validate verification execution consistency
  - Test that verification runs every time when reuse is disabled
  - Verify that the acceptance test script integrates properly with verification
  - Ensure repeated promotions trigger verification each time
  - _Requirements: 8.2_



## Kargo Test Execution Reliability (Requirements 8.6, 8.7, 8.8, 8.9)

- [ ] 23. Fix Kargo AnalysisTemplate configuration to prevent duplicate test executions
- [x] 23.1 Update AnalysisTemplate with correct retry prevention settings
  - Set `restartPolicy: Never` in job spec to prevent pod restarts
  - Configure `failureLimit: 1` to prevent automatic retries on failure
  - Set `count: 1` to ensure metric is evaluated exactly once
  - Add explicit `failureCondition` to recognize failed jobs
  - _Requirements: 8.6, 8.7_

- [x] 23.2 Validate AnalysisTemplate configuration
  - Review current `backstage-verification.yaml` settings
  - Ensure interval setting (60s) is for status checking, not job execution frequency
  - Test that failed tests fail the promotion without retry
  - _Requirements: 8.6_

- [ ] 24. Implement consistent artifact directory naming
- [x] 24.1 Update artifact naming logic in post_deployment_e2e.py
  - Extract consistent identifier from KARGO_PROMOTION_ID environment variable
  - Use first 12 characters of UUID portion for Kargo jobs
  - Implement fallback naming for local/non-standard executions
  - _Requirements: 8.8_

- [x] 24.2 Add retry detection logic
  - Implement function to detect if execution is a retry by checking existing artifacts
  - Log warnings when retries are detected
  - Include retry count in execution metadata
  - _Requirements: 8.7, 8.8_

- [ ]* 24.3 Write property test for single execution per promotion
  - **Property 28: Single test execution per promotion**
  - **Validates: Requirements 8.7**

- [ ]* 24.4 Write property test for artifact naming consistency
  - **Property 29: Artifact directory naming consistency**
  - **Validates: Requirements 8.8**

- [ ] 25. Implement log artifact collection for Kargo UI
- [x] 25.1 Update test execution script to capture logs
  - Redirect all stdout/stderr to dedicated log file at /artifacts/verification.log
  - Ensure log file is flushed before script exits
  - Capture exit code properly after log redirection
  - _Requirements: 8.9_

- [x] 25.2 Declare log artifact in Verification spec
  - Add artifacts section to Stage verification configuration
  - Declare verification.log as artifact with name "verification-logs"
  - Specify correct path for log file collection
  - _Requirements: 8.9_

- [ ]* 25.3 Write property test for log artifact collection
  - **Property 30: Verification log artifact collection**
  - **Validates: Requirements 8.9**

- [ ] 26. Enhance execution metadata for traceability
- [x] 26.1 Expand metadata collection
  - Add kubernetes_pod_name and kubernetes_job_name to metadata
  - Include is_kargo_execution flag to distinguish execution environments
  - Add retry_attempt field to track unexpected retries
  - _Requirements: 8.7, 8.8_

- [x] 26.2 Implement comprehensive logging
  - Log all execution metadata at test start
  - Log artifact directory creation with full path
  - Log retry detection warnings prominently
  - _Requirements: 8.7, 8.8_

- [ ] 27. Validate reliability improvements
- [x] 27.1 Test local execution for single artifact creation
  - Run test with `npm run test:kubernetes -- --grep "should have Events link"`
  - Verify only one artifact directory is created
  - Check logs for absence of retry warnings
  - _Requirements: 8.7, 8.8_

- [ ] 27.2 Test Kargo integration for single execution
  - Trigger Kargo promotion and monitor AnalysisRun creation
  - Verify only one job is created per promotion
  - Check artifact directory count matches promotion count
  - Verify logs are accessible in Kargo UI
  - _Requirements: 8.6, 8.7, 8.9_

- [ ] 27.3 Test failure handling without retries
  - Introduce intentional test failure
  - Verify promotion fails without automatic retry
  - Confirm only one artifact directory created for failed execution
  - _Requirements: 8.6, 8.7_

- [ ] 28. Document reliability improvements
- [x] 28.1 Update Kargo configuration documentation
  - Document AnalysisTemplate retry prevention settings
  - Explain artifact naming strategy and traceability
  - Document log artifact collection for Kargo UI
  - _Requirements: 8.6, 8.7, 8.8, 8.9_

- [x] 28.2 Create troubleshooting guide
  - Document how to detect duplicate executions
  - Explain how to investigate retry causes
  - Provide steps for validating single execution behavior
  - _Requirements: 8.7, 8.8_

## Current Blockers

1. **Kyverno Policy**: Only configured for `image-factory-kargo`, not `backstage-kargo`
2. **Promotion Execution**: Promotions created but not processed by controller
3. **Manual Secret Creation**: Must stop creating secrets manually - use Kyverno only
4. **Duplicate Test Executions**: Multiple artifact directories with different suffixes suggest retries or duplicate job creation