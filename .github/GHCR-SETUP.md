# GitHub Container Registry Setup

## Problem

GitHub Actions is getting `403 Forbidden` when trying to push to `ghcr.io/craigedmunds/backstage`.

## Root Cause

The `GITHUB_TOKEN` used by GitHub Actions has limited permissions. It can only push to packages that are:
1. Linked to the repository, OR
2. Accessed with a Personal Access Token (PAT)

## Solution Options

### Option 1: Link Package to Repository (Recommended)

This allows the workflow to use `GITHUB_TOKEN` without additional setup.

#### Steps:

1. **Go to the package page:**
   - Visit: https://github.com/users/craigedmunds/packages/container/backstage

2. **Connect to repository:**
   - Click "Package settings" (gear icon)
   - Scroll to "Danger Zone"
   - Under "Connect repository", select your repository: `craigedmunds/argocd-eda`
   - Click "Connect"

3. **Set package visibility:**
   - In Package settings, set visibility to "Public" or "Private" as needed
   - If private, ensure the repository has access

4. **Re-run the workflow:**
   - The workflow should now succeed with `GITHUB_TOKEN`

### Option 2: Use Personal Access Token (Alternative)

If you can't link the package, use a PAT with `write:packages` scope.

#### Steps:

1. **Create a PAT:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name: `GHCR_PUSH_TOKEN`
   - Scopes: Select `write:packages` and `read:packages`
   - Click "Generate token"
   - Copy the token (you won't see it again!)

2. **Add as repository secret:**
   - Go to your repository: https://github.com/craigedmunds/argocd-eda
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `GHCR_TOKEN`
   - Value: Paste your PAT
   - Click "Add secret"

3. **Update the workflow:**
   ```yaml
   - name: Log in to GitHub Container Registry
     uses: docker/login-action@v3
     with:
       registry: ${{ env.REGISTRY }}
       username: ${{ github.actor }}
       password: ${{ secrets.GHCR_TOKEN }}  # Use PAT instead of GITHUB_TOKEN
   ```

## Verification

After applying either solution, check:

```bash
# View workflow run
# Go to: https://github.com/craigedmunds/argocd-eda/actions

# Verify image was pushed
docker pull ghcr.io/craigedmunds/backstage:0.6.1

# Check package page
# Visit: https://github.com/users/craigedmunds/packages/container/backstage
```

## Current Workflow Configuration

The workflow uses:
- **Registry:** `ghcr.io`
- **Image:** `craigedmunds/backstage`
- **Auth:** `GITHUB_TOKEN` (needs package linked to repo)

## Troubleshooting

### Still getting 403 after linking package?

**CRITICAL: Check Repository Workflow Permissions First!**

1. **Enable write permissions for workflows:**
   - Go to: https://github.com/craigedmunds/argocd-eda/settings/actions
   - Scroll to "Workflow permissions"
   - Select: **"Read and write permissions"** (NOT "Read repository contents and packages permissions")
   - Check: ☑️ "Allow GitHub Actions to create and approve pull requests"
   - Click "Save"
   
   **This is the most common cause of 403 errors!**

2. **Check package visibility:**
   - Package must be public OR repository must have access
   - Visit: https://github.com/users/craigedmunds/packages/container/backstage/settings
   - Verify "Manage Actions access" includes your repository

3. **Verify workflow permissions in YAML:**
   ```yaml
   permissions:
     contents: write
     packages: write  # This is required
     id-token: write
     attestations: write
   ```

4. **Check package is linked:**
   - Visit: https://github.com/users/craigedmunds/packages/container/backstage
   - Should show "Source repository: craigedmunds/argocd-eda"

### Token scope issues?

If using PAT, ensure it has:
- ✅ `write:packages`
- ✅ `read:packages`
- ✅ `repo` (if package is private)

### Wrong image name?

Verify the image name matches exactly:
```bash
# Local
docker images | grep backstage

# Should match workflow
echo "ghcr.io/craigedmunds/backstage"
```

## Best Practice

**Recommendation:** Use Option 1 (link package to repository)
- ✅ No secrets to manage
- ✅ Automatic token rotation
- ✅ Better security
- ✅ Easier to maintain

Only use Option 2 if you need to push to packages in different organizations or have specific requirements.
