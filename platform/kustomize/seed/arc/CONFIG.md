# ARC Runner Registration Configuration

## How Runners are Registered

ARC runners can be registered at three levels:

### 1. Repository Level (Current Default)
Runners available to a single repository.

```yaml
spec:
  githubConfigUrl: "https://github.com/craigedmunds/argocd-eda"
```

**Use when:** You want runners dedicated to one repo.

### 2. Organization Level (Recommended for Multiple Repos)
Runners available to ALL repositories in an organization.

```yaml
spec:
  githubConfigUrl: "https://github.com/craigedmunds"
```

**Use when:** You want runners shared across multiple repos in your org.

### 3. Enterprise Level
Runners available to all organizations in an enterprise.

```yaml
spec:
  githubConfigUrl: "https://github.com/enterprises/YOUR_ENTERPRISE"
```

**Use when:** You have GitHub Enterprise and want org-wide runners.

## Current Configuration

**File:** `overlays/lab/runner-scale-set-patch.yaml`

**Current Setting:**
```yaml
spec:
  githubConfigUrl: "https://github.com/craigedmunds/argocd-eda"
  runnerScaleSetName: "arc-runner-set"
```

This registers runners at the **repository level** for `argocd-eda` only.

## Changing to Organization Level (Recommended)

To make runners available to ALL your repositories:

### Step 1: Update the Configuration

Edit `overlays/lab/runner-scale-set-patch.yaml`:

```yaml
spec:
  # Change to organization level
  githubConfigUrl: "https://github.com/craigedmunds"
  runnerScaleSetName: "arc-runner-set"
```

### Step 2: Verify Token Permissions

Organization-level runners require the token to have `admin:org` scope.

Check current scopes:
```bash
TOKEN=$(kubectl get secret github-pat -n central-secret-store -o jsonpath='{.data.token}' | base64 -d)
curl -sI -H "Authorization: token $TOKEN" https://api.github.com/user | grep x-oauth-scopes
```

Your token currently has:
- ✅ `repo` - Works for repo-level
- ✅ `workflow` - Works for workflows
- ✅ `read:org` - **Read only** (might need `admin:org` for full org-level)

### Step 3: Test Organization Access

```bash
TOKEN=$(kubectl get secret github-pat -n central-secret-store -o jsonpath='{.data.token}' | base64 -d)
curl -sL -X POST -H "Authorization: token $TOKEN" \
  https://api.github.com/orgs/craigedmunds/actions/runners/registration-token | jq
```

If this returns a token, you're good! If it returns 403/404, you need `admin:org` scope.

### Step 4: Apply the Change

```bash
# Commit and push the change
git add overlays/lab/runner-scale-set-patch.yaml
git commit -m "feat(arc): Change to organization-level runners"
git push

# ArgoCD will automatically sync and update
```

## Multiple Runner Scale Sets

You can create multiple scale sets for different purposes:

### Example: One Set Per Repository

```yaml
# overlays/lab/runner-scale-set-argocd-eda.yaml
apiVersion: actions.github.com/v1alpha1
kind: AutoscalingRunnerSet
metadata:
  name: arc-argocd-eda
spec:
  githubConfigUrl: "https://github.com/craigedmunds/argocd-eda"
  runnerScaleSetName: "arc-argocd-eda"
  maxRunners: 3

---
# overlays/lab/runner-scale-set-market-making.yaml
apiVersion: actions.github.com/v1alpha1
kind: AutoscalingRunnerSet
metadata:
  name: arc-market-making
spec:
  githubConfigUrl: "https://github.com/craigedmunds/market-making"
  runnerScaleSetName: "arc-market-making"
  maxRunners: 2
```

Then use in workflows:
```yaml
# In argocd-eda repo
jobs:
  build:
    runs-on: arc-argocd-eda

# In market-making repo
jobs:
  build:
    runs-on: arc-market-making
```

## Restricting Runner Access (Organization Level)

When using org-level runners, you can restrict which repos can use them:

### In GitHub UI:
1. Go to: https://github.com/organizations/craigedmunds/settings/actions/runners
2. Find your runner group
3. Click "Edit"
4. Under "Repository access", select:
   - **All repositories** - Any repo can use
   - **Selected repositories** - Choose specific repos

### Via Runner Groups (Enterprise/Org)

```yaml
spec:
  githubConfigUrl: "https://github.com/craigedmunds"
  runnerGroup: "production-runners"  # Only repos with access to this group
```

Then in GitHub:
1. Settings → Actions → Runner groups
2. Create "production-runners" group
3. Assign repositories to this group

## Recommended Setup

For most users with multiple repos:

```yaml
# overlays/lab/runner-scale-set-patch.yaml
spec:
  # Organization-level for all repos
  githubConfigUrl: "https://github.com/craigedmunds"
  runnerScaleSetName: "arc-runner-set"
  runnerGroup: "default"
  
  # Higher max for shared runners
  maxRunners: 10
```

**Benefits:**
- ✅ All repos can use the same runners
- ✅ Better resource utilization
- ✅ Simpler management
- ✅ One place to configure

## Current Repos That Will Use ARC

Once you update workflows, these repos can use the runners:

From your `image-factory/images.yaml`:
1. **craigedmunds/argocd-eda** (backstage, uv, e2e-test-runner, code-server-dev)
2. **craigedmunds/market-making** (metrics-service)

### Migration Per Repo

Update each repo's workflows:

**argocd-eda:**
- `.github/workflows/backstage.yml`
- `.github/workflows/uv.yml`
- `.github/workflows/e2e-runner.yml`
- `.github/workflows/code-server-dev.yml`

**market-making:**
- `.github/workflows/metrics-service.yml`

Change:
```yaml
runs-on: ubuntu-latest
```

To:
```yaml
runs-on: arc-runner-set
```

## Verification

After deployment, verify registration:

### Repository Level
```bash
# Check in specific repo
gh api /repos/craigedmunds/argocd-eda/actions/runners
```

### Organization Level
```bash
# Check in organization
gh api /orgs/craigedmunds/actions/runners
```

### Via GitHub UI
1. **Repo level:** `https://github.com/craigedmunds/argocd-eda/settings/actions/runners`
2. **Org level:** `https://github.com/organizations/craigedmunds/settings/actions/runners`

You should see "arc-runner-set" listed with status "Idle".

## Quick Reference

| Level | URL Format | Token Scope Needed | Availability |
|-------|-----------|-------------------|--------------|
| Repository | `https://github.com/OWNER/REPO` | `repo` | One repo only |
| Organization | `https://github.com/ORG` | `admin:org` | All org repos |
| Enterprise | `https://github.com/enterprises/ENT` | `manage_runners:enterprise` | All enterprise orgs |

## Decision Guide

**Use Repository Level if:**
- You only have one repo with CI/CD
- You want strict isolation per repo
- You're testing ARC for the first time ← **Current setup**

**Use Organization Level if:**
- You have multiple repos that need runners ← **Recommended**
- You want shared resource pool
- You want simpler management

**Use Enterprise Level if:**
- You have GitHub Enterprise
- You have multiple organizations
- You want central management

## Making the Change

To switch from repository to organization level:

```bash
# 1. Edit the config
vim overlays/lab/runner-scale-set-patch.yaml

# Change:
githubConfigUrl: "https://github.com/craigedmunds/argocd-eda"
# To:
githubConfigUrl: "https://github.com/craigedmunds"

# 2. Commit and push
git add overlays/lab/runner-scale-set-patch.yaml
git commit -m "feat(arc): Switch to organization-level runners"
git push

# 3. ArgoCD syncs automatically

# 4. Verify in GitHub
gh api /orgs/craigedmunds/actions/runners
```

Done! Now all repos in your organization can use `runs-on: arc-runner-set`.
