# Argocd Event Driven Architecture

# Using the seed

In order to instantiate this in a new argocd cluster...

Install ArgoCD (from https://argo-cd.readthedocs.io/en/latest/getting_started/):

`kubectl create namespace argocd`

`kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml`

Get the admin password via k8s:

`kubectl get secret argocd-initial-admin-secret -n argocd -o json | jq '.data.password' -r | base64 -D`

Or via argocd:

`argocd login --core`

`argocd admin initial-password -n argocd`

Add github credentials for backstage authentication:

`kubectl create namespace backstage`

```
kubectl -n backstage create secret generic backstage-github-auth \
  --from-literal=GITHUB_CLIENT_ID="$GITHUB_BUILD_CLIENTID" \
  --from-literal=GITHUB_CLIENT_SECRET="$GITHUB_BUILD_CLIENTSECRET
```

Create the docker registry secret: 

```
kubectl create secret docker-registry ghcr-creds \
  --docker-server=ghcr.io \
  --docker-username="$GITHUB_BUILD_USERNAME" \
  --docker-password="$GITHUB_PAT_BUILDTOOLING" \
  --docker-email="$GITHUB_BUILD_USERNAME"
```

```
kubectl create secret docker-registry -n backstage ghcr-creds \
  --docker-server=ghcr.io \
  --docker-username="$GITHUB_BUILD_USERNAME" \
  --docker-password="$GITHUB_PAT_BUILDTOOLING" \
  --docker-email="$GITHUB_BUILD_USERNAME"
```

Create the seed application:

`kustomize build seed | kubectl apply -f -`

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

# Backstage

Backstage is used for the service catalogue; the helm charts in the eda create config maps with backstage resources that represent the services, APIs, events and relationships between them.

The source for the backstage app is in apps/backstage and this is manually built into a docker image and published to github:

`yarn build-image --tag ghcr.io/craigedmunds/backstage:0.2`

`docker push ghcr.io/craigedmunds/backstage:0.2`

A custom plugin, catalog-backend-module-eda, provides the "Event" related capabilities.