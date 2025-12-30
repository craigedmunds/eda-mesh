# Implementation Plan: Ingress Management

## Overview

This implementation plan transforms the current hardcoded ingress management approach into an automated, environment-aware system using kustomize components. The plan includes creating a reusable kustomize component, setting up environment-specific configurations, and migrating existing ingress resources to use the new label-based management system.

## Tasks

- [x] 1. Create ingress management kustomize component
  - Create ingress kustomize component with replacement rules for internal domain transformation
  - Set up label-based selection for managed (`ingress.ctoaas.co/managed: "true"`) ingress resources
  - Configure environment-specific ConfigMap integration for the component
  - _Requirements: 3.1, 7.1_

- [x] 2. Set up environment-specific overlay configurations
  - Configure local development overlay with ingress management component and ConfigMap
  - Configure lab cluster overlay with ingress management component and ConfigMap  
  - Set up internal domain suffixes, TLS settings, and annotations per environment
  - Test component integration with existing overlays
  - _Requirements: 5.3, 1.2, 2.1, 7.1_

- [x] 3. Test and validate component transformations
  - [x] 3.1 Create test ingress resources with management labels
    - Define test ingress resources with placeholder domains for both private and public access
    - Add appropriate management labels for component selection (both private and public)
    - Include both single and multi-domain test cases
    - _Requirements: 1.1, 2.1, 7.1, 7.2_

  - [ ]* 3.2 Write property test for private ingress domain restriction
    - **Property 13: Private ingress domain restriction**
    - **Validates: Requirements 7.1, 7.3**

  - [ ]* 3.3 Write property test for public ingress dual domain access
    - **Property 14: Public ingress dual domain access**
    - **Validates: Requirements 7.2, 7.4**

  - [x] 3.4 Validate component transformations in both environments
    - Test local development transformations with nip.io domains for both private and public ingresses
    - Test lab cluster transformations with cert-manager and TLS for both private and public ingresses
    - Verify domain generation and annotation application for both component types
    - _Requirements: 1.2, 2.1, 2.2, 2.6, 2.9, 7.3, 7.4_

  - [ ]* 3.5 Write property test for public ingress TLS certificate coverage
    - **Property 15: Public ingress TLS certificate coverage**
    - **Validates: Requirements 7.5**

- [ ] 4. Migrate existing applications to use ingress management (backstage, kargo, any others?)
  - [x] 4.1 Update existing ingress application configuration
    - Modify existing ingress to use private management label (`ingress.ctoaas.co/managed: "true"`) and placeholder domains
    - Remove hardcoded domain-specific configuration from overlays
    - Test backstage ingress transformation in both environments (should only get internal domain)
    - _Requirements: 4.1, 4.2, 7.1, 7.3_

  - [ ]* 4.2 Write property test for conflicting label handling
    - **Property 16: Conflicting label handling**
    - **Validates: Requirements 7.6**

  - [x] 4.3 Update ArgoCD ingress configuration
    - Modify ArgoCD ingress to use public management label (`ingress.ctoaas.co/managed-public: "true"`) and placeholder domains
    - Replace hardcoded domain with placeholder pattern
    - Remove environment-specific patches from overlays
    - Test ArgoCD ingress transformation (should get both internal and external domains)
    - _Requirements: 4.1, 4.2, 7.2, 7.4_

  - [ ]* 4.4 Write property test for unlabeled ingress preservation
    - **Property 17: Unlabeled ingress preservation**
    - **Validates: Requirements 7.7**

  - [x] 4.5 Update uv-service ingress template
    - Modify Helm template to use appropriate management label (private or public based on use case) and placeholder domains
    - Replace hardcoded domain with placeholder pattern
    - Remove environment-specific annotations from template
    - _Requirements: 4.1, 4.2_

  - [ ]* 4.6 Write property test for domain generation consistency
    - **Property 1: Domain generation consistency**
    - **Validates: Requirements 1.1, 1.3, 3.3**
- [ ] 5. Implement advanced component features
  - [ ] 5.1 Add support for multiple domain patterns
    - Configure component to handle multi-domain environments
    - Add secondary domain suffix replacement rules
    - Test with lab cluster's dual domain configuration
    - _Requirements: 2.6, 2.7, 2.8_

  - [ ]* 5.2 Write property test for multiple domain pattern support
    - **Property 3: Multiple domain pattern support**
    - **Validates: Requirements 2.6, 2.7, 2.8**

  - [ ] 5.3 Implement custom subdomain preservation
    - Add logic to preserve custom subdomains from placeholder hosts
    - Support complex subdomain patterns in transformations
    - Test with various subdomain configurations
    - _Requirements: 1.4, 3.4_

  - [ ]* 5.4 Write property test for custom subdomain preservation
    - **Property 4: Custom subdomain preservation**
    - **Validates: Requirements 1.4, 3.4**

  - [x] 5.5 Add TLS configuration management
    - Configure automatic TLS secret name generation
    - Add cert-manager issuer annotation handling
    - Support TLS disable option for local development
    - _Requirements: 2.4, 2.8, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 5.6 Write property test for TLS configuration management
    - **Property 11: TLS configuration management**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Integration and documentation
  - [ ] 7.1 Create comprehensive documentation
    - Document component usage and configuration patterns
    - Provide examples for common ingress patterns
    - Create troubleshooting guide for component issues
    - Document migration process from hardcoded ingress resources
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 7.2 Write property test for annotation management
    - **Property 6: Annotation management**
    - **Validates: Requirements 2.5, 4.5**

  - [ ] 7.3 Create migration tooling and validation
    - Create tooling to identify hardcoded ingress resources
    - Generate patches to add management labels
    - Provide validation for successful component integration
    - _Requirements: 4.3, 4.4_

  - [ ]* 7.4 Write property test for update and lifecycle consistency
    - **Property 9: Update and lifecycle consistency**
    - **Validates: Requirements 4.3, 4.4**

  - [ ]* 7.5 Write property test for development environment TLS flexibility
    - **Property 12: Development environment TLS flexibility**
    - **Validates: Requirements 6.5**
- [x] 8. Implement kustomize build testing framework
  - [x] 8.1 Create kustomize build test infrastructure
    - Set up pytest-based testing framework for kustomize build validation
    - Create test utilities for executing `kustomize build` commands and parsing YAML output
    - Implement test discovery for automatically finding overlay directories to test
    - Create base test classes for ingress validation patterns
    - _Requirements: 9.1, 9.7, 9.9_

  - [ ]* 8.2 Write property test for kustomize build validation
    - **Property 18: Kustomize build validation**
    - **Validates: Requirements 9.1, 9.2**

  - [x] 8.3 Implement ArgoCD ingress build tests
    - Create tests for `platform/kustomize/seed/overlays/local/lab` ArgoCD ingress transformation
    - Validate that ArgoCD ingress contains both `.lab.local.ctoaas.co` and `.lab.ctoaas.co` domains
    - Verify TLS configuration includes both domains in certificate
    - Test ingress class and cert-manager annotations are correctly applied
    - _Requirements: 9.4_

  - [ ]* 8.4 Write property test for ArgoCD public ingress dual domain testing
    - **Property 20: ArgoCD public ingress dual domain testing**
    - **Validates: Requirements 9.4**

  - [x] 8.5 Implement Backstage ingress build tests
    - Create tests for `backstage/kustomize/overlays/local` Backstage ingress transformation
    - Validate that Backstage ingress contains only `.lab.local.ctoaas.co` domain (private access)
    - Verify external domain patterns are excluded from private ingress
    - Test TLS configuration for single domain certificate
    - _Requirements: 9.5_

  - [ ]* 8.6 Write property test for Backstage private ingress single domain testing
    - **Property 21: Backstage private ingress single domain testing**
    - **Validates: Requirements 9.5**

  - [x] 8.7 Implement Kargo ingress build tests
    - Create tests for Kargo ingress in `platform/kustomize/seed/supporting-applications/kargo/`
    - Validate that Kargo ingress remains unchanged (no management labels)
    - Verify hardcoded domain patterns are preserved exactly
    - Test that unlabeled ingress resources are not transformed
    - _Requirements: 9.6_

  - [ ]* 8.8 Write property test for environment-specific ingress transformation testing
    - **Property 19: Environment-specific ingress transformation testing**
    - **Validates: Requirements 9.3, 9.6**

  - [x] 8.9 Create Taskfile tasks for test execution
    - Add `test:ingress:kustomize` task to root Taskfile.yaml
    - Add `test:ingress:kustomize` tasks to relevant component Taskfiles (backstage, platform)
    - Configure test tasks to run pytest with appropriate discovery and reporting
    - Add tasks for running specific overlay tests individually
    - _Requirements: 9.7_

- [x] 9. Integrate kustomize tests with CI/CD
  - [x] 9.1 Add kustomize tests to GitHub Actions workflows
    - Update `.github/workflows/backstage.yml` to include kustomize build tests
    - Create new workflow `.github/workflows/platform-ingress.yml` for platform ingress tests
    - Configure test execution to run on pull requests and pushes to main branch
    - Set up test result reporting and failure notifications
    - _Requirements: 9.7, 9.8_

  - [ ]* 9.2 Write property test for regression prevention through continuous integration
    - **Property 22: Regression prevention through continuous integration**
    - **Validates: Requirements 9.7, 9.8, 9.9**

  - [x] 9.3 Configure test result reporting
    - Set up clear error messages for test failures indicating specific ingress configuration issues
    - Configure GitHub Actions to fail builds when kustomize tests fail
    - Add test result summaries to pull request comments
    - Create documentation for interpreting test failures
    - _Requirements: 9.8_

- [ ] 10. Checkpoint - Validate kustomize testing framework
  - Ensure all kustomize build tests pass, ask the user if questions arise.

- [ ] 11. Final validation and testing
  - [ ]* 11.1 Write integration tests for complete workflow
    - Test end-to-end ingress transformation in isolated environments
    - Validate component behavior with real ingress resources
    - Verify cert-manager integration in lab cluster simulation
    - Test Helm chart integration with transformed ingress resources

  - [ ]* 11.2 Write property test for environment configuration separation
    - **Property 10: Environment configuration separation**
    - **Validates: Requirements 5.3, 5.5**

- [-] 12. Troubleshoot ArgoCD sync issues
  - [x] 12.1 Investigate seed application sync status
    - Check why the seed application is OutOfSync and Progressing
    - Verify the application source path and targetRevision are correct
    - Understand why traefik is constantly progressing
    - Check for any sync policy conflicts or resource conflicts
    - _Requirements: 4.3, 4.4_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.