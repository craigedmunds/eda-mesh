# CI/CD Setup for Backstage

## Problem: Local Verdaccio Registry in CI

The local `.yarnrc.yml` is configured to use a local Verdaccio registry at `https://verdaccio.127.0.0.1.nip.io/`. This works locally but fails in GitHub Actions.

## Solution

We use a separate `.yarnrc.ci.yml` file that points to the public npm registry.

### Files

- **`.yarnrc.yml`** - Local development (uses Verdaccio)
- **`.yarnrc.ci.yml`** - CI/CD (uses public npm registry)

### How It Works

The GitHub Action workflow:
1. Copies `.yarnrc.ci.yml` to `.yarnrc.yml` before installing dependencies
2. This overrides the local Verdaccio configuration
3. Yarn installs packages from the public npm registry
4. Build proceeds normally

### Local Development

Your local setup is unchanged. Continue using:
```bash
yarn install
yarn start
```

The local `.yarnrc.yml` will use Verdaccio as configured.

### CI/CD

The GitHub Action automatically uses the CI configuration:
```yaml
- name: Configure Yarn for CI
  run: |
    cd apps/backstage
    cp .yarnrc.ci.yml .yarnrc.yml

- name: Install dependencies
  run: |
    cd apps/backstage
    yarn install --immutable
```

## Troubleshooting

### If CI still fails with ECONNREFUSED

Check that `.yarnrc.ci.yml` exists and is committed:
```bash
git ls-files apps/backstage/.yarnrc.ci.yml
```

### If local development breaks

Make sure you're using `.yarnrc.yml` (not `.yarnrc.ci.yml`):
```bash
cat apps/backstage/.yarnrc.yml | grep npmRegistryServer
# Should show: npmRegistryServer: "https://verdaccio.127.0.0.1.nip.io/"
```

### If you need to update both configs

When changing Yarn settings, update both files:
- `.yarnrc.yml` - for local development
- `.yarnrc.ci.yml` - for CI/CD

## Alternative Approaches

If you prefer not to use two config files, you can:

### Option 1: Environment Variable Override
```yaml
- name: Install dependencies
  run: |
    cd apps/backstage
    YARN_NPM_REGISTRY_SERVER=https://registry.npmjs.org yarn install
  env:
    YARN_ENABLE_STRICT_SSL: true
```

### Option 2: Conditional Config
Use a script to detect CI environment and configure accordingly.

### Option 3: Remove Verdaccio from .yarnrc.yml
If Verdaccio is optional, remove it from `.yarnrc.yml` and configure it only when needed.

## Current Configuration

### .yarnrc.yml (Local)
```yaml
enableStrictSsl: false
nodeLinker: node-modules
npmRegistryServer: "https://verdaccio.127.0.0.1.nip.io/"
yarnPath: .yarn/releases/yarn-4.4.1.cjs
```

### .yarnrc.ci.yml (CI)
```yaml
enableStrictSsl: true
nodeLinker: node-modules
npmRegistryServer: "https://registry.npmjs.org"
yarnPath: .yarn/releases/yarn-4.4.1.cjs
```
