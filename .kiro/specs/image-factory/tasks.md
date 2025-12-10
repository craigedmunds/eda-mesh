# Image Factory - Implementation Tasks

## Phase 1: Core Implementation ✅

- [x] 1. Analysis Tool Implementation
  - [x] 1.1 Create ImageFactoryTool class with state management
  - [x] 1.2 Implement Dockerfile parsing to extract FROM statements
  - [x] 1.3 Implement image reference parsing (registry, repository, tag)
  - [x] 1.4 Implement base image state generation with warehouse config
  - [x] 1.5 Implement managed image state generation without warehouse config
  - [x] 1.6 Implement external image state generation with warehouse config
  - [x] 1.7 Implement state merging logic to preserve runtime data
  - [x] 1.8 Implement formatted YAML output with comments
  - [x] 1.9 Add command-line argument parsing for Kargo integration
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. CDK8s App Implementation
  - [x] 2.1 Create modular library structure (data, warehouses, stages, analysis, infrastructure)
  - [x] 2.2 Implement images.yaml and state file loading
  - [x] 2.3 Implement merge logic (images.yaml takes precedence)
  - [x] 2.4 Implement warehouse generation for managed images (monitor built image)
  - [x] 2.5 Implement warehouse generation for base images (monitor upstream)
  - [x] 2.6 Implement warehouse generation for external images (monitor upstream)
  - [x] 2.7 Implement AnalysisTemplate generation
  - [x] 2.8 Implement analysis stage generation for managed images
  - [x] 2.9 Implement dependency graph building
  - [x] 2.10 Implement rebuild-trigger stage generation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 6.1, 6.2, 7.1, 7.2, 7.3, 7.4_

- [x] 3. Kargo Resources Setup
  - [x] 3.1 Create namespace and RBAC configuration
  - [x] 3.2 Create ServiceAccount for Analysis Jobs
  - [x] 3.3 Create github-credentials secret (via Kyverno)
  - [x] 3.4 Configure git credentials for Analysis Jobs
  - [x] 3.5 Test Analysis Job execution in cluster
  - _Requirements: 7.5, 8.1, 8.2, 8.4_

- [x] 4. Initial Image Enrollment
  - [x] 4.1 Enroll backstage managed image in images.yaml
  - [x] 4.2 Enroll uv managed image in images.yaml
  - [x] 4.3 Run Analysis Tool to generate initial state files
  - [x] 4.4 Run CDK8s to generate initial manifests
  - [x] 4.5 Apply manifests to cluster and verify Warehouses created
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 5. Rebuild Trigger Implementation
  - [x] 5.1 Implement HTTP step in rebuild-trigger stages
  - [x] 5.2 Configure GitHub API authentication
  - [x] 5.3 Implement workflow_dispatch parameter passing
  - [x] 5.4 Test manual rebuild trigger
  - [x] 5.5 Verify automatic rebuild on base image update
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

## Phase 2: Enhanced Functionality 📋

- [ ] 7. Multi-Stage Dockerfile Support
  - [ ] 7.1 Update Dockerfile parser to extract all FROM statements
  - [ ] 7.2 Implement logic to track multiple base images per managed image
  - [ ] 7.3 Update state file format to support multiple base images
  - [ ] 7.4 Update CDK8s to create rebuild-triggers for all base images
  - [ ] 7.5 Test with multi-stage Dockerfile examples
  - _Requirements: 2.5_

- [ ] 8. External Image Enrollment
  - [ ] 8.1 Add external image examples to images.yaml (postgres, redis, etc.)
  - [ ] 8.2 Verify Analysis Tool generates state with warehouse config
  - [ ] 8.3 Verify CDK8s generates warehouses for external images
  - [ ] 8.4 Test external image update detection
  - [ ] 8.5 Document external image enrollment process
  - _Requirements: 1.2, 4.2_

- [ ] 9. Image Lifecycle Transition Testing
  - [ ] 9.1 Test External → Managed transition
  - [ ] 9.2 Verify warehouse config removed from state
  - [ ] 9.3 Verify CDK8s stops generating upstream warehouse
  - [ ] 9.4 Test Managed → External transition
  - [ ] 9.5 Verify warehouse config added to state
  - [ ] 9.6 Verify CDK8s starts generating upstream warehouse
  - [ ] 9.7 Test Base Image → Managed transition
  - [ ] 9.8 Verify runtime data preserved across transitions
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10. Rebuild Delay Implementation
  - [ ] 10.1 Design rebuild delay checking mechanism
  - [ ] 10.2 Implement delay calculation (lastUpdated + rebuildDelay)
  - [ ] 10.3 Update rebuildEligibleAt field in state files
  - [ ] 10.4 Implement delay check in rebuild-trigger stages
  - [ ] 10.5 Add override mechanism for critical CVEs
  - [ ] 10.6 Test delay enforcement
  - _Requirements: 1.4, 6.1_

- [ ] 11. Enhanced Error Handling
  - [ ] 11.1 Add retry logic for transient failures
  - [ ] 11.2 Implement error notifications (Slack, email)
  - [ ] 11.3 Add detailed error logging with context
  - [ ] 11.4 Implement graceful degradation for partial failures
  - [ ] 11.5 Add error recovery documentation
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Phase 3: Advanced Features 🔮

- [ ] 12. GitLab Support
  - [ ] 12.1 Add GitLab provider support in Analysis Tool
  - [ ] 12.2 Implement GitLab pipeline trigger in rebuild-trigger stages
  - [ ] 12.3 Add GitLab authentication configuration
  - [ ] 12.4 Test with GitLab repositories
  - [ ] 12.5 Document GitLab setup process
  - _Requirements: 1.5, 6.2_

- [ ] 13. Dependency Graph Visualization
  - [ ] 13.1 Build complete dependency graph from state files
  - [ ] 13.2 Generate Mermaid diagram of dependencies
  - [ ] 13.3 Create web UI for interactive visualization
  - [ ] 13.4 Add dependency cycle detection
  - [ ] 13.5 Show rebuild cascade predictions
  - _Requirements: 5.4_

- [ ] 14. Monitoring and Observability
  - [ ] 14.1 Add Prometheus metrics for analysis runs
  - [ ] 14.2 Track rebuild success/failure rates
  - [ ] 14.3 Add alerts for stale images
  - [ ] 14.4 Create Grafana dashboard for image status
  - [ ] 14.5 Track lifecycle transition metrics
  - [ ] 14.6 Add distributed tracing for workflow
  - _Requirements: NFR2_

- [ ] 15. Image Verification and Security
  - [ ] 15.1 Integrate cosign for signature verification
  - [ ] 15.2 Implement SBOM checking
  - [ ] 15.3 Verify provenance attestations
  - [ ] 15.4 Add policy enforcement (block unsigned images)
  - [ ] 15.5 Integrate Trivy for vulnerability scanning
  - [ ] 15.6 Track CVEs in base images
  - [ ] 15.7 Implement immediate rebuild for critical CVEs
  - _Requirements: NFR3_

- [ ] 16. State File Cleanup
  - [ ] 16.1 Detect images removed from images.yaml
  - [ ] 16.2 Implement archival strategy for old state files
  - [ ] 16.3 Add cleanup command to Analysis Tool
  - [ ] 16.4 Preserve historical data for audit
  - [ ] 16.5 Document cleanup procedures
  - _Open Question: 4_

- [ ] 17. Rate Limiting and Caching
  - [ ] 17.1 Implement pull-through cache for Docker Hub
  - [ ] 17.2 Add rate limit handling in Kargo Warehouses
  - [ ] 17.3 Cache Dockerfile parsing results
  - [ ] 17.4 Implement exponential backoff for registry calls
  - [ ] 17.5 Monitor rate limit usage
  - _Open Question: 3_

## Phase 4: Backstage Self-Service Enrollment 🎯

- [x] 25. Common Package Setup
  - [x] 25.1 Create @internal/plugin-image-factory-common package structure
  - [x] 25.2 Define ManagedImage and BaseImage entity kind constants
  - [x] 25.3 Define TypeScript interfaces for image entities
  - [x] 25.4 Create annotation key constants (registry, repository, digest, etc.)
  - [x] 25.5 Implement utility functions for parsing entity annotations
  - [x] 25.6 Add validation schemas for enrollment data
  - [x] 25.7 Export all types and utilities
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 26. Backend API Implementation
  - [x] 26.1 Create @internal/plugin-image-factory-backend package structure
  - [x] 26.2 Set up Express router with authentication middleware
  - [x] 26.3 Implement POST /api/image-factory/images endpoint for enrollment
  - [x] 26.4 Add input validation using common package schemas
  - [x] 26.5 Implement GitHub API integration for PR creation
  - [x] 26.6 Add logic to create branch, commit images.yaml changes, open PR
  - [x] 26.7 Implement error handling and logging
  - [x] 26.8 Add GET /api/image-factory/images endpoint for listing
  - [x] 26.9 Add GET /api/image-factory/images/:name endpoint for details
  - [x] 26.10 Configure backend plugin in Backstage app
  - _Requirements: 11.9, 11.10, 11.11_

- [ ] 27. Frontend Enrollment UI
  - [ ] 27.1 Create @internal/plugin-image-factory package structure
  - [ ] 27.2 Build EnrollImageDialog component with form fields
  - [ ] 27.3 Add form fields: name, registry, repository
  - [ ] 27.4 Add source provider selection (GitHub/GitLab)
  - [ ] 27.5 Add source fields: repo, branch, dockerfile path, workflow
  - [ ] 27.6 Add rebuild policy fields: delay, auto-rebuild toggle
  - [ ] 27.7 Implement form validation with error messages
  - [ ] 27.8 Add submit handler that calls backend API
  - [ ] 27.9 Display PR URL on successful enrollment
  - [ ] 27.10 Add loading states and error handling
  - [ ] 27.11 Style form to match Backstage design system
  - _Requirements: 11.9, 11.10, 11.11_

- [ ] 28. Integration and Testing
  - [ ] 28.1 Test enrollment API with various valid inputs
  - [ ] 28.2 Test validation with invalid inputs
  - [ ] 28.3 Test PR creation in GitHub
  - [ ] 28.4 Test complete flow: UI → API → PR → merge → analysis
  - [ ] 28.5 Verify new entities appear in Backstage after enrollment
  - [ ] 28.6 Test error scenarios (API failures, GitHub errors)
  - [ ] 28.7 Add unit tests for backend endpoints
  - [ ] 28.8 Add component tests for enrollment form
  - [ ] 28.9 Document enrollment workflow for users
  - _Requirements: 11.9, 11.10, 11.11_

- [ ] 29. Container Registry Integration - Backend
  - [ ] 29.1 Create registry adapter interface
  - [ ] 29.2 Implement GitHubPackagesAdapter for GHCR
  - [ ] 29.3 Implement DockerHubAdapter for Docker Hub
  - [ ] 29.4 Add GET /api/image-factory/images/:name/versions endpoint
  - [ ] 29.5 Implement response caching (5 minute TTL)
  - [ ] 29.6 Add authentication handling for registries
  - [ ] 29.7 Normalize response format across registries
  - [ ] 29.8 Add error handling for registry unavailability
  - [ ] 29.9 Add pagination support for large version lists
  - [ ] 29.10 Add unit tests for registry adapters
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6_

- [x] 30. Container Registry Integration - Frontend ✅
  - [x] 30.1 Create ImageVersionsCard component ✅
  - [x] 30.2 Add table to display versions (tag, digest, size, date) ✅
  - [x] 30.3 Implement copy-to-clipboard for image references ✅
  - [x] 30.4 Add pagination controls ✅
  - [x] 30.5 Add loading and error states ✅
  - [x] 30.6 Style component to match Backstage design system ✅
  - [x] 30.7 Add ImageVersionsCard to ManagedImage entity page ✅
  - [x] 30.8 Add refresh button to fetch latest versions ✅
  - [x] 30.9 Add component tests for ImageVersionsCard ✅
  - [x] 30.10 Test with real GHCR and Docker Hub data ✅
  - [x] 30.11 Move Container Versions to separate tab for better UX ✅
  - [x] 30.12 Add "View" action links to registry pages ✅
  - [x] 30.13 Create comprehensive integration test suite ✅
  - _Requirements: 12.1, 12.2, 12.5, 12.7, 12.8_

- [x] 31. GitHub Actions Integration
  - [x] 31.1 Install @backstage/plugin-github-actions package
  - [x] 31.2 Verify GitHub integration configuration in app-config.yaml
  - [x] 31.3 Add github.com/workflows annotation to ManagedImage entities
  - [x] 31.4 Create custom ManagedImage entity page component
  - [x] 31.5 Add EntityGithubActionsContent card to ManagedImage page
  - [x] 31.6 Configure card layout and positioning
  - [x] 31.7 Test workflow filtering with monorepo workflows
  - [x] 31.8 Verify workflow runs display correctly
  - [x] 31.9 Test re-run functionality (if permissions available)
  - [x] 31.10 Update example entities with workflow annotations
  - [x] 31.11 Fix API response structure handling (result.data.workflow_runs) ✅
  - [x] 31.12 Style GitHub Actions component with Backstage design system ✅
  - [x] 31.13 Optimize table layout (remove duplicate status columns) ✅
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

## Phase 5: Documentation and Operations 📚

- [ ] 18. User Documentation
  - [ ] 18.1 Write getting started guide
  - [ ] 18.2 Document image enrollment process
  - [ ] 18.3 Create troubleshooting guide
  - [ ] 18.4 Write FAQ
  - [ ] 18.5 Add example configurations
  - [ ] 18.6 Create video walkthrough

- [ ] 19. Developer Documentation
  - [ ] 19.1 Document architecture in detail
  - [ ] 19.2 Write contributing guide
  - [ ] 19.3 Document API and data models
  - [ ] 19.4 Create testing guide
  - [ ] 19.5 Add code comments and docstrings

- [ ] 20. Operations Documentation
  - [ ] 20.1 Write deployment guide
  - [ ] 20.2 Document monitoring and alerting setup
  - [ ] 20.3 Create runbook for common issues
  - [ ] 20.4 Document backup and recovery procedures
  - [ ] 20.5 Write disaster recovery plan

- [x] 21. Backstage Self-Service Enrollment (Phase 4)
  - [x] 21.1 Create common package with types and entity definitions
  - [x] 21.2 Implement backend API for image enrollment
  - [x] 21.3 Build enrollment form UI in frontend
  - [x] 21.4 Add validation and error handling
  - [x] 21.5 Test complete enrollment workflow
  - _Requirements: 11.9, 11.10, 11.11_

## Phase 6: GitHub Extensions Modular Organization 🔧

- [ ] 32. Create GitHub Extensions Common Package
  - [ ] 32.1 Create apps/backstage/plugins/github-extensions-common package structure
  - [ ] 32.2 Move GithubActionsApiClient from app/src/lib to common package
  - [ ] 32.3 Move registry client interfaces and implementations to common package
  - [ ] 32.4 Extract shared types (WorkflowRun, ImageVersion, RegistryClient) to common package
  - [ ] 32.5 Extract utility functions (formatRelativeTime, isSemanticVersionTag) to common package
  - [ ] 32.6 Define annotation constants (GITHUB_ACTIONS_ANNOTATION, etc.) in common package
  - [ ] 32.7 Create proper package.json with dependencies and exports
  - [ ]* 32.8 Add unit tests for API clients and utilities
  - _Requirements: 14.1, 14.2, 14.4, 14.7_

- [ ] 33. Create GitHub Extensions Frontend Package
  - [ ] 33.1 Create apps/backstage/plugins/github-extensions package structure
  - [ ] 33.2 Create generic GithubActionsCard component that works with any entity type
  - [ ] 33.3 Move and generalize ImageVersionsCard to work with any entity (not just ManagedImage)
  - [ ] 33.4 Extract WorkflowRunsTable as reusable component
  - [ ] 33.5 Create custom hooks (useGithubActions, useImageVersions) for data fetching
  - [ ] 33.6 Add proper plugin registration with API factory setup
  - [ ] 33.7 Create plugin.ts with proper Backstage plugin structure
  - [ ]* 33.8 Add component tests for all UI components
  - [ ] 33.9 Update components to use annotation constants from common package
  - _Requirements: 14.3, 14.5, 14.6_

- [ ] 34. Update Image Factory Plugin Integration
  - [ ] 34.1 Update image-factory plugin package.json to depend on github-extensions packages
  - [ ] 34.2 Remove GithubActionsApiClient from app/src/lib (now in common package)
  - [ ] 34.3 Remove ImageVersionsCard from image-factory plugin (now in github-extensions)
  - [ ] 34.4 Update ManagedImageEntityPage to import components from github-extensions
  - [ ] 34.5 Update App.tsx to register API clients from github-extensions-common
  - [ ] 34.6 Keep only image-factory specific components in image-factory plugin
  - [ ] 34.7 Update entity page layouts to use new component imports
  - [ ] 34.8 Verify all existing functionality works with new package structure
  - [ ]* 34.9 Update integration tests to work with modular structure
  - _Requirements: 14.1, 14.5_

- [ ] 35. Enhance Generic Entity Support
  - [ ] 35.1 Update GithubActionsCard to work with Component, API, System entities
  - [ ] 35.2 Update ImageVersionsCard to work with any entity that has registry annotations
  - [ ] 35.3 Create entity filter functions for conditional rendering
  - [ ]* 35.4 Add examples of using GitHub extensions with different entity types
  - [ ]* 35.5 Test GitHub extensions with Component and API entities
  - [ ]* 35.6 Create documentation for annotation patterns across entity types
  - _Requirements: 14.3, 14.4_

- [ ]* 36. Testing and Quality Assurance
  - [ ]* 36.1 Add comprehensive unit tests for github-extensions-common package
  - [ ]* 36.2 Add component tests for github-extensions UI components
  - [ ]* 36.3 Add integration tests for complete GitHub functionality
  - [ ]* 36.4 Test error scenarios and edge cases across all packages
  - [ ]* 36.5 Add performance tests for API clients and caching
  - [ ]* 36.6 Verify test coverage meets quality standards
  - [ ]* 36.7 Add automated testing for package dependencies
  - _Requirements: 14.8_

## Phase 7: Optimization and Scaling 🚀

- [ ] 22. Performance Optimization
  - [ ] 22.1 Implement parallel image processing in Analysis Tool
  - [ ] 22.2 Add incremental CDK8s synthesis
  - [ ] 22.3 Batch git commits for multiple state file updates
  - [ ] 22.4 Cache parsed Dockerfiles
  - [ ] 22.5 Optimize state file loading in CDK8s
  - [ ] 22.6 Profile and optimize hot paths

- [ ] 23. Load Testing
  - [ ] 23.1 Test with 100+ enrolled images
  - [ ] 23.2 Test concurrent analysis jobs
  - [ ] 23.3 Measure resource usage at scale
  - [ ] 23.4 Test git repository performance with many state files
  - [ ] 23.5 Identify and fix bottlenecks

- [ ] 24. CI/CD Pipeline Enhancement
  - [ ] 24.1 Add automated testing on PR
  - [ ] 24.2 Implement automatic manifest generation on merge
  - [ ] 24.3 Add deployment to test cluster
  - [ ] 24.4 Implement automated promotion to production
  - [ ] 24.5 Add release automation

## Key Learnings and Architectural Decisions

### Frontend Architecture Patterns

**Proxy-Based API Integration**: 
- Standard Backstage pattern for external API calls uses backend proxy configuration
- Avoids CORS issues and centralizes authentication
- Example: GitHub API and Docker Hub API calls through `/api/proxy/github-api` and `/api/proxy/dockerhub-api`

**Component Design System Consistency**:
- Always use Backstage's core components (`Table`, `InfoCard`, `StatusIcons`, `Link`, etc.)
- Avoid custom styling - leverage Material-UI theme integration
- Status indicators: Use `StatusOK`, `StatusError`, `StatusRunning`, `StatusPending` for consistency

**Entity Page Layout Best Practices**:
- Separate tabs for distinct functionality (Overview, Container Versions, CI/CD, Dependencies)
- Use `EntitySwitch` for conditional rendering based on entity type
- Grid layout with proper spacing and responsive design

### API Integration Lessons

**GitHub Actions API Structure**:
- Octokit responses have nested `data` property: `result.data.workflow_runs`
- Custom API clients need proper response structure handling
- Backend proxy authentication preferred over frontend OAuth for service integrations

**Container Registry APIs**:
- GHCR uses GitHub Packages API (`/users/{owner}/packages/container/{package}/versions`)
- Docker Hub uses different endpoint structure (`/v2/repositories/{repo}/tags`)
- Semantic version filtering essential for user experience (filter out SHA tags, "latest", etc.)

**Error Handling Patterns**:
- Always provide retry mechanisms for transient failures
- Show meaningful error messages with context
- Graceful degradation when external services unavailable

### Testing Strategy

**Integration Testing Approach**:
- Test both registry types (GHCR and Docker Hub) with different mock responses
- Verify UI interactions (copy-to-clipboard, refresh, pagination)
- Test error scenarios and edge cases
- End-to-end workflow validation

**Component Testing Best Practices**:
- Mock external dependencies (fetch, APIs)
- Test loading states, error states, and success states
- Verify accessibility and user interactions
- Use React Testing Library patterns with `waitFor` and `act`

### UI/UX Improvements Discovered

**Table Design Optimization**:
- Avoid duplicate information in columns (e.g., status icon + status chip)
- Inline related information (status icon with workflow name)
- Consistent action column naming ("View" not "View on Registry")
- Smart external link generation based on registry type

**User Experience Enhancements**:
- Copy-to-clipboard for technical references (image tags, digests)
- Direct links to external resources (registry pages, GitHub Actions)
- Real-time refresh capabilities with loading indicators
- Semantic version filtering for cleaner version lists

## Current Status Summary

**✅ Complete (Phase 1):**
- Analysis Tool with Dockerfile parsing and state generation
- CDK8s App with warehouse and stage generation
- Kargo resources (Warehouses, Stages, AnalysisTemplate)
- Initial image enrollment (backstage, uv)
- Automated rebuild triggers via GitHub Actions
- Basic testing infrastructure

**🚧 In Progress:**
- Documentation reorganization (this spec!)

**📋 Next Up (Phase 2):**
- Multi-stage Dockerfile support
- External image enrollment
- Rebuild delay implementation
- Enhanced error handling

**🔮 Future (Phases 3-5):**
- GitLab support
- Dependency visualization
- Security scanning
- Performance optimization
- Backstage integration

## Quick Reference Commands

### Run Analysis Tool Locally
```bash
cd apps/image-factory
python app.py \
  --image backstage \
  --tag 0.6.3 \
  --digest sha256:abc123 \
  --dockerfile apps/backstage/packages/backend/Dockerfile \
  --source-repo craigedmunds/argocd-eda \
  --source-provider github \
  --git-repo https://github.com/craigedmunds/argocd-eda.git \
  --git-branch main \
  --image-factory-dir ../../image-factory
```

### Generate Kargo Manifests
```bash
cd cdk8s/image-factory
cdk8s synth
# Output: dist/image-factory.k8s.yaml
```

### Run Tests
```bash
# Analysis Tool tests
cd apps/image-factory
pytest test_app.py -v

# CDK8s App tests
cd cdk8s/image-factory
pytest test_main.py -v

# Integration tests
cd image-factory
pytest test_integration.py -v
```

### Apply to Cluster
```bash
# Apply generated manifests
kubectl apply -f cdk8s/image-factory/dist/image-factory.k8s.yaml

# Check status
kubectl get warehouses -n image-factory-kargo
kubectl get stages -n image-factory-kargo
kubectl get freight -n image-factory-kargo

# View analysis logs
kubectl logs -n image-factory-kargo -l job-name --tail=100
```

### Manual Rebuild Trigger
```bash
# Trigger rebuild for backstage
kubectl kargo promote \
  --stage rebuild-trigger-backstage \
  --namespace image-factory-kargo
```

### View State Files
```bash
# View managed image state
cat image-factory/state/images/backstage.yaml

# View base image state
cat image-factory/state/base-images/node-22-bookworm-slim.yaml

# List all state files
find image-factory/state -name "*.yaml"
```
