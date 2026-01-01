# [Backstage](https://backstage.io)

This is your newly scaffolded Backstage App, Good Luck!

## Testing

This component supports multiple test levels:

- **Unit Tests**: `task test:unit` - Fast tests with no external dependencies
- **Integration Tests**: `task test:integration` - Tests with internal dependencies  
- **Acceptance Tests**: `task test:acceptance` - End-to-end tests using Playwright
- **All Tests**: `task test:all` - Run complete test suite

### Test Structure

- `tests/unit/` - Unit tests (when implemented)
- `tests/integration/` - Integration tests (when implemented)  
- `tests/acceptance/` - Playwright acceptance tests

### Running Tests Locally

```bash
# Run all tests
task test:all

# Run specific test level
task test:unit
task test:integration  
task test:acceptance
```

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
