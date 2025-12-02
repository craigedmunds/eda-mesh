# Kargo GitOps Setup

This directory contains Kargo manifests for managing progressive delivery and promotions.

## Overview

The GitOps workflow with Kargo:
1. **Developer pushes** code to `apps/backstage/**`
2. **GitHub Action** automatically:
   - Bumps version (patch/minor/major)
   - Builds Docker image
   - Pushes to `ghcr.io/craigedmunds/backstage:X.Y.Z`
   - Creates a Kargo Freight with the new image
3. **Kargo** manages promotion through stages:
   - **Dev** → Auto-promotes new images
   - **Staging** → Manual approval required
   - **Production** → Manual approval + verification

## Setup

### 1. Install Kargo

```bash
# Install Kargo using Helm
helm repo add kargo https://akuity.github.io/kargo
helm repo update
helm install kargo kargo/kargo \
  --namespace kargo \
  --create-namespace \
  --wait
```

### 2. Install Argo CD (Required by Kargo)

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 3. Access Kargo UI

```bash
# Port forward to Kargo UI
kubectl port-forward svc/kargo-api -n kargo 8080:80

# Access at http://localhost:8080
```

### 4. Deploy Kargo Resources

```bash
# Create the Kargo project
kubectl apply -f kargo/project.yaml

# Create the warehouse (watches for new images)
kubectl apply -f kargo/warehouse.yaml

# Create the stages (dev, staging, production)
kubectl apply -f kargo/stages.yaml
```

### 5. Create Argo CD Applications for Each Environment

```bash
# Dev
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backstage-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/craigedmunds/argocd-eda.git
    targetRevision: main
    path: kustomize/backstage/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: backstage-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF

# Staging
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backstage-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/craigedmunds/argocd-eda.git
    targetRevision: main
    path: kustomize/backstage/overlays/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: backstage-staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF

# Production
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backstage-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/craigedmunds/argocd-eda.git
    targetRevision: main
    path: kustomize/backstage/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: backstage
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF
```

## Version Management

### Automatic Version Bumping

The GitHub Action automatically determines version bump type:

- **Patch** (default): `0.5.0` → `0.5.1`
  - Any commit without special markers
  
- **Minor**: `0.5.0` → `0.6.0`
  - Commit message contains `[minor]` or `feat:`
  - Example: `feat: add new plugin [minor]`
  
- **Major**: `0.5.0` → `1.0.0`
  - Commit message contains `[major]` or `breaking change`
  - Example: `refactor: breaking change to API [major]`

### Manual Version Bump

Trigger manually via GitHub Actions UI:
1. Go to Actions → "Build and Push Backstage"
2. Click "Run workflow"
3. Select version bump type (patch/minor/major)

## Promotion Workflow

### Automatic Promotion to Dev

When a new image is pushed:
1. Kargo Warehouse detects the new image
2. Creates new Freight
3. Automatically promotes to **dev** stage
4. Argo CD syncs the dev environment

### Manual Promotion to Staging

```bash
# Via Kargo CLI
kargo promote --project backstage-kargo --stage staging

# Via Kargo UI
# 1. Navigate to http://localhost:8080
# 2. Select the backstage-kargo project
# 3. Click on "staging" stage
# 4. Click "Promote" on the desired Freight
```

### Manual Promotion to Production

```bash
# Via Kargo CLI (with verification)
kargo promote --project backstage-kargo --stage production

# Via Kargo UI
# 1. Navigate to staging stage
# 2. Verify the Freight passed all tests
# 3. Click "Promote to Production"
# 4. Confirm the promotion
```

## Monitoring Deployments

### Check Kargo Freight Status

```bash
# List all Freight
kubectl get freight -n backstage-kargo

# Get details of specific Freight
kubectl get freight <freight-name> -n backstage-kargo -o yaml
```

### Check Stage Status

```bash
# Check all stages
kubectl get stages -n backstage-kargo

# Check specific stage
kubectl describe stage dev -n backstage-kargo
kubectl describe stage staging -n backstage-kargo
kubectl describe stage production -n backstage-kargo
```

### Check Deployed Versions

```bash
# Dev
kubectl get deployment -n backstage-dev -o jsonpath='{.items[0].spec.template.spec.containers[0].image}'

# Staging
kubectl get deployment -n backstage-staging -o jsonpath='{.items[0].spec.template.spec.containers[0].image}'

# Production
kubectl get deployment -n backstage -o jsonpath='{.items[0].spec.template.spec.containers[0].image}'
```

### View Promotion History

```bash
# Get promotion history for a stage
kubectl get promotions -n backstage-kargo --sort-by=.metadata.creationTimestamp
```

## Rollback

### Rollback via Kargo

Kargo makes rollbacks easy by promoting previous Freight:

```bash
# List available Freight
kubectl get freight -n backstage-kargo

# Promote a previous Freight to a stage
kargo promote --project backstage-kargo \
  --stage production \
  --freight <previous-freight-name>
```

### Rollback via Kargo UI

1. Navigate to the stage (e.g., production)
2. View Freight history
3. Select a previous Freight
4. Click "Promote" to roll back

### Emergency Rollback via Argo CD

If Kargo is unavailable:

```bash
# Manually update the image tag in the overlay
cd kustomize/backstage/overlays/production
kustomize edit set image ghcr.io/craigedmunds/backstage:0.5.0

# Commit and push
git add kustomization.yaml
git commit -m "emergency: rollback to 0.5.0"
git push

# Argo CD will sync automatically
```

## Troubleshooting

### Image Pull Errors

If pods can't pull the image from ghcr.io:

```bash
# Create image pull secret
kubectl create secret docker-registry ghcr-creds \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-token> \
  --namespace=backstage

# Verify it's referenced in values.yaml
cat kustomize/backstage/values.yaml | grep pullSecrets
```

### Sync Issues

```bash
# Force refresh
argocd app get backstage --refresh

# Hard refresh (ignore cache)
argocd app get backstage --hard-refresh

# Check sync status
argocd app get backstage
```

### GitHub Action Failures

Check the Actions tab in GitHub:
- Build failures: Check Node.js/Yarn logs
- Push failures: Verify GITHUB_TOKEN permissions
- Commit failures: Check for conflicts

## Configuration

### Sync Policy Options

Edit `backstage-application.yaml`:

```yaml
syncPolicy:
  automated:
    prune: true        # Delete resources not in Git
    selfHeal: true     # Revert manual changes
    allowEmpty: false  # Prevent empty syncs
```

### Sync Frequency

Argo CD checks for changes every 3 minutes by default. To change:

```bash
# Edit argocd-cm ConfigMap
kubectl edit configmap argocd-cm -n argocd

# Add/modify:
data:
  timeout.reconciliation: 180s  # 3 minutes (default)
```

## Best Practices

1. **Always use feature branches** for development
2. **Merge to main** only when ready to deploy
3. **Use semantic commit messages** for proper version bumping
4. **Monitor Argo CD** after merges to ensure successful deployment
5. **Keep kustomize values** in sync with actual cluster state
6. **Use image pull secrets** for private registries
7. **Test locally** with `yarn start` before pushing

## Related Files

- `.github/workflows/backstage.yml` - CI/CD pipeline
- `kustomize/backstage/values.yaml` - Helm values (updated by CI)
- `kustomize/backstage/kustomization.yaml` - Kustomize config
- `apps/backstage/package.json` - Version source of truth
