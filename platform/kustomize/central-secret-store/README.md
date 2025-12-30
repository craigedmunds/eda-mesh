# Central Secret Store

This directory manages centralized secret distribution using External Secrets Operator (ESO).

## Overview

The central secret store approach provides:
- **Single source of truth** for all secrets
- **Automated distribution** to namespaces that need them
- **Consistent credentials** across all environments
- **No manual secret creation** required

## Architecture

1. **Source secrets** are stored in the `central-secret-store` namespace
2. **ClusterSecretStore** provides access to the source namespace
3. **ClusterExternalSecrets** define which secrets to sync to which namespaces
4. **ExternalSecrets** are automatically created in target namespaces
5. **Secrets** are automatically created and kept in sync

## Components

### ClusterSecretStore
- `cluster-secret-store.yaml` - Defines access to the central-secret-store namespace
- Uses Kubernetes provider to read secrets from the source namespace

### RBAC
- `eso-rbac.yaml` - Provides necessary permissions for ESO to read source secrets

### ClusterExternalSecrets
- `external-secrets/kargo-admin-credentials.yaml` - Syncs Kargo admin credentials
- `external-secrets/github-oauth.yaml` - Syncs GitHub OAuth credentials  
- `external-secrets/github-docker-registry.yaml` - Syncs GitHub container registry credentials
- `external-secrets/github-git-credentials.yaml` - Syncs GitHub Git credentials
- `external-secrets/cloudflare-api-token.yaml` - Syncs Cloudflare API token

## Usage

### Adding a New Secret

1. Create the source secret in the `central-secret-store` namespace:
   ```bash
   kubectl create secret generic my-secret -n central-secret-store \
     --from-literal=key1=value1 \
     --from-literal=key2=value2
   ```

2. Create a ClusterExternalSecret in `external-secrets/`:
   ```yaml
   apiVersion: external-secrets.io/v1
   kind: ClusterExternalSecret
   metadata:
     name: my-secret
   spec:
     refreshTime: 5m
     namespaceSelector:
       matchLabels:
         secrets/my-secret: "true"
     externalSecretSpec:
       secretStoreRef:
         name: central-secret-store
         kind: ClusterSecretStore
       target:
         name: my-secret
         creationPolicy: Owner
       data:
       - secretKey: key1
         remoteRef:
           key: my-secret
           property: key1
   ```

3. Label target namespaces:
   ```bash
   kubectl label namespace my-namespace secrets/my-secret=true
   ```

### Namespace Labels

Namespaces must be labeled to receive secrets:
- `secrets/kargo-admin-credentials=true` - Receives Kargo admin credentials
- `secrets/gh-oauth-credentials=true` - Receives GitHub OAuth credentials
- `secrets/gh-docker-registry=true` - Receives GitHub container registry credentials
- `secrets/gh-git-credentials=true` - Receives GitHub Git credentials
- `secrets/cloudflare-api-token=true` - Receives Cloudflare API token

## Monitoring

Check ClusterExternalSecret status:
```bash
kubectl get clusterexternalsecrets
```

Check ExternalSecret status in target namespaces:
```bash
kubectl get externalsecrets -A
```

Check secret creation:
```bash
kubectl get secrets -n <target-namespace>
```

## Troubleshooting

1. **ClusterExternalSecret not ready**: Check the ClusterSecretStore status
2. **ExternalSecret not syncing**: Check RBAC permissions and source secret existence
3. **Secret not created**: Check ExternalSecret events and ESO controller logs

View ESO logs:
```bash
kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets
```