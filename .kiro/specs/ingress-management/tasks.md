# Implementation Plan

- [ ] 1. Set up ingress management kustomize structure
  - Create base directory with common policy and configuration templates
  - Set up overlay directories for local and pi environments
  - Define kustomization files for proper resource management
  - _Requirements: 5.3_

- [ ] 2. Create base environment configuration
  - [ ] 2.1 Implement base environment ConfigMap
    - Define ConfigMap structure with environment variables for domain suffix, TLS settings, and annotations
    - Set default values for local development environment
    - Include validation for required configuration fields
    - _Requirements: 1.1, 2.1_

  - [ ]* 2.2 Write property test for environment configuration validation
    - **Property 4: Service identifier validation**
    - **Validates: Requirements 1.5**

  - [ ] 2.3 Create environment-specific overlay patches
    - Implement pi cluster overlay with web.ctoaas.co domain and cert-manager configuration
    - Configure local development overlay with 127.0.0.1.nip.io domain and Traefik settings
    - _Requirements: 1.2, 2.1, 2.2_

  - [ ]* 2.4 Write property test for environment-specific domain transformation
    - **Property 2: Environment-specific domain transformation**
    - **Validates: Requirements 1.2**

- [ ] 3. Implement base Kyverno ingress management policy
  - [ ] 3.1 Create Kyverno ClusterPolicy for ingress transformation
    - Define policy matching rules for ingress resources with management annotation
    - Implement context loading for environment configuration from ConfigMap
    - Create mutation rules for domain name generation and annotation application
    - _Requirements: 3.1, 3.2_

  - [ ]* 3.2 Write property test for management annotation trigger
    - **Property 8: Management annotation trigger**
    - **Validates: Requirements 3.1, 3.2**

  - [ ] 3.3 Implement domain generation logic in policy
    - Extract service name from ingress metadata name
    - Parse existing host rules for custom subdomain detection
    - Generate environment-specific domain names using ConfigMap values
    - _Requirements: 1.1, 1.3, 3.3, 3.4_

  - [ ]* 3.4 Write property test for domain generation consistency
    - **Property 1: Domain generation consistency**
    - **Validates: Requirements 1.1, 1.3**

  - [ ]* 3.5 Write property test for service name resolution
    - **Property 9: Service name resolution**
    - **Validates: Requirements 3.3, 3.4**

- [ ] 4. Implement annotation and TLS management
  - [ ] 4.1 Add environment-specific annotation application
    - Read annotation templates from environment ConfigMap
    - Apply Traefik annotations for local development environment
    - Apply cert-manager annotations for pi cluster environment
    - Preserve existing custom annotations during transformation
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ]* 4.2 Write property test for environment-specific annotation application
    - **Property 5: Environment-specific annotation application**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 4.3 Write property test for annotation preservation during transformation
    - **Property 7: Annotation preservation during transformation**
    - **Validates: Requirements 2.5, 4.5**

  - [ ] 4.4 Implement TLS configuration management
    - Add TLS termination configuration based on environment settings
    - Generate certificate secret names from domain patterns
    - Configure cert-manager issuer annotations for pi cluster
    - Handle TLS disable option for local development
    - _Requirements: 2.4, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 4.5 Write property test for TLS configuration by environment
    - **Property 6: TLS configuration by environment**
    - **Validates: Requirements 2.4, 6.1, 6.3**

  - [ ]* 4.6 Write property test for certificate secret name generation
    - **Property 13: Certificate secret name generation**
    - **Validates: Requirements 6.2, 6.4**

  - [ ]* 4.7 Write property test for development environment TLS flexibility
    - **Property 14: Development environment TLS flexibility**
    - **Validates: Requirements 6.5**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Create integration with existing applications
  - [ ] 6.1 Update backstage ingress configuration
    - Modify kustomize/backstage/base/values.yaml to use generic domain placeholder
    - Add ingress management annotation to backstage Helm values
    - Remove hardcoded domain-specific configuration
    - _Requirements: 4.1, 4.2_

  - [ ] 6.2 Update uv-service ingress template
    - Modify helm/uv-service/templates/ingress.yaml to use management annotation
    - Replace hardcoded domain with placeholder pattern
    - Remove environment-specific annotations from template
    - _Requirements: 4.1, 4.2_

  - [ ]* 6.3 Write property test for consistent transformation across creation methods
    - **Property 10: Consistent transformation across creation methods**
    - **Validates: Requirements 4.1, 4.2**

- [ ] 7. Implement custom subdomain support
  - [ ] 7.1 Add subdomain parsing from existing host rules
    - Parse placeholder host patterns to extract custom subdomains
    - Preserve subdomain preferences in domain generation
    - Handle multiple host rules with different subdomain patterns
    - _Requirements: 1.4_

  - [ ]* 7.2 Write property test for custom subdomain preservation
    - **Property 3: Custom subdomain preservation**
    - **Validates: Requirements 1.4**

- [ ] 8. Add policy deployment and validation
  - [ ] 8.1 Integrate ingress management into seed applications
    - Add ingress management kustomize resources to seed/base structure
    - Configure environment-specific overlays in seed/overlays/local/pi
    - Update ArgoCD applications to deploy ingress management policies
    - _Requirements: 5.3_

  - [ ]* 8.2 Write property test for environment policy separation
    - **Property 12: Environment policy separation**
    - **Validates: Requirements 5.3**

  - [ ] 8.3 Add policy validation and error handling
    - Implement validation for environment ConfigMap structure
    - Add error logging for invalid ingress configurations
    - Create fallback behavior for missing environment configuration
    - _Requirements: 3.5, 5.2, 5.4_

- [ ] 9. Create migration tooling and documentation
  - [ ] 9.1 Develop migration scripts for existing ingress resources
    - Create tooling to identify hardcoded ingress resources
    - Generate patches to add management annotations
    - Provide validation for successful migration
    - _Requirements: 4.3, 4.4_

  - [ ]* 9.2 Write property test for update and recreate consistency
    - **Property 11: Update and recreate consistency**
    - **Validates: Requirements 4.3, 4.4**

  - [ ] 9.3 Create comprehensive documentation
    - Document annotation-based ingress management system
    - Provide examples for common ingress patterns
    - Create troubleshooting guide for policy issues
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 9.4 Write integration tests for complete workflow
  - Test end-to-end ingress transformation in isolated environments
  - Validate Kyverno policy behavior with real ingress resources
  - Verify cert-manager integration in pi cluster simulation
  - Test Helm chart integration with transformed ingress resources

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.