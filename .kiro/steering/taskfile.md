# Taskfile Commands and Development Workflow

This repository uses Taskfile for task automation and development workflows. Understanding and using these tasks is essential for effective development and troubleshooting.

## Key Development Principles

1. **Use tasks instead of raw commands** - If you regularly execute a command, it should be in a Taskfile
2. **Leverage existing workflows** - Many common operations already have tasks defined
3. **Follow the ArgoCD development workflow** - Pause ArgoCD sync for local testing, then resume when ready

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
- `task test:ingress` - Run all kustomize ingress build tests
- `task images:test:all` - Run all tests (unit + integration)
- `task backstage:test:kargo:acceptance` - Run Kargo acceptance test for Backstage

## Available Tasks

The following tasks are available in this repository. Use `task --list` to see the most current list:

task: Available tasks for this project:
* pods:                                   Show pods that are not running
* status:                                 Run all the status' methods
* argocd:apps:pause:                      Pause ArgoCD sync for an application (usage - task argocd:apps:pause APP=<app-name>)
* argocd:apps:resume:                     Resume ArgoCD sync for an application (usage - task argocd:apps:resume APP=<app-name>)
* argocd:apps:status:                     Show all ArgoCD applications with detailed status
* argocd:apps:sync:                       Sync a specific application (usage - task argocd:apps:sync APP=<app-name>)
* argocd:logs:                            Get the logs from argocd
* argocd:password:                        Get ArgoCD admin password
* argocd:status:                          Print status for ArgoCD
* argocd:troubleshoot:                    Show detailed status for all applications with issues
* argocd:ui:                              Open ArgoCD UI (requires port-forward)
* backstage:apply:                        Apply Backstage kustomize configuration directly
* backstage:diff:                         Show diff between local changes and cluster state
* backstage:kargo:artifacts:              Show verification artifacts (logs from host path)
* backstage:kargo:cleanup:                Clean up failed verification runs
* backstage:kargo:history:                Show promotion and verification history
* backstage:kargo:logs:                   Show logs from the latest verification run
* backstage:kargo:logs:follow:            Follow logs from the currently running verification
* backstage:kargo:refresh:                Force refresh of Kargo stage and ArgoCD application
* backstage:kargo:status:                 Show Kargo stage and verification status
* backstage:kargo:verification:           Show current verification runs and status
* backstage:kargo:watch:                  Watch Kargo resources in real-time
* backstage:kustomize:build:              Build Backstage kustomize configuration
* backstage:logs:                         Follow Backstage logs
* backstage:status:                       Show Backstage application and pod status
* backstage:test:kargo:acceptance:        Run Kargo acceptance test for Backstage promotion pipeline
* backstage:ui:                           Open Backstage UI (requires port-forward)
* cluster:info:                           Show cluster and context information
* dev:apply:                              Apply kustomize directly (bypassing ArgoCD) for development
* dev:diff:                               Show diff between local changes and cluster state
* docs:taskfile:                          Generate/update the taskfile steering documentation
* eda:apply:                              Apply EDA mesh kustomize configuration directly
* eda:diff:                               Show diff between local changes and cluster state
* eda:logs:rabbitmq:                      Follow RabbitMQ logs
* eda:passwords:rabbitmq:                 Get RabbitMQ admin credentials
* eda:status:                             Show EDA mesh application and component status
* images:cdk8s:deploy:                    Deploy CDK8s manifests to cluster
* images:cdk8s:synth:                     Synthesize CDK8s manifests
* images:clean:failed:                    Clean up failed jobs and pods
* images:debug:secrets:                   Debug secret configuration and availability
* images:debug:stage:                     Debug a specific stage
* images:logs:                            Show logs from all running Image Factory components
* images:logs:analysis:                   Show logs from the most recent AnalysisRun
* images:logs:promotion:                  Show logs from the most recent promotion
* images:status:                          Show comprehensive status of Image Factory components
* images:test:all:                        Run all tests (unit + integration)
* images:test:integration:                Run Kargo integration test for Image Factory
* images:test:unit:                       Run unit tests for Image Factory
* images:tool:run:                        Run the image factory analysis tool
* images:tool:run:backstage:              Run analysis tool for Backstage image (local testing)
* images:tool:run:uv:                     Run analysis tool for UV image (local testing)
* images:watch:                           Watch Image Factory resources in real-time
* ingress:cert:debug:                     Debug certificate issues for a specific certificate
* ingress:ssl:check:                      Check SSL certificate status for a given host
* ingress:status:                         Check ingress status and troubleshoot connectivity issues
* ingress:test:                           Run all kustomize ingress build tests
* ingress:test:argocd:                    Run ArgoCD ingress build tests
* ingress:test:backstage:                 Run Backstage ingress build tests
* ingress:test:install:                   Install dependencies for kustomize ingress tests
* ingress:test:kargo:                     Run Kargo ingress build tests
* ingress:test:sample:                    Run sample ReplacementTransformer component tests with IngressRoute generation
* ingress:test:sample:build:              Run sample generation
* kargo:apply:                            Apply Kargo kustomize configuration directly
* kargo:logs:                             Follow Kargo controller logs
* kargo:logs:api:                         Follow Kargo API logs
* kargo:password:                         Show Kargo admin password
* kargo:status:                           Show Kargo status
* kargo:ui:                               Open Kargo UI (requires port-forward)
* secrets:apply:                          Apply central secret store configuration
* secrets:diff:                           Show diff between local changes and cluster state
* secrets:logs:                           Show ESO controller logs
* secrets:status:                         Check ESO and secret status across all namespaces
* seed:_init:                             Apply _init seed
* seed:app:                               Print status for the seed app
* seed:app:refresh:                       Trigger a refresh
* seed:app:sync:                          Force sync of the ArgoCD application
* seed:apply:                             Apply seed
* seed:build:                             Build seed
* seed:passwords:                         Ensure initial passwords exist and create them
* seed:status:                            Print status for the seed component
* test:ingress:                 Run all kustomize ingress build tests
* test:ingress:argocd:          Run ArgoCD ingress build tests
* test:ingress:backstage:       Run Backstage ingress build tests
* test:ingress:kargo:           Run Kargo ingress build tests
* uv:build:                               Build the UV Docker image
* uv:clean:                               Clean up local UV images
* uv:debug:shell:                         Get a shell in the UV image for debugging (if possible)
* uv:push:                                Push the UV Docker image to registry
* uv:run:                                 Run the UV image as a server (default mode)
* uv:run:script:                          Run a script in the UV image (usage - task run:script SCRIPT=app.py ARGS="--help")
* uv:shell:                               Open a python shell inside the image
* uv:test:analysis:                       Test running the image factory analysis tool
* uv:test:entrypoint:                     Test the entrypoint script directly
* uv:test:kubernetes:                     Test the image in a Kubernetes job (similar to AnalysisTemplate)
* uv:test:paths:                          Test what Python paths are available in the image
* uv:test:simple:                         Test the UV image with a simple script

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

## Updating This File

This file should be regenerated when new tasks are added. Run `task docs:taskfile` to update it with the latest task list.
