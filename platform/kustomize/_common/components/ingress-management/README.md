# Ingress Management Component

A kustomize component that transforms generic ingress resources into environment-specific configurations using simple replacements instead of runtime policy engines.

## Overview

This component uses kustomize's built-in replacement mechanism to transform ingress resources based on environment configuration. It's much simpler and more reliable than policy-based approaches like Kyverno.

## How It Works

1. **Label-based Selection**: Ingress resources are marked with `ingress.ctoaas.co/managed: "true"`
2. **ConfigMap Configuration**: Environment settings are stored in a ConfigMap
3. **Kustomize Replacements**: Built-in kustomize replacements transform the resources
4. **No Runtime Dependencies**: No admission controllers or webhooks required

## Usage

### 1. Mark Ingress Resources for Management

Add labels to ingress resources that should be managed:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backstage
  labels:
    ingress.ctoaas.co/managed: "true"
    # Optional: for services that need public domain access
    ingress.ctoaas.co/public-domain: "true"
spec:
  rules:
  - host: backstage.placeholder.local  # Will be replaced
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

### 2. Include Component in Overlay

Add the component to your kustomization.yaml:

```yaml
components:
  - ../../../../_common/components/ingress-management
```

### 3. Configure Environment Settings

Generate a ConfigMap with environment-specific settings:

```yaml
configMapGenerator:
  - name: ingress-environment-config
    literals:
      - primaryDomainSuffix=lab.ctoaas.co
      - secondaryDomainSuffix=lab.local.ctoaas.co
      - ingressClass=traefik
      - tlsEnabled=letsencrypt-prod
      - annotations=cert-manager.io/cluster-issuer=letsencrypt-prod
```

## Environment Examples

### Local Development

```yaml
configMapGenerator:
  - name: ingress-environment-config
    literals:
      - localDomainSuffix=127.0.0.1.nip.io
      - ingressClass=traefik
      - tlsEnabled=""
      - annotations=traefik.ingress.kubernetes.io/router.tls=true
```

### Lab Cluster

```yaml
configMapGenerator:
  - name: ingress-environment-config
    literals:
      - localDomainSuffix=lab.local.ctoaas.co
      - publicDomainSuffix=lab.ctoaas.co
      - ingressClass=traefik
      - tlsEnabled=letsencrypt-prod
      - annotations=cert-manager.io/cluster-issuer=letsencrypt-prod
```

## Advantages Over Kyverno

1. **Simplicity**: No admission controllers or webhooks
2. **Reliability**: No runtime dependencies that can fail
3. **Transparency**: Configuration is visible in generated manifests
4. **Debugging**: Easy to see what transformations are applied
5. **Performance**: No runtime processing overhead
6. **Global Config**: Easy to set DNS zones and other settings globally

## Migration from Hardcoded Ingress

1. Add management labels to existing ingress resources
2. Remove hardcoded domains
3. Include the component in your overlay
4. Configure environment-specific settings in ConfigMap

## Troubleshooting

### Check Generated Configuration

```bash
# See what the component generates
kustomize build --enable-helm path/to/overlay

# Check specific ingress transformations
kustomize build --enable-helm path/to/overlay | grep -A 20 "kind: Ingress"
```

### Verify Label Selectors

Ensure ingress resources have the correct labels:
- `ingress.ctoaas.co/managed: "true"` (required)
- `ingress.ctoaas.co/public-domain: "true"` (optional, for services needing public domain access)

### Check ConfigMap Values

Verify the environment ConfigMap has all required fields:
- `localDomainSuffix`
- `ingressClass`
- `tlsEnabled` (can be empty for local dev)
- `annotations`
- `publicDomainSuffix` (optional, for services with public domain access)