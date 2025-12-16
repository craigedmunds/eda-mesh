# [Backstage](https://backstage.io)

This is your newly scaffolded Backstage App, Good Luck!

## Local Development Setup

1. **Set up environment variables:**
   ```sh
   cp .env.example .env
   # Edit .env and add your GitHub token
   ```

2. **Install dependencies and start:**
   ```sh
   yarn install
   yarn start
   ```

## Configuration Files

- **`app-config.yaml`** - Single configuration file with environment variable defaults
- **`.env`** - Local environment variables (gitignored, contains secrets)

## Required Environment Variables

- `GITHUB_TOKEN` - GitHub Personal Access Token for integrations
- `BACKEND_SECRET` - Optional, defaults to dev key for local development
