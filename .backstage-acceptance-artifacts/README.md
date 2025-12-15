# Backstage Acceptance Test Artifacts

This directory contains artifacts from Backstage E2E tests run during Kargo verification.

## What's stored here

Each Kargo verification run creates a timestamped directory containing:
- **HTML reports** - Playwright test reports viewable in a browser
- **Screenshots** - Images captured during test failures
- **Traces** - Playwright execution traces for debugging
- **JSON results** - Machine-readable test results
- **Metadata** - Information about the test run context

## Viewing artifacts

To view the latest test report:
```bash
# Open the most recent HTML report
open .backstage-acceptance-artifacts/backstage-acceptance-*/html-report/index.html
```

## Cleanup

This directory can grow over time. To clean up old artifacts:
```bash
# Remove artifacts older than 7 days
find .backstage-acceptance-artifacts -name "backstage-acceptance-*" -mtime +7 -exec rm -rf {} \;
```

For more detailed information, see `kustomize/backstage-kargo/ARTIFACTS_README.md`.