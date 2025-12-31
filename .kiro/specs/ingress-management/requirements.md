# Requirements Document

## Introduction

The current ingress configuration system requires hardcoded domain names and environment-specific annotations scattered across Helm values files and Kubernetes manifests. This creates maintenance overhead, environment coupling, and deployment complexity. We need an environment-aware ingress management system that automatically applies appropriate domain names, TLS configuration, and network-specific annotations based on environment context.

## Glossary

- **Ingress_Management_System**: The automated system that transforms generic ingress definitions into environment-specific configurations using kustomize components
- **Environment_Context**: The deployment environment (local development, lab cluster) that determines domain and network configuration
- **Generic_Ingress**: An ingress resource with environment-agnostic configuration using internal service identifiers and management labels
- **Environment_Component**: A kustomize component that applies environment-specific transformations to ingress resources
- **Domain_Template**: A pattern for generating environment-specific domain names from service identifiers
- **Network_Annotation**: Environment-specific ingress annotations for load balancers, TLS, and routing
- **Managed_Ingress**: An ingress resource that is accessible via internal domain patterns (e.g., *.lab.local.ctoaas.co) and marked with `ingress.ctoaas.co/managed: "true"`
- **Test_System**: The automated testing framework that validates kustomize build outputs and ingress transformations to prevent configuration regressions

## Requirements

### Requirement 1

**User Story:** As a platform engineer, I want to define ingress resources without hardcoded domain names, so that the same configuration can be deployed across multiple environments.

#### Acceptance Criteria

1. WHEN an ingress resource is created with a generic service identifier, THE Ingress_Management_System SHALL automatically generate the appropriate domain name for the current Environment_Context
2. WHEN the same ingress configuration is deployed to different environments, THE Ingress_Management_System SHALL apply different domain suffixes based on Environment_Context
3. WHEN a service identifier follows the naming convention, THE Ingress_Management_System SHALL construct predictable subdomain patterns
4. WHERE an ingress specifies a custom subdomain preference, THE Ingress_Management_System SHALL respect the preference while applying environment domain suffix
5. WHEN parsing service identifiers, THE Ingress_Management_System SHALL validate against the specified naming grammar

### Requirement 2

**User Story:** As a platform engineer, I want environment-specific network annotations to be applied automatically, so that ingress resources work correctly in each deployment environment without manual configuration.

#### Acceptance Criteria

1. WHEN an ingress is deployed to a development environment, THE Ingress_Management_System SHALL apply Traefik-specific annotations for local routing
2. WHEN an ingress is deployed to the lab cluster environment, THE Ingress_Management_System SHALL apply cert-manager annotations for automatic TLS certificate provisioning
3. WHEN network requirements differ between environments, THE Ingress_Management_System SHALL apply the appropriate ingress class and load balancer configuration
4. WHEN TLS is required, THE Ingress_Management_System SHALL automatically configure certificate management based on Environment_Context
5. WHEN ingress resources are created, THE Ingress_Management_System SHALL preserve any existing custom annotations while adding environment-specific ones
6. WHEN an ingress is deployed to the lab cluster environment, THE Ingress_Management_System SHALL configure internal domain patterns (`.lab.local.ctoaas.co`)
7. WHEN multiple domain patterns are configured, THE Ingress_Management_System SHALL create separate host rules for each domain pattern
8. WHEN TLS is enabled with multiple domains, THE Ingress_Management_System SHALL include all domain variants in the certificate configuration
9. WHEN local development uses nip.io domains, THE Ingress_Management_System SHALL generate appropriate `.127.0.0.1.nip.io` patterns
10. WHEN service names contain hyphens or special characters, THE Ingress_Management_System SHALL preserve them in the generated domain names

### Requirement 3

**User Story:** As a developer, I want to use a simple label-based system to mark ingress resources for automatic management, so that I can focus on service logic rather than environment-specific networking details.

#### Acceptance Criteria

1. WHEN an ingress resource includes a management label (`ingress.ctoaas.co/managed: "true"`), THE Ingress_Management_System SHALL process it for environment-specific transformation
2. WHEN an ingress resource lacks any management label, THE Ingress_Management_System SHALL leave it unchanged
3. WHEN generating domains, THE Ingress_Management_System SHALL derive the service name from the ingress metadata name
4. WHEN custom subdomains are specified in placeholder hosts, THE Ingress_Management_System SHALL preserve them in the generated domain
5. WHEN label values are invalid, THE Ingress_Management_System SHALL log errors and skip processing

### Requirement 4

**User Story:** As a platform engineer, I want the system to handle both Helm-generated and direct Kubernetes ingress manifests, so that all ingress resources in the cluster follow consistent patterns regardless of their creation method.

#### Acceptance Criteria

1. WHEN Helm charts generate ingress resources with management annotations, THE Ingress_Management_System SHALL transform them during deployment
2. WHEN direct Kubernetes manifests contain ingress resources, THE Ingress_Management_System SHALL apply the same transformation rules
3. WHEN ingress resources are updated, THE Ingress_Management_System SHALL reapply environment-specific configurations
4. WHEN ingress resources are deleted and recreated, THE Ingress_Management_System SHALL maintain consistent domain and annotation patterns
5. WHEN processing ingress resources, THE Ingress_Management_System SHALL preserve the original resource structure while adding environment-specific fields

### Requirement 5

**User Story:** As a platform engineer, I want different environment configurations to be easily maintainable and version-controlled, so that changes to networking configuration can be tracked and deployed systematically.

#### Acceptance Criteria

1. WHEN environment configurations are updated, THE Ingress_Management_System SHALL apply changes to new ingress resources immediately
2. WHEN configuration contains syntax errors, THE Ingress_Management_System SHALL report validation failures clearly
3. WHEN local development and lab cluster environments exist, THE Ingress_Management_System SHALL maintain separate configurations for each Environment_Context
4. WHEN configurations are deployed, THE Ingress_Management_System SHALL validate domain templates and annotation patterns
5. WHEN storing configurations, THE Ingress_Management_System SHALL encode them using YAML format for version control compatibility

### Requirement 7

**User Story:** As a platform engineer, I want to manage ingress resources with a simple label-based system, so that all managed services get consistent internal domain access without manual configuration.

#### Acceptance Criteria

1. WHEN an ingress resource has the label `ingress.ctoaas.co/managed: "true"`, THE Ingress_Management_System SHALL configure it with internal domain access only
2. WHEN a managed ingress is processed, THE Ingress_Management_System SHALL create host rules only for internal domain patterns (e.g., *.lab.local.ctoaas.co)
3. WHEN an ingress resource lacks the management label, THE Ingress_Management_System SHALL leave it unchanged
4. WHEN TLS is configured for a managed ingress, THE Ingress_Management_System SHALL include only the internal domain in the certificate configuration

### Requirement 8

**User Story:** As a developer, I want automatic TLS certificate management for production environments, so that services are secure by default without manual certificate configuration.

#### Acceptance Criteria

1. WHEN an ingress is deployed to the lab cluster environment, THE Ingress_Management_System SHALL automatically configure TLS termination
2. WHEN TLS is enabled, THE Ingress_Management_System SHALL generate appropriate certificate secret names based on domain patterns
3. WHEN certificate issuers are available, THE Ingress_Management_System SHALL apply the correct issuer annotations for the Environment_Context
4. WHEN TLS configuration is applied, THE Ingress_Management_System SHALL ensure certificate secrets are properly referenced
5. WHEN development environments are used, THE Ingress_Management_System SHALL optionally disable TLS for simplified local testing

### Requirement 6

**User Story:** As a platform engineer, I want to configure multiple paths per ingress resource, so that a single service can handle different endpoints with different backend services.

#### Acceptance Criteria

1. WHEN an ingress configuration specifies multiple paths, THE Ingress_Management_System SHALL create path rules for each specified path and backend service combination
2. WHEN multiple paths are configured for the same host, THE Ingress_Management_System SHALL include all paths in the same ingress resource
3. WHEN different paths point to different services, THE Ingress_Management_System SHALL configure appropriate backend service references for each path
4. WHEN path types are specified (Prefix, Exact), THE Ingress_Management_System SHALL apply the correct pathType for each path rule
5. WHEN multiple paths are used with TLS, THE Ingress_Management_System SHALL configure TLS for the host covering all paths

### Requirement 9

**User Story:** As a platform engineer, I want automated unit tests for kustomize build outputs, so that ingress configuration regressions are caught before deployment and I can ensure consistent ingress transformations across all overlays.

#### Acceptance Criteria

1. WHEN kustomize builds are executed for any overlay, THE Test_System SHALL validate that ingress resources are correctly transformed according to environment configuration
2. WHEN ingress resources have management labels, THE Test_System SHALL verify that domain transformations match expected patterns for each environment
3. WHEN TLS is configured in an environment, THE Test_System SHALL validate that certificate configurations include all required domains
4. WHEN testing ArgoCD ingress configurations, THE Test_System SHALL verify internal domain patterns are present in lab overlay builds
5. WHEN testing Backstage ingress configurations, THE Test_System SHALL verify internal domain patterns are present in overlay builds
6. WHEN testing Kargo ingress configurations, THE Test_System SHALL verify hardcoded domain patterns remain unchanged (no management labels)
7. WHEN kustomize build tests are executed, THE Test_System SHALL run as part of continuous integration to prevent regression deployment
8. WHEN test failures occur, THE Test_System SHALL provide clear error messages indicating which ingress configurations are incorrect
9. WHEN new overlays are added, THE Test_System SHALL automatically include them in the test suite without manual configuration

## Future Scope

The following requirements are planned for future implementation but are currently out of scope:

### Public Domain Access (Future)

**User Story:** As a platform engineer, I want to distinguish between private and public ingress resources, so that only designated services are exposed externally while maintaining internal accessibility for all managed services.

#### Future Acceptance Criteria

1. WHEN an ingress resource has the label `ingress.ctoaas.co/managed-public: "true"`, THE Ingress_Management_System SHALL configure it as a Public_Ingress with both internal and external domain access
2. WHEN a Public_Ingress is processed, THE Ingress_Management_System SHALL create host rules for both internal and external domain patterns (e.g., *.lab.local.ctoaas.co and *.lab.ctoaas.co)
3. WHEN TLS is configured for a Public_Ingress, THE Ingress_Management_System SHALL include both internal and external domains in the certificate configuration
4. WHEN an ingress resource has both private and public management labels, THE Ingress_Management_System SHALL treat it as a Public_Ingress and log a warning about conflicting labels

### External Domain Configuration (Future)

**User Story:** As a platform engineer, I want external domain access for user-facing applications, so that services can be accessed from outside the internal network.

#### Future Acceptance Criteria

1. WHEN an ingress is deployed to the lab cluster environment, THE Ingress_Management_System SHALL optionally configure external domain patterns (`.lab.ctoaas.co`) for public ingresses
2. WHEN external domain patterns are configured, THE Ingress_Management_System SHALL create separate host rules for both internal and external domains
3. WHEN TLS is enabled with dual domains, THE Ingress_Management_System SHALL include both internal and external domains in the certificate configuration