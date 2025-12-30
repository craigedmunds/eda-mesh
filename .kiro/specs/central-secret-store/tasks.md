# Implementation Plan: Central Secret Store

## Overview

This implementation plan addresses the immediate Docker registry authentication issue while establishing a robust, extensible central secret store system. The approach focuses on fixing the current secret format problems and then enhancing the overall system architecture.

## Tasks

- [x] 1. Fix Docker Registry Secret Format Issue
  - Update namespace labeling to distinguish between application and Kargo needs
  - Ensure Backstage can pull images successfully
  - _Requirements: 3.1, 4.1_

- [ ]* 1.1 Write property test for Docker registry secret format
  - **Property 5: Secret Format and Template Correctness**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [ ] 2. Implement Secret Naming and Organization Standards
  - [x] 2.1 Create application-specific Docker registry ClusterExternalSecret
    - Name: `application-docker-registry` for general application use
    - Target: namespaces with `secrets/gh-docker-registry: "true"` label
    - Format: `kubernetes.io/dockerconfigjson` type
    - _Requirements: 3.1, 4.1_

  - [x] 2.2 Update existing Kargo Docker registry ClusterExternalSecret
    - Rename to clearly indicate Kargo-specific purpose
    - Maintain existing Kargo namespace targeting
    - Keep Kargo-compatible format and labels
    - _Requirements: 3.1, 4.1_

  - [ ]* 2.3 Write property test for multi-format generation
    - **Property 6: Multi-Format Generation from Single Source**
    - **Validates: Requirements 3.2**

- [ ] 3. Update Namespace Labeling System
  - [ ] 3.1 Update Backstage namespace labels
    - Keep existing `secrets/gh-docker-registry: "true"` label (more specific than generic docker-registry)
    - Ensure compatibility with new application-specific ClusterExternalSecret
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Document namespace labeling conventions
    - Create clear documentation for which labels to use for different secret types
    - Include examples for common use cases
    - _Requirements: 2.1, 2.2_

  - [ ]* 3.3 Write property test for namespace-based provisioning
    - **Property 2: Namespace-Based Secret Provisioning**
    - **Validates: Requirements 2.1, 2.2**

- [ ] 4. Enhance Secret Distribution Patterns
  - [ ] 4.1 Implement expression-based namespace selectors
    - Add support for complex namespace selection patterns
    - Test with various namespace naming conventions
    - _Requirements: 2.4_

  - [ ] 4.2 Add automatic secret cleanup for label changes
    - Ensure secrets are removed when namespace labels change
    - Implement proper cleanup logic in ClusterExternalSecret configurations
    - _Requirements: 2.3, 2.5_

  - [ ]* 4.3 Write property test for dynamic label-based distribution
    - **Property 3: Dynamic Label-Based Distribution**
    - **Validates: Requirements 2.3, 2.5**

- [ ] 5. Checkpoint - Verify Secret Distribution Works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Secret Validation and Error Handling
  - [ ] 6.1 Add secret template validation
    - Validate ClusterExternalSecret templates before applying
    - Ensure generated secrets match expected Kubernetes types
    - _Requirements: 3.4_

  - [ ] 6.2 Implement error handling for central store unavailability
    - Add retry logic and graceful degradation
    - Ensure cached secrets continue working during outages
    - _Requirements: 1.5_

  - [ ]* 6.3 Write property test for secret format validation
    - **Property 5: Secret Format and Template Correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [ ] 7. Enhance Security and Access Controls
  - [ ] 7.1 Implement namespace access control enforcement
    - Ensure secrets are only distributed to authorized namespaces
    - Add validation for namespace selector security
    - _Requirements: 5.1, 5.2_

  - [ ] 7.2 Add audit logging for secret operations
    - Implement comprehensive logging for all secret operations
    - Include sufficient detail for security analysis
    - _Requirements: 1.4, 5.4_

  - [ ]* 7.3 Write property test for access control enforcement
    - **Property 8: Namespace Access Control Enforcement**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 8. Add Support for Additional Credential Types
  - [ ] 8.1 Enhance Git credentials distribution
    - Ensure Git credentials work for both ArgoCD and Kargo
    - Support different Git credential formats as needed
    - _Requirements: 4.2_

  - [ ] 8.2 Implement OAuth credentials distribution
    - Add support for OAuth application credentials
    - Ensure proper format for different OAuth consumers
    - _Requirements: 4.3_

  - [ ]* 8.3 Write property test for credential type support
    - **Property 7: Credential Type Support**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ] 9. Implement Secret Propagation and Consistency
  - [ ] 9.1 Add secret propagation monitoring
    - Ensure central secret updates propagate to all dependent namespaces
    - Implement monitoring for propagation delays
    - _Requirements: 1.2_

  - [ ] 9.2 Add dynamic policy update support
    - Ensure security policy changes update access controls automatically
    - Implement proper refresh mechanisms
    - _Requirements: 5.5_

  - [ ]* 9.3 Write property test for secret propagation consistency
    - **Property 1: Secret Propagation Consistency**
    - **Validates: Requirements 1.2**

- [ ] 10. Final Integration and Testing
  - [ ] 10.1 Test end-to-end secret distribution workflows
    - Verify complete workflows from central store to application use
    - Test with real applications (Backstage, Kargo, ArgoCD)
    - _Requirements: All_

  - [ ]* 10.2 Write property test for audit trail completeness
    - **Property 9: Audit Trail Completeness**
    - **Validates: Requirements 1.4, 5.4**

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Focus on fixing the immediate Docker registry issue first, then enhancing the overall system