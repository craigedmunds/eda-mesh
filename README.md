# Argocd App Of Apps

## Repomix

Repomix is used to generate an AI readable summary of the repo

`npx repomix`

## Event Driven Architecture

This repository contains an event-driven architecture implementation with ArgoCD, featuring automated container image lifecycle management through the Image Factory system and comprehensive Backstage integration.

## Image Factory - Container Lifecycle Management

The Image Factory provides automated container image lifecycle management with the following key features:

### Backstage Integration
- **ManagedImage Entities**: Custom entity type for tracking container images
- **Container Versions Tab**: View and manage image versions from GHCR and Docker Hub
- **GitHub Actions Integration**: Monitor build workflows and trigger rebuilds
- **Copy-to-Clipboard**: Easy access to image references and digests
- **Registry Links**: Direct navigation to container registry pages

### Key Features
- **Semantic Version Filtering**: Shows only meaningful version tags (1.2.3, v0.6.2) while filtering out SHA-based tags
- **Multi-Registry Support**: Works with GitHub Container Registry (GHCR) and Docker Hub
- **Proxy-Based Architecture**: Secure API calls through Backstage backend proxy
- **Real-time Updates**: Refresh capabilities with loading states and error handling

### Architecture Highlights
- **Kargo Integration**: Automated freight promotion and dependency tracking
- **CDK8s Code Generation**: Infrastructure as code for Kubernetes resources
- **Property-Based Testing**: Comprehensive test coverage with correctness properties
- **Event-Driven Rebuilds**: Automatic image rebuilds on base image updates

# Using the seed

In order to instantiate this in a new argocd cluster...

## 1. Install ArgoCD and Seed

Install ArgoCD and create the seed application:

```bash
kustomize build seed/overlays/local/pi | kubectl apply -f -
```

This will:
- Create the argocd namespace with proper secret management labels
- Install ArgoCD from the official manifests
- Create the eda-bootstrap application

Get the admin password:

```bash
kubectl get secret argocd-initial-admin-secret -n argocd -o json | jq '.data.password' -r | base64 -D
```

Or via argocd CLI:

```bash
argocd login --core
argocd admin initial-password -n argocd
```

## 2. Setup Central Secret Store

**IMPORTANT**: All secrets must be created in the central secret store. Never create secrets manually in individual namespaces.

Create the central secret store and policies:

```bash
kubectl apply -k kustomize/central-secret-store/
```

### Required Secrets

Create all secrets in the `central-secret-store` namespace:

#### GitHub Personal Access Token
```bash
kubectl create secret generic github-pat \
  --from-literal=token="$GITHUB_PAT_BUILDTOOLING" \
  --from-literal=username="$GITHUB_BUILD_USERNAME" \
  -n central-secret-store
```

#### GitHub OAuth Credentials
```bash
kubectl create secret generic github-oauth \
  --from-literal=client-id="$GITHUB_BUILD_CLIENTID" \
  --from-literal=client-secret="$GITHUB_BUILD_CLIENTSECRET" \
  -n central-secret-store
```

#### Cloudflare API Token (for cert-manager DNS challenges)
```bash
kubectl create secret generic cloudflare-api-token \
  --from-literal=api-token="$CLOUDFLARE_API_TOKEN" \
  -n central-secret-store
```



**Note**: Secrets will be automatically distributed to target namespaces via Kyverno policies based on namespace labels.

## 3. Get ArgoCD Admin Password

Get the rabbitmq admin user & password:

`kubectl get secret camel-k-mesh-default-user -n camel-k-mesh -o json | jq '.data.username' -r | base64 -D`

`kubectl get secret camel-k-mesh-default-user -n camel-k-mesh -o json | jq '.data.password' -r | base64 -D`

## Working on a feature branch

In order to work on a feature branch of this repo, to avoid impacting others whilst work is in progress:

Create an overlay for the kustomize seed application (e.g. kustomize/seed/overlays/feature-branch-name)

Create an overlay for the kustomize mesh application (e.g. kustomize/mesh/overlays/feature-branch-name)

Create an overlay for the root seed application (e.g. seed/overlays/local/craig)

Re-Apply the seed with the overlay:

`kustomize build seed/overlays/local/craig | kubectl apply -f -`

## Kargo

If including kargo, it expects a secret to be pre

# Run this once to create the secret
pass=$(openssl rand -base64 48 | tr -d "=+/" | head -c 32)
echo "Password: $pass"
hashed_pass=$(htpasswd -bnBC 10 "" $pass | tr -d ':\n')
signing_key=$(openssl rand -base64 48 | tr -d "=+/" | head -c 32)

kubectl create secret generic kargo-admin-credentials \
  --from-literal=passwordHash="$hashed_pass" \
  --from-literal=tokenSigningKey="$signing_key" \
  -n central-secret-store


# Backstage

Backstage is used for the service catalogue; the helm charts in the eda create config maps with backstage resources that represent the services, APIs, events and relationships between them.

The source for the backstage app is in apps/backstage and this is manually built into a docker image and published to github:

`yarn tsc`

`yarn build:all`

`yarn build-image --tag ghcr.io/craigedmunds/backstage:0.x` (where x is an incrementation from previous)

`docker push ghcr.io/craigedmunds/backstage:0.x`

And then update the version number in 

A custom plugin, catalog-backend-module-eda, provides the "Event" related capabilities.