# GitHub Integration Documentation

## Overview

The Backstage platform integrates with GitHub to discover repositories and organization structure automatically. This integration uses two Backstage plugins:

- `@backstage/plugin-catalog-backend-module-github` - Discovers GitHub repositories and creates catalog entities
- `@backstage/plugin-catalog-backend-module-github-org` - Discovers GitHub organization structure (teams, users)

## GitHub Token Requirements

### Required Scopes

The GitHub Personal Access Token (PAT) must have the following scopes:

- **`repo`** - Full control of private repositories (required for repository discovery)
- **`read:org`** - Read organization membership and teams (required for organization discovery)
- **`read:user`** - Read user profile data (required for user entity creation)
- **`user:email`** - Access user email addresses (required for authentication)

### Creating a GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Backstage Integration")
4. Select the required scopes listed above
5. Set an appropriate expiration date
6. Click "Generate token"
7. Copy the token immediately (you won't be able to see it again)

### Setting the Token

#### Local Development

Set the `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

Or add it to your `.env` file in the `backstage/app` directory:

```
GITHUB_TOKEN=ghp_your_token_here
```

#### Kubernetes Deployment (Lab Environment)

The token is automatically managed by the **Central Secret Store** using External Secrets Operator (ESO). No manual secret creation is required.

**How it works:**

1. The central secret store maintains the GitHub PAT in the `central-secret-store` namespace
2. A `ClusterExternalSecret` named `github-oauth-credentials` automatically distributes the secret to namespaces with the label `secrets/gh-oauth-credentials: "true"`
3. The Backstage namespace has this label, so the `gh-oauth` secret is automatically created
4. The secret contains:
   - `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
   - `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret
   - `GITHUB_TOKEN` - GitHub Personal Access Token for API access

**Configuration location:**
- Central secret store: `platform/kustomize/central-secret-store/external-secrets/github-oauth.yaml`
- Namespace label: `backstage/kustomize/base/namespace.yaml`

**Verifying the secret:**

```bash
# Check if the secret exists
kubectl get secret -n backstage gh-oauth

# Verify the secret has the required keys
kubectl get secret -n backstage gh-oauth -o jsonpath='{.data}' | jq 'keys'
```

**Important:** Never create the `gh-oauth` secret manually. Always use the central secret store to ensure consistency and proper secret management.

## Configuration

### Repository Discovery

The GitHub repository discovery is configured in `app-config.yaml` and `kustomize/base/values.yaml`:

```yaml
catalog:
  providers:
    github:
      ctoaas:
        organization: 'ctoaas'
        catalogPath: '/catalog-info.yaml'
        filters:
          branch: 'main'
          repository: '.*'
        schedule:
          frequency: { minutes: 30 }
          timeout: { minutes: 3 }
```

**Note:** Update the `organization` field to match your GitHub organization. The token must have access to this organization.

This configuration:
- Discovers all repositories in the specified organization
- Looks for `catalog-info.yaml` files in the root of each repository
- Runs discovery every 30 minutes
- Only considers the `main` branch

### Organization Discovery

The GitHub organization discovery is configured similarly:

```yaml
catalog:
  providers:
    githubOrg:
      default:
        id: production
        orgUrl: 'https://github.com/ctoaas'
        schedule:
          frequency: { hours: 1 }
          timeout: { minutes: 15 }
```

**Note:** Update the `orgUrl` to match your GitHub organization.

This configuration:
- Discovers teams and users from the specified organization
- Creates User and Group entities in the catalog
- Runs discovery every hour

## Verifying the Integration

### Check Token Access

Verify the token has access to your organization:

```bash
# Using local token
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/orgs/ctoaas/repos | jq '.[].name'

# Using token from Kubernetes secret
TOKEN=$(kubectl get secret -n backstage gh-oauth -o jsonpath='{.data.GITHUB_TOKEN}' | base64 -d)
curl -H "Authorization: token $TOKEN" \
  https://api.github.com/orgs/ctoaas/repos | jq 'if type == "array" then "Success: \(length) repos found" else .message end'
```

### Check Token Scopes

Verify the token has the required scopes:

```bash
# Using local token
curl -I -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user | grep x-oauth-scopes

# Using token from Kubernetes secret
TOKEN=$(kubectl get secret -n backstage gh-oauth -o jsonpath='{.data.GITHUB_TOKEN}' | base64 -d)
curl -I -H "Authorization: token $TOKEN" \
  https://api.github.com/user | grep x-oauth-scopes
```

Required scopes: `repo` (includes repository access)

### Monitor Discovery

After starting Backstage, check the logs for GitHub discovery activity:

```bash
# Local development
yarn dev

# Kubernetes deployment
kubectl logs -n backstage -l app=backstage -f | grep -i github
```

### Verify Catalog Entities

Once discovery runs, you should see:
- Repository entities in the catalog (kind: Component)
- User entities from GitHub users (kind: User)
- Group entities from GitHub teams (kind: Group)

## Troubleshooting

### "Not Found" Error

If you see "Not Found" when accessing the organization:
- Verify the token has access to the organization
- Check that the organization name is correct
- Ensure the token has the `read:org` scope

### No Repositories Discovered

If repositories aren't appearing in the catalog:
- Check that repositories have a `catalog-info.yaml` file
- Verify the `catalogPath` configuration matches your file location
- Check the discovery schedule has run (wait 30 minutes or restart Backstage)
- Review Backstage logs for discovery errors

### Rate Limiting

GitHub API has rate limits:
- Authenticated requests: 5,000 per hour
- Unauthenticated requests: 60 per hour

If you hit rate limits:
- Increase the discovery schedule frequency
- Use a GitHub App instead of a PAT (higher rate limits)
- Check for excessive API calls in the logs

## Security Best Practices

1. **Use Fine-Grained Tokens**: Consider using GitHub's fine-grained personal access tokens for better security
2. **Rotate Tokens Regularly**: Set expiration dates and rotate tokens periodically
3. **Limit Scope**: Only grant the minimum required scopes
4. **Secure Storage**: Never commit tokens to version control
5. **Use Secrets Management**: In production, use External Secrets Operator or similar tools

## References

- [Backstage GitHub Integration Documentation](https://backstage.io/docs/integrations/github/locations)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Backstage Catalog Providers](https://backstage.io/docs/features/software-catalog/external-integrations)
