# Central Secret Store

This directory contains the central secret management configuration for the EDA platform.

## Overview

All secrets are managed centrally in the `central-secret-store` namespace and automatically distributed to other namespaces via Kyverno policies.

## Namespace

```bash
kubectl create namespace central-secret-store
kubectl label namespace central-secret-store purpose=central-secrets
```

## Required Secrets

### 1. GitHub Personal Access Token (PAT)
Used for Git operations and GitHub API access.

```bash
kubectl create secret generic github-pat \
  --from-literal=token=ghp_your_token_here \
  --from-literal=username=your-github-username \
  -n central-secret-store
```

### 2. GitHub OAuth App Credentials
Used for GitHub OAuth authentication in applications.

```bash
kubectl create secret generic github-oauth \
  --from-literal=client-id=your_oauth_client_id \
  --from-literal=client-secret=your_oauth_client_secret \
  -n central-secret-store
```



## Secret Distribution

Secrets are automatically distributed to target namespaces via Kyverno policies based on namespace labels. Label your namespaces with the secret types they need:

### Available Secret Types

- **`secrets/gh-docker-registry=true`**: Creates GHCR docker-registry secret from GitHub PAT
- **`secrets/gh-git-credentials=true`**: Creates GitHub Git credentials from GitHub PAT  
- **`secrets/gh-oauth-credentials=true`**: Creates GitHub OAuth credentials for app authentication

### Example Namespace Labels

```yaml
# For Kargo namespaces (need both docker registry and git access)
metadata:
  labels:
    secrets/gh-docker-registry: "true"
    secrets/gh-git-credentials: "true"

# For Backstage namespaces (need OAuth for authentication)
metadata:
  labels:
    secrets/gh-oauth-credentials: "true"
```

## Kyverno Policies

All secret distribution policies are managed in this directory (`kyverno-policies.yaml`). Policies:

1. **sync-gh-docker-registry**: Creates GHCR docker-registry secrets from GitHub PAT
2. **sync-gh-git-credentials**: Creates GitHub Git credentials from GitHub PAT
3. **sync-gh-oauth-credentials**: Creates GitHub OAuth credentials for applications

All policies use tag-based namespace targeting with `secrets/*` labels and source secrets from `central-secret-store`.

## Security Notes

1. **Never commit secrets to Git** - always create them manually in the cluster
2. **Use least privilege** - each secret should have minimal required permissions
3. **Rotate regularly** - implement proper secret rotation processes
4. **Audit access** - monitor secret usage across namespaces

## Troubleshooting

If secrets are not appearing in target namespaces:

1. Check namespace labels match Kyverno policy selectors
2. Verify Kyverno policies are active: `kubectl get cpol`
3. Check Kyverno logs: `kubectl logs -n kyverno -l app.kubernetes.io/name=kyverno`
4. Manually trigger policy: Add/update namespace labels