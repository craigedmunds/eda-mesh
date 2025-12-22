## Logging

Don't remove debugging / console.log entries

## ArgoCD Application Conventions

When adding extra resources to ArgoCD applications:

1. **Preferred: Inline via Helm values** - If the Helm chart supports `extraObjects` or similar, inline the resources directly in the application's values
   - Example: `kustomize/seed/base/supporting-apps/kargo.yaml` uses `extraObjects` to include Kyverno policies

2. **Alternative: Kustomize directory** - If inline isn't possible, create a `kustomize/<application>` directory and point the application source at it
   - Prefer this over multi-source applications for simplicity
   - Example: `kustomize/backstage/` contains base + overlays + kargo resources

3. **Avoid: Multi-source applications** - Only use when absolutely necessary (e.g., combining Helm + kustomize when extraObjects isn't available)

## Kustomize Structure Conventions

- **Base directories** - Contain reusable base resources without namespace set
  - Example: `kustomize/backstage/base/`
  
- **Overlays** - Environment-specific customizations that reference base
  - Set namespace at overlay level
  - Example: `kustomize/backstage/overlays/local/`
  
- **Kargo resources** - Co-locate with the application they manage
  - Example: `kustomize/backstage/kargo/` contains Project, Warehouse, Stage for backstage
  - Set explicit namespace in kargo kustomization to avoid parent namespace override

## ESO Secret Sync Pattern

Use label-based selectors for syncing secrets to namespaces:

- **Source secret** - Lives in `central-secret-store` namespace
- **Target selector** - Use specific labels (e.g., `secrets/gh-docker-registry: "true"`)
- **Kargo secrets** - ESO creates secrets with `kargo.akuity.io/cred-type` labels from the start

Example: ClusterExternalSecrets distribute secrets from central-secret-store to any namespace with matching labels

## Kargo Project Conventions

- **Project namespace** - Kargo Project creates/manages a namespace matching its name
- **Project labels** - Add dependency labels to Project metadata (e.g., `kargo.deps/ghcr: "true"`)
- **Stage updates** - Stages use `kustomize-set-image` to update overlay image tags
- **Git commits** - Kargo commits image tag updates back to the repo for GitOps