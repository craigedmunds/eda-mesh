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
  - Create simple health check verification (without full E2E tests initially)
  - Add basic deployment readiness validation
  - Configure stage verification with simple web checks
  - _Requirements: 3.1, 3.2_

- [ ] 5. Add comprehensive E2E testing
  - Integrate existing Playwright tests from apps/backstage/packages/app/e2e-tests/
  - Configure E2E test execution in Kargo verification phase
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

- [x] 7.2 Extract E2E test runner script
  - Move Python script from configmap.yaml to `scripts/e2e-runner.py`
  - Ensure proper file permissions and structure
  - _Requirements: 7.1, 7.2_

- [x] 7.3 Extract environment setup script
  - Move shell script from configmap.yaml to `scripts/setup-environment.sh`
  - Make script executable and properly structured
  - _Requirements: 7.1, 7.2_

- [x] 7.4 Clean up the rest of the backstage-kargo folder
  - Remove unecessary & mostly duplicated resources

- [ ] 8. Consolidate duplicate analysis templates
- [ ] 8.1 Analyze existing templates for functionality overlap
  - Review analysis-template.yaml, e2e-analysis-template.yaml, backstage-e2e-verification.yaml
  - Identify unique functionality in each template
  - _Requirements: 7.4_

- [ ] 8.2 Create consolidated verification template
  - Design single parameterized template for all verification types
  - Include health checks, E2E tests, and other verification steps
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

- [ ] 10. Implement reliable E2E test execution with artifact storage
- [ ] 10.1 Configure artifact storage volume
  - Set up volume mount to `/Users/craig/src/hmrc-eis/eda/argocd-eda/.backstage-e2e-artifacts`
  - Ensure proper permissions and directory structure
  - _Requirements: 8.2, 8.4_

- [ ] 10.2 Update E2E test execution logic
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

- [ ] 11.2 Test E2E verification workflow
  - Trigger Kargo promotion with new configuration
  - Verify E2E tests execute and produce artifacts
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
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## Current Blockers

1. **Kyverno Policy**: Only configured for `image-factory-kargo`, not `backstage-kargo`
2. **Promotion Execution**: Promotions created but not processed by controller
3. **Manual Secret Creation**: Must stop creating secrets manually - use Kyverno only