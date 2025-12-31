# Environment-Aware Ingress Management System Design

## Overview

The Environment-Aware Ingress Management System uses kustomize components to automatically transform generic ingress resources into environment-specific configurations. This eliminates hardcoded domain names and environment-specific annotations from application manifests, enabling the same ingress definitions to work across local development and lab cluster environments.

The system works by detecting ingress resources with management labels (`ingress.ctoaas.co/managed: "true"`) and applying environment-specific transformations through kustomize's built-in replacement mechanism. Each environment overlay includes the ingress management component and provides environment-specific configuration through ConfigMaps.

## Architecture

```mermaid
graph TB
    subgraph "Application Layer"
        A[Generic Ingress Manifest]
        B[Helm Chart with Generic Values]
        C[Local Traefik Ingress Helm Chart]
    end
    
    subgraph "Kustomize Component System"
        D[Environment Detection via ConfigMap]
        E[Helm Chart Integration<br/>helmCharts: local charts]
        F[Private ReplacementTransformer<br/>ingress.ctoaas.co/managed: true]
        G[Public ReplacementTransformer<br/>ingress.ctoaas.co/managed-public: true]
        H[Label-based Selection]
    end
    
    subgraph "Environment-Specific Outputs"
        I[Private IngressRoute<br/>Internal: *.lab.local.ctoaas.co only]
        J[Public IngressRoute<br/>Internal + External: *.lab.local.ctoaas.co + *.lab.ctoaas.co]
        K[Templated Traefik Ingress<br/>Environment-specific annotations]
    end
    
    A --> H
    B --> H
    C --> E
    H --> D
    D --> F
    D --> G
    E --> K
    F --> I
    G --> J
```

The system provides multiple approaches for ingress management:

1. **Kustomize Component Approach**: Uses ReplacementTransformer components to remove original Ingress resources and generate technology-specific resources (e.g., Traefik IngressRoute) with appropriate access patterns
2. **Local Helm Chart Approach**: Uses kustomize's helmCharts integration with local Traefik ingress charts for better templating capabilities and reduced configuration repetition
3. **Hybrid Approach**: Combines both methods where appropriate, using Helm charts for complex templating and kustomize components for simple transformations

## Components and Interfaces

### 1. Ingress Label System

Applications mark ingress resources for management using a single label:

**Managed Ingress (Internal Access):**
```yaml
metadata:
  name: backstage  # Used as service name for domain generation
  labels:
    ingress.ctoaas.co/managed: "true"  # Internal access only
```

The system derives the service name from the ingress metadata name and uses kustomize replacements to transform placeholder domains into environment-specific domains.

### 2. Environment Detection

Kustomize components use environment-specific ConfigMaps to determine the current environment configuration:

```yaml
configMapGenerator:
  - name: ingress-environment-config
    literals:
      - primaryDomainSuffix=lab.ctoaas.co
      - secondaryDomainSuffix=lab.local.ctoaas.co
      - ingressClass=traefik
      - tlsEnabled=letsencrypt-prod
```

### 3. Kustomize Component System

The system uses a single kustomize component to handle managed ingress resources:

**Ingress Management Component (`ingress-management`):**
- Processes ingresses with `ingress.ctoaas.co/managed: "true"`
- Creates host rules for internal domains (e.g., `*.lab.local.ctoaas.co`)
- Suitable for all managed services requiring internal access

### 4. Environment-Specific Overlays

Each environment uses kustomize overlays to include the ingress management component and provide environment-specific configuration:

**Local Development Overlay:**
- Domain pattern: `{service-name}.127.0.0.1.nip.io`
- Traefik annotations for local routing
- TLS disabled for simplified development

**Lab Cluster Overlay:**
- Domain pattern: `{service-name}.lab.local.ctoaas.co` (internal access)
- cert-manager annotations for Let's Encrypt
- Cloudflare DNS-01 challenge configuration
- Automatic TLS secret generation

```

## Data Models

### Environment Configuration

**Base Configuration:**
```yaml
configMapGenerator:
  - name: ingress-environment-config
    literals:
      - primaryDomainSuffix=127.0.0.1.nip.io
      - ingressClass=traefik
      - tlsEnabled=""
      - annotations=traefik.ingress.kubernetes.io/router.tls=true
```

**Lab Cluster Overlay Configuration:**
```yaml
configMapGenerator:
  - name: ingress-environment-config
    literals:
      - localDomainSuffix=lab.local.ctoaas.co
      - ingressClass=traefik
      - tlsEnabled=letsencrypt-prod
      - annotations=cert-manager.io/cluster-issuer=letsencrypt-prod
```

### Private Ingress Template

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backstage  # Used for domain generation
  labels:
    ingress.ctoaas.co/managed: "true"  # Managed ingress
spec:
  rules:
  - host: "backstage"  # Will be suffixed with internal domain
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backstage
            port:
              name: http
```

### Transformed Managed Ingress (Lab Cluster)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backstage
  labels:
    ingress.ctoaas.co/managed: "true"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    managed-by: kustomize-ingress-component
spec:
  ingressClassName: traefik
  tls:
  - hosts:
    - backstage.lab.local.ctoaas.co
    secretName: backstage-lab-local-ctoaas-tls
  rules:
  - host: backstage.lab.local.ctoaas.co  # Internal access
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backstage
            port:
              name: http
```

For custom subdomains, developers can specify them in the placeholder host:
```yaml
spec:
  rules:
  - host: "api.backstage.placeholder.local"  # Results in api.backstage.lab.local.ctoaas.co
```
          service:
            name: backstage
            port:
              name: http
```

### Transformed Public Ingress (Lab Cluster)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd
  labels:
    ingress.ctoaas.co/managed-public: "true"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    managed-by: kustomize-ingress-component
spec:
  ingressClassName: traefik
  tls:
  - hosts:
    - argocd.lab.local.ctoaas.co
    - argocd.lab.ctoaas.co
    secretName: argocd-lab-ctoaas-tls
  rules:
  - host: argocd.lab.local.ctoaas.co  # Internal access
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backstage
            port:
              name: http
  - host: backstage.lab.local.ctoaas.co  # Second domain pattern for internal access
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backstage
            port:
              name: http
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Domain generation consistency
*For any* valid service identifier and environment context, the system should generate predictable domain names that follow the environment's domain suffix patterns and preserve service identifiers
**Validates: Requirements 1.1, 1.3, 3.3**

Property 2: Environment-specific transformation
*For any* ingress configuration, deploying to different environments should produce different domain suffixes, annotations, and network configurations appropriate for each environment
**Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.4, 2.9**

Property 3: Custom subdomain preservation
*For any* ingress with custom subdomain specifications, the system should preserve the custom subdomain while applying environment-specific domain suffixes
**Validates: Requirements 1.4, 3.4**

Property 4: Service identifier validation
*For any* service identifier input, the system should accept valid identifiers according to naming conventions and preserve special characters like hyphens in generated domains
**Validates: Requirements 1.5, 2.10**

Property 5: Annotation management
*For any* ingress transformation, the system should preserve existing custom annotations while adding environment-specific annotations without conflicts
**Validates: Requirements 2.5, 4.5**

Property 6: Management annotation trigger
*For any* ingress resource, the system should process it for transformation if and only if it contains the management annotation, leaving unmanaged resources unchanged
**Validates: Requirements 3.1, 3.2**

Property 7: Managed ingress domain restriction
*For any* ingress resource with the management label, the system should create host rules only for internal domain patterns and exclude external domains
**Validates: Requirements 7.1, 7.2**

Property 8: Unlabeled ingress preservation
*For any* ingress resource without management labels, the system should leave it completely unchanged
**Validates: Requirements 7.3**

Property 9: Creation method independence
*For any* ingress resource, the transformation rules should be applied consistently regardless of whether it was created through Helm charts or direct Kubernetes manifests
**Validates: Requirements 4.1, 4.2**

Property 10: Update and lifecycle consistency
*For any* managed ingress resource that is updated, deleted, or recreated, the system should reapply environment-specific configurations consistently
**Validates: Requirements 4.3, 4.4**

Property 11: Environment policy separation
*For any* set of environments, the system should maintain separate policy configurations that don't interfere with each other and are stored in version-controllable YAML format
**Validates: Requirements 5.3, 5.5**

Property 12: TLS configuration management
*For any* environment with TLS enabled, the system should automatically configure certificate management with appropriate issuer annotations and generate predictable certificate secret names
**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

Property 13: Development environment TLS flexibility
*For any* development environment, the system should support optional TLS disabling for simplified local testing
**Validates: Requirements 8.5**

Property 7: Managed ingress domain restriction
*For any* ingress resource with the management label, the system should create host rules only for internal domain patterns and exclude external domains
**Validates: Requirements 7.1, 7.2**

Property 8: Unlabeled ingress preservation
*For any* ingress resource without management labels, the system should leave it completely unchanged
**Validates: Requirements 7.3**

Property 14: Kustomize build validation
*For any* kustomize overlay containing ingress resources, the build output should contain correctly transformed ingress configurations that match the environment's expected domain patterns and TLS settings
**Validates: Requirements 9.1, 9.2**

Property 15: Environment-specific ingress transformation testing
*For any* environment overlay, ingress resources with management labels should be transformed according to that environment's domain configuration while preserving unlabeled ingress resources unchanged
**Validates: Requirements 9.3, 9.6**

Property 16: ArgoCD ingress domain testing
*For any* ArgoCD ingress configuration in lab overlay builds, the output should contain internal (.lab.local.ctoaas.co) domain patterns with appropriate TLS configuration
**Validates: Requirements 9.4**

Property 17: Backstage ingress domain testing
*For any* Backstage ingress configuration in overlay builds, the output should contain internal domain patterns
**Validates: Requirements 9.5**

Property 18: Regression prevention through continuous integration
*For any* pull request or commit, kustomize build tests should execute automatically and prevent deployment of configurations that fail ingress transformation validation
**Validates: Requirements 9.7, 9.8, 9.9**
## Error Handling

### Invalid Label Values
- Kustomize will fail to build if label selectors don't match any resources
- Clear error messages indicate which ingress resources need management labels
- Build-time validation prevents deployment of invalid configurations

### Missing Environment Configuration
- Kustomize build fails when required ConfigMap values are missing
- Clear error messages indicate which configuration values are required
- No runtime failures since all processing happens at build time

### Configuration Conflicts
- Kustomize replacement conflicts are detected at build time
- Clear error messages show which replacements are conflicting
- No runtime policy conflicts since no admission controllers are involved

### Domain Generation Errors
- Invalid domain patterns cause kustomize build failures
- Replacement errors are visible in build output
- No silent failures since all transformations are explicit

## Testing Strategy

### Dual Testing Approach

The system will use both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests** will verify:
- Specific examples of domain generation patterns
- Integration between Kyverno policies and Kubernetes API
- Error handling for common failure scenarios
- Policy deployment and configuration validation

**Property-Based Tests** will verify:
- Universal properties that should hold across all inputs using **fast-check** library
- Each property-based test will run a minimum of 100 iterations
- Domain generation consistency across various service identifiers and environments
- Annotation preservation and transformation correctness
- Environment-specific behavior across different contexts

### Property-Based Testing Configuration

The system will use **fast-check** as the property-based testing library for JavaScript/TypeScript components and **Hypothesis** for any Python-based validation tools.

Each property-based test will be tagged with comments explicitly referencing the correctness property from this design document using the format: `**Feature: ingress-management, Property {number}: {property_text}**`

### Integration Testing

- Test complete ingress transformation workflows using kustomize build
- Validate component behavior with real ingress resources
- Verify cert-manager integration in lab cluster environment
- Test Helm chart integration with transformed ingress resources

### End-to-End Testing

- Deploy sample applications with generic ingress configurations
- Verify domain resolution and TLS certificate provisioning
- Test ingress accessibility from external clients
- Validate environment-specific routing and load balancing

## Implementation Considerations

### Kustomize Component Performance
- Use efficient replacement patterns for resource transformation
- Minimize ConfigMap lookups through proper field path specifications
- Implement proper resource filtering to avoid unnecessary processing

### Environment Configuration Management
- Store environment configuration in version-controlled ConfigMaps
- Use GitOps workflows for component deployment and updates
- Implement validation for environment configuration changes

### Migration Strategy
- Provide tooling to migrate existing hardcoded ingress resources
- Support gradual rollout with label-based opt-in
- Maintain backward compatibility during transition period

### Monitoring and Observability
- Monitor kustomize build success rates for ingress transformations
- Log transformation events for debugging and audit purposes
- Provide dashboards for monitoring ingress management system health
### Transformed Managed Ingress (Lab Cluster)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backstage
  labels:
    ingress.ctoaas.co/managed: "true"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    managed-by: kustomize-ingress-component
spec:
  ingressClassName: traefik
  tls:
  - hosts:
    - backstage.lab.local.ctoaas.co
    secretName: backstage-lab-local-ctoaas-tls
  rules:
  - host: backstage.lab.local.ctoaas.co  # Internal access
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backstage
            port:
              name: http
```

For custom subdomains, developers can specify them in the placeholder host:
```yaml
spec:
  rules:
  - host: "api.backstage.placeholder.local"  # Results in api.backstage.lab.local.ctoaas.co
```