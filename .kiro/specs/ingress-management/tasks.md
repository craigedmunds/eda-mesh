# Implementation Plan: Ingress Management

## Overview

This implementation plan enhances the current ingress management system by adding local Helm chart templating capabilities to eliminate repetitive Traefik annotations and complex JSON patches. The plan focuses on creating a reusable Traefik ingress Helm chart, integrating it with kustomize overlays, and migrating existing ingress resources to use the improved templating system while maintaining the existing label-based management approach.

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

  - [x] 3.2 Validate component transformations in both environments
    - Test local development transformations with nip.io domains for both private and public ingresses
    - Test lab cluster transformations with cert-manager and TLS for both private and public ingresses
    - Verify domain generation and annotation application for both component types
    - _Requirements: 1.2, 2.1, 2.2, 2.6, 2.9, 7.3, 7.4_

- [x] 4. Migrate existing applications to use ingress management (backstage, kargo, any others?)
  - [x] 4.1 Update existing ingress application configuration
    - Modify existing ingress to use private management label (`ingress.ctoaas.co/managed: "true"`) and placeholder domains
    - Remove hardcoded domain-specific configuration from overlays
    - Test backstage ingress transformation in both environments (should only get internal domain)
    - _Requirements: 4.1, 4.2, 7.1, 7.3_

  - [x] 4.2 Update ArgoCD ingress configuration
    - Modify ArgoCD ingress to use public management label (`ingress.ctoaas.co/managed-public: "true"`) and placeholder domains
    - Replace hardcoded domain with placeholder pattern
    - Remove environment-specific patches from overlays
    - Test ArgoCD ingress transformation (should get both internal and external domains)
    - _Requirements: 4.1, 4.2, 7.2, 7.4_

  - [x] 4.3 Update uv-service ingress template
    - Modify Helm template to use appropriate management label (private or public based on use case) and placeholder domains
    - Replace hardcoded domain with placeholder pattern
    - Remove environment-specific annotations from template
    - _Requirements: 4.1, 4.2_

- [x] 5. Implement advanced component features
  - [x] 5.1 Add support for multiple domain patterns
    - Configure component to handle multi-domain environments
    - Add secondary domain suffix replacement rules
    - Test with lab cluster's dual domain configuration
    - _Requirements: 2.6, 2.7, 2.8_

  - [x] 5.2 Implement custom subdomain preservation
    - Add logic to preserve custom subdomains from placeholder hosts
    - Support complex subdomain patterns in transformations
    - Test with various subdomain configurations
    - _Requirements: 1.4, 3.4_

  - [x] 5.3 Add TLS configuration management
    - Configure automatic TLS secret name generation
    - Add cert-manager issuer annotation handling
    - Support TLS disable option for local development
    - _Requirements: 2.4, 2.8, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.



- [x] 8. Implement kustomize build testing framework
  - [x] 8.1 Create kustomize build test infrastructure
    - Set up pytest-based testing framework for kustomize build validation
    - Create test utilities for executing `kustomize build` commands and parsing YAML output
    - Implement test discovery for automatically finding overlay directories to test
    - Create base test classes for ingress validation patterns
    - _Requirements: 9.1, 9.7, 9.9_

  - [x] 8.2 Implement ArgoCD ingress build tests
    - Create tests for `platform/kustomize/seed/overlays/local/lab` ArgoCD ingress transformation
    - Validate that ArgoCD ingress contains both `.lab.local.ctoaas.co` and `.lab.ctoaas.co` domains
    - Verify TLS configuration includes both domains in certificate
    - Test ingress class and cert-manager annotations are correctly applied
    - _Requirements: 9.4_


  - [x] 8.3 Implement Backstage ingress build tests
    - Create tests for `backstage/kustomize/overlays/local` Backstage ingress transformation
    - Validate that Backstage ingress contains only `.lab.local.ctoaas.co` domain (private access)
    - Verify external domain patterns are excluded from private ingress
    - Test TLS configuration for single domain certificate
    - _Requirements: 9.5_


  - [x] 8.4 Implement Kargo ingress build tests
    - Create tests for Kargo ingress in `platform/kustomize/seed/supporting-applications/kargo/`
    - Validate that Kargo ingress remains unchanged (no management labels)
    - Verify hardcoded domain patterns are preserved exactly
    - Test that unlabeled ingress resources are not transformed
    - _Requirements: 9.6_


  - [x] 8.5 Create Taskfile tasks for test execution
    - Add `test:ingress` task to root Taskfile.yaml
    - Add `test:ingress` tasks to relevant component Taskfiles (backstage, platform)
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


  - [x] 9.2 Configure test result reporting
    - Set up clear error messages for test failures indicating specific ingress configuration issues
    - Configure GitHub Actions to fail builds when kustomize tests fail
    - Add test result summaries to pull request comments
    - Create documentation for interpreting test failures
    - _Requirements: 9.8_

- [x] 10. Implement traefik-ingress Helm chart
  - [x] 10.1 Create traefik-ingress Helm chart structure
    - Create `helm/traefik-ingress/Chart.yaml` with chart metadata
    - Create `helm/traefik-ingress/values.yaml` with configurable parameters for service name, namespace, internal/public domain patterns, and TLS settings
    - Create `helm/traefik-ingress/templates/ingress.yaml` with Traefik-specific annotations and support for both internal-only and public (internal+external) domain patterns
    - Include TLS configuration with cert-manager integration and environment-specific certificate issuers
    - Support the same domain patterns as existing system: `localDomainSuffix` and `publicDomainSuffix`
    - _Requirements: 2.1, 2.2, 2.4, 2.6, 2.7, 2.8, 3.1, 7.1, 7.2, 8.1, 8.2, 8.3_


  - [x] 10.2 Integrate Helm chart with kustomize overlays using environment configuration
    - Update existing kustomize overlays to use `helmCharts:` with local chart reference
    - Configure `helmGlobals.chartHome` to point to local helm directory
    - Pass environment-specific values from existing `ingress-environment-config` ConfigMap to Helm chart (localDomainSuffix, publicDomainSuffix, ingressClass, tlsEnabled, annotations)
    - Test Helm chart integration with `task ingress:test:sample:build` command
    - _Requirements: 1.2, 2.1, 2.6, 5.3, 8.1_


  - [x] 10.3 Test Helm chart with lab environment configuration
    - Test chart with lab environment values: `localDomainSuffix=lab.local.ctoaas.co`, `publicDomainSuffix=lab.ctoaas.co`, `tlsEnabled=letsencrypt-prod`
    - Verify chart generates correct internal-only ingress (single domain) and public ingress (dual domains)
    - Validate TLS configuration includes appropriate cert-manager annotations and certificate secret names
    - Test using `task ingress:test:sample:build` with different chart values
    - _Requirements: 2.6, 2.7, 2.8, 7.1, 7.2, 8.1, 8.2, 8.3_


  - [x] 10.4 Migrate existing repetitive ingress configurations
    - Replace hardcoded Traefik annotations in ArgoCD, Backstage, and other ingress resources with Helm chart usage
    - Remove complex JSON patches from kustomize overlays that add Traefik annotations
    - Update uv-service Helm chart to use the new traefik-ingress chart as a dependency or template
    - Verify all migrated ingress resources generate the same output as before
    - _Requirements: 2.5, 4.1, 4.2, 4.3_


- [x] 11. Enhance Helm chart to support multiple ingress resources
  - [x] 11.1 Update chart values structure to support ingresses array
    - Modify `values.yaml` to include an `ingresses` array alongside existing single-service values for backward compatibility
    - Implement hierarchical value inheritance where root-level values are inherited by individual ingresses
    - Support individual ingress overrides for service, domains, TLS, and access pattern configuration
    - _Requirements: 1.5, 2.5, 3.5_

  - [x] 11.2 Update Helm template to iterate over ingresses array
    - Modify `templates/ingress.yaml` to use a range loop over the ingresses array
    - Implement value merging logic where individual ingress values override root-level defaults
    - Ensure each generated ingress resource has unique names and proper namespace assignment
    - Support both single-service (backward compatibility) and multi-service configurations
    - _Requirements: 1.1, 1.2, 1.5_

  - [-] 11.3 Test enhanced chart with multiple ingress configurations
    - Create test configurations with multiple services (kargo, rabbitmq, argo-rollouts)
    - Verify hierarchical value inheritance works correctly (common domains, individual overrides)
    - Test both internal and public access patterns within the same chart instance
    - Validate TLS certificate generation for multiple ingresses with different access patterns
    - _Requirements: 2.7, 2.8, 3.1, 3.2, 3.5_

- [x] 12. Update existing ingress configurations to use enhanced chart
  - [x] 12.1 Migrate lab overlay to use multi-service chart
    - Update `platform/kustomize/seed/overlays/local/lab/kustomization.yaml` to use enhanced chart
    - Configure multiple ingresses (argocd, kargo, rabbitmq, argo-rollouts) in single chart instance
    - Define common values (localDomainSuffix, publicDomainSuffix, TLS settings) at root level
    - Extend unit tests to include any additional ingresses (consider how much duplicated code their is in each test atm and refactor to reduce)
    - Test that all ingresses generate correctly with appropriate domain patterns & tls (we already have unit tests: task ingress:test)
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 12.2 Update other overlays to use enhanced chart pattern
    - Update local development overlays to use multi-service pattern where applicable
    - Ensure backward compatibility with existing single-service configurations
    - Verify that environment-specific values are correctly applied to all ingresses
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 13. Validate enhanced system functionality
  - [ ] 13.1 Test kustomize build outputs for multi-service chart
    - Verify that `kustomize build` generates correct ingress resources for each service
    - Validate domain generation follows environment-specific patterns
    - Ensure TLS configuration includes appropriate domains for each access pattern
    - Test that individual ingress overrides work correctly
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ] 13.2 Update existing kustomize build tests for multi-service support
    - Modify existing test suite to validate multi-service ingress generation
    - Add tests for hierarchical value inheritance and override behavior
    - Ensure tests cover both internal and public access patterns within same chart
    - Update test assertions to handle multiple ingress resources from single chart
    - _Requirements: 5.1, 5.2, 5.6, 5.7_

- [ ] 14. Documentation and cleanup for multi-service enhancement
  - [ ] 14.1 Update Helm chart documentation for multi-service support
    - Update `helm/traefik-ingress/README.md` with multi-service configuration examples
    - Document hierarchical value inheritance patterns and override behavior
    - Provide examples for common use cases (platform services, mixed access patterns)
    - Document backward compatibility with single-service configurations
    - _Requirements: 1.1, 1.2, 3.1, 3.2_

  - [ ] 14.2 Remove superseded kustomize components
    - Remove old kustomize component-based ingress management files if they exist
    - Clean up any unused ConfigMap generators or replacement transformers
    - Update any remaining references to old label-based management system
    - _Requirements: 4.1, 4.2_

- [ ] 15. Final validation of enhanced system
  - [ ] 15.1 End-to-end testing of multi-service chart
    - Deploy enhanced configuration to lab environment
    - Verify all ingresses are accessible with correct domain patterns
    - Test TLS certificate provisioning for multiple services
    - Validate that both internal and public access patterns work correctly
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 3.1, 3.2_

  - [ ] 15.2 Performance and maintainability validation
    - Verify that single chart instance performs well with multiple ingresses
    - Confirm that common value changes propagate correctly to all ingresses
    - Validate that debugging and troubleshooting remain straightforward
    - _Requirements: 4.1, 4.3, 5.1_

## Superseded Tasks

The following tasks were part of the original kustomize component-based approach and are no longer needed with the current Helm chart implementation:

### Component-Based Tasks (Superseded)
- Task 7: Integration and documentation - replaced by task 14 which covers Helm chart documentation
- Tasks 1-2: Kustomize component creation and configuration - replaced by Helm chart approach (tasks 10.1-10.4)
- Tasks 3.2, 3.3, 3.5: Property tests for label-based management - not applicable to Helm chart approach  
- Tasks 4.2, 4.4, 4.6: Property tests for label handling - not needed with direct chart generation
- Tasks 5.1-5.4: Advanced component features - functionality built into Helm template
- Tasks 7.2-7.5: Component-specific property tests - replaced by chart validation
- Tasks 11.1-11.2: Component integration tests - replaced by Helm chart testing