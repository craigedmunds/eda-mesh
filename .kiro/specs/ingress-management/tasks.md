# Implementation Plan: Ingress Management

## Overview

This implementation plan transforms the current hardcoded ingress management approach into an automated, environment-aware system using kustomize components. The plan includes creating a reusable kustomize component, setting up environment-specific configurations, and migrating existing ingress resources to use the new label-based management system.

## Tasks

- [x] 1. Create ingress management kustomize component
  - Create kustomize component with replacement rules for domain transformation
  - Set up label-based selection for managed ingress resources
  - Configure environment-specific ConfigMap integration
  - _Requirements: 3.1, 3.2_

- [ ] 2. Set up environment-specific overlay configurations
  - Configure local development overlay with component and ConfigMap
  - Configure lab cluster overlay with component and ConfigMap  
  - Set up domain suffixes, TLS settings, and annotations per environment
  - Test component integration with existing overlays
  - _Requirements: 5.3, 1.2, 2.1_

- [ ] 3. Test and validate component transformations
  - [ ] 3.1 Create test ingress resources with management labels
    - Define test ingress resources with placeholder domains
    - Add appropriate management labels for component selection
    - Include both single and multi-domain test cases
    - _Requirements: 1.1, 2.1_

  - [ ]* 3.2 Write property test for service identifier validation
    - **Property 5: Service identifier validation**
    - **Validates: Requirements 1.5, 2.10**

  - [ ] 3.3 Validate component transformations in both environments
    - Test local development transformations with nip.io domains
    - Test lab cluster transformations with cert-manager and TLS
    - Verify domain generation and annotation application
    - _Requirements: 1.2, 2.1, 2.2, 2.6, 2.9_

  - [ ]* 3.4 Write property test for environment-specific transformation
    - **Property 2: Environment-specific transformation**
    - **Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.4, 2.9**

- [ ] 4. Migrate existing applications to use ingress management
  - [ ] 4.1 Update backstage ingress configuration
    - Modify backstage ingress to use management labels and placeholder domains
    - Remove hardcoded domain-specific configuration from overlays
    - Test backstage ingress transformation in both environments
    - _Requirements: 4.1, 4.2_

  - [ ]* 4.2 Write property test for management label trigger
    - **Property 7: Management label trigger**
    - **Validates: Requirements 3.1, 3.2**

  - [ ] 4.3 Update ArgoCD ingress configuration
    - Modify ArgoCD ingress to use management labels and placeholder domains
    - Replace hardcoded domain with placeholder pattern
    - Remove environment-specific patches from overlays
    - _Requirements: 4.1, 4.2_

  - [ ]* 4.4 Write property test for domain generation consistency
    - **Property 1: Domain generation consistency**
    - **Validates: Requirements 1.1, 1.3, 3.3**

  - [ ] 4.5 Update uv-service ingress template
    - Modify Helm template to use management labels and placeholder domains
    - Replace hardcoded domain with placeholder pattern
    - Remove environment-specific annotations from template
    - _Requirements: 4.1, 4.2_

  - [ ]* 4.6 Write property test for creation method independence
    - **Property 8: Creation method independence**
    - **Validates: Requirements 4.1, 4.2**
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

  - [ ] 5.5 Add TLS configuration management
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
- [ ] 8. Final validation and testing
  - [ ]* 8.1 Write integration tests for complete workflow
    - Test end-to-end ingress transformation in isolated environments
    - Validate component behavior with real ingress resources
    - Verify cert-manager integration in lab cluster simulation
    - Test Helm chart integration with transformed ingress resources

  - [ ]* 8.2 Write property test for environment configuration separation
    - **Property 10: Environment configuration separation**
    - **Validates: Requirements 5.3, 5.5**

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.