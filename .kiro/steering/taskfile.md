# Taskfile Commands and Development Workflow

This repository uses Taskfile for task automation and development workflows. Understanding and using these tasks is essential for effective development and troubleshooting.

## Updating This File

This file should be regenerated when new tasks are added. Run `task docs:taskfile` to update it with the latest task list.

## Key Development Principles

1. **MUST Use tasks instead of raw commands** - If you regularly execute a command, it should be in a Taskfile
2. **MUST Leverage existing workflows** - Many common operations already have tasks defined
3. **MUST Follow the ArgoCD development workflow** - Pause ArgoCD sync for local testing, then resume when ready
4. **MUST Refactor and reuse** - Identify duplication and refactor, including into the dev-common shared tasks

## Common Command Mappings

**❌ NEVER run these raw commands - use tasks instead:**

| Raw Command | ✅ Use Task Instead |
|-------------|---------------------|
| `kubectl apply -k path/` | `task infra:apply` |
| `kubectl logs -f deployment/X` | `task infra:logs` |
| `docker build -t image .` | `task infra:build` |
| `pytest` or `python -m pytest` | `task test` or `task metrics:test` |
| `python script.py` | Check for `task <component>:<action>` |

**Before running ANY command, check if a task exists for it.**

## Available Tasks

The following tasks are available in this repository. Use `task --list` to see the most current list:

| Name | Description |
| -------- | ------- |
| docs | Generate/update the taskfile steering documentation|
| pods | Show pods that are not running|
| status | Run all the status' methods|
| backstage:apply | Apply Backstage kustomize configuration directly|
| backstage:diff | Show diff between local changes and cluster state|
| backstage:kargo:artifacts | Show verification artifacts (logs from host path)|
| backstage:kargo:cleanup | Clean up failed verification runs|
| backstage:kargo:history | Show promotion and verification history|
| backstage:kargo:logs | Show logs from the latest verification run|
| backstage:kargo:logs:follow | Follow logs from the currently running verification|
| backstage:kargo:refresh | Force refresh of Kargo stage and ArgoCD application|
| backstage:kargo:status | Show Kargo stage and verification status|
| backstage:kargo:verification | Show current verification runs and status|
| backstage:kargo:watch | Watch Kargo resources in real-time|
| backstage:kustomize:build | Build Backstage kustomize configuration|
| backstage:logs | Follow Backstage logs|
| backstage:status | Show Backstage application and pod status|
| backstage:test:kargo:acceptance | Run Kargo acceptance test for Backstage promotion pipeline|
| backstage:ui | Open Backstage UI (requires port-forward)|
| cluster:info | Show cluster and context information|
| dev:apply | Apply kustomize directly (bypassing ArgoCD) for development|
| dev:diff | Show diff between local changes and cluster state|
| docs:update | Update all auto-generated documentation|
| eda:apply | Apply EDA mesh kustomize configuration|
| eda:build | Build EDA mesh kustomize configuration|
| eda:demo:consumer | Run Kafka console consumer|
| eda:diff | Show diff between local changes and cluster state|
| eda:kustomize | Build EDA mesh application kustomize configuration|
| eda:logs:catalog-api | Follow backstage-catalog-api logs|
| eda:logs:rabbitmq | Follow RabbitMQ logs|
| eda:passwords:rabbitmq | Get RabbitMQ admin credentials|
| eda:status | Show EDA mesh application and component status|
| eda:status:catalog-api | Show backstage-catalog-api status|
| eda:test:catalog-api | Test backstage-catalog-api endpoints|
| eda:test:catalog-api:internal | Test backstage-catalog-api endpoints from within the cluster (internal service)|
| eda:test:unit | Run unit tests for an EDA app (mesh or core service)|
| eda:ui:rabbitmq | Open RabbitMQ Management UI in browser|
| images:app:setup | Set up Image Factory app component|
| images:app:test:unit | Run unit tests for Image Factory app component|
| images:cdk8s:deploy | Deploy CDK8s manifests to cluster|
| images:cdk8s:setup | Set up Image Factory CDK8s component|
| images:cdk8s:synth | Synthesize CDK8s manifests|
| images:cdk8s:test:unit | Run unit tests for Image Factory CDK8s component|
| images:clean:failed | Clean up failed jobs and pods|
| images:debug:secrets | Debug secret configuration and availability|
| images:debug:stage | Debug a specific stage|
| images:logs | Show logs from all running Image Factory components|
| images:logs:analysis | Show logs from the most recent AnalysisRun|
| images:logs:promotion | Show logs from the most recent promotion|
| images:status | Show comprehensive status of Image Factory components|
| images:test:acceptance | Run acceptance tests for Image Factory|
| images:test:all | Run all tests for Image Factory|
| images:test:integration | Run integration tests for Image Factory|
| images:test:integration:setup | Set up integration test|
| images:test:unit | Run unit tests for Image Factory|
| images:test:unit:setup | Set up Image Factory development environment|
| images:tool:run | Run the image factory analysis tool|
| images:tool:run:backstage | Run analysis tool for Backstage image (local testing)|
| images:tool:run:uv | Run analysis tool for UV image (local testing)|
| images:watch | Watch Image Factory resources in real-time|
| kafka:consumer | Run Kafka console consumer|
| kafka:producer | Run Kafka console producer (interactive)|
| kafka:topics | List Kafka topics|
| platform:cert:debug | Debug certificate issues for a specific certificate|
| platform:ingress:cert:debug | Debug certificate issues for a specific certificate|
| platform:ingress:ssl:check | Check SSL certificate status for a given host|
| platform:ingress:status | Check ingress status and troubleshoot connectivity issues|
| platform:ingress:test | Run all kustomize ingress build tests|
| platform:ingress:test:all | Run all tests for platform ingress|
| platform:ingress:test:argocd | Run ArgoCD ingress build tests|
| platform:ingress:test:backstage | Run Backstage ingress build tests|
| platform:ingress:test:install | Install dependencies for kustomize ingress tests|
| platform:ingress:test:kargo | Run Kargo ingress build tests|
| platform:ingress:test:sample | Run sample ReplacementTransformer component tests with IngressRoute generation|
| platform:ingress:test:sample:build | Run sample generation|
| platform:ingress:test:unit | Run unit tests for platform ingress|
| platform:ingress:test:unit:setup | Setup unit tests for platform ingress|
| platform:ssl:check | Check SSL certificate status for a given host|
| platform:status | Check ingress status and troubleshoot connectivity issues|
| platform:test:all | Run all tests for platform components|
| platform:test:unit | Run unit tests for platform components (ingress + branch targeting)|
| platform:test:unit:setup | Setup unit tests for platform components (ingress + branch targeting)|
| seed:app | Print status for the seed app|
| seed:app:refresh | Trigger a refresh|
| seed:app:sync | Force sync of the ArgoCD application|
| seed:apply | Apply seed|
| seed:build | Build seed|
| seed:passwords | Ensure initial passwords exist and create them|
| seed:status | Print status for the seed component|
| test:changed | Run tests for components that have changed compared to main|
| test:changed:acceptance | Run acceptance tests for components that have changed|
| test:changed:integration | Run integration tests for components that have changed|
| test:changed:unit | Run unit tests for components that have changed|
| uv:build | Build the UV Docker image|
| uv:clean | Clean up local UV images|
| uv:env | Test the UV image with a simple script|
| uv:push | Push the UV Docker image to registry|
| uv:python | Open a python shell inside the image|
| uv:run | Run the UV image as a server (default mode)|
| uv:run:nooverrides | Run the UV image as a server (default mode)|
| uv:run:script | Run a script in the UV image (usage - task run:script SCRIPT=app.py ARGS="--help")|
| uv:shell | Open a python shell inside the image|
| uv:test:entrypoint | Test the entrypoint script directly|
| uv:test:kubernetes | Test the image in a Kubernetes job (similar to AnalysisTemplate)|
| uv:test:paths | Test what Python paths are available in the image|
| uv:test:simple | Test the UV image with a simple script|
| validate:ci-sync | Validate that all GitHub Actions use task commands exclusively|
| workspace-shared:docs:taskfile | Generate/update the taskfile steering documentation|

## Best Practices

1. **Always check status first** - Use `task status` or component-specific status tasks
2. **Use the development workflow** - Pause ArgoCD, apply directly, test, then resume
3. **Run tests before committing** - Use appropriate test tasks for your changes
4. **Leverage existing tasks** - Don't reinvent commands that already exist
5. **Update tasks when needed** - If you find yourself running the same commands repeatedly, add them to a Taskfile


## Essential Daily Tasks

### Development Workflow
- `task dev:apply` - Apply kustomize directly (bypassing ArgoCD) for development
- `task dev:diff` - Show diff between local changes and cluster state
- `task cluster:info` - Show cluster and context information
- `task pods` - Show pods that are not running (quick troubleshooting)

### Status and Monitoring
- `task status` - Run all status methods across components
- `task argocd:status` - Print status for ArgoCD
- `task backstage:status` - Show Backstage application and pod status
- `task images:status` - Show comprehensive status of Image Factory components

### Testing
- Use component-specific test tasks (e.g., `task backstage:test:all`, `task images:test:all`)
- `task test:changed` - Run tests for components that have changed
- `task test:changed:unit` - Run unit tests for changed components
- `task test:changed:integration` - Run integration tests for changed components
- `task test:changed:acceptance` - Run acceptance tests for changed components

## Task Categories

### ArgoCD Management
- Pause/resume sync for development workflow
- Check application status and troubleshoot issues
- Access UI and get credentials

### Development and Testing
- Apply configurations directly for rapid iteration
- Run comprehensive test suites
- Debug and troubleshoot components

### Monitoring and Status
- Check overall system health
- Monitor specific component status
- View logs and artifacts

### Infrastructure Components
- Backstage: Developer portal and catalog
- Image Factory: Container image building and promotion
- EDA: Event-driven architecture mesh
- Ingress: Traffic routing and SSL management
- Secrets: Central secret management

## Best Practices

1. **Always check status first** - Use `task status` or component-specific status tasks
2. **Use the development workflow** - Pause ArgoCD, apply directly, test, then resume
3. **Run tests before committing** - Use appropriate test tasks for your changes
4. **Leverage existing tasks** - Don't reinvent commands that already exist
5. **Update tasks when needed** - If you find yourself running the same commands repeatedly, add them to a Taskfile

