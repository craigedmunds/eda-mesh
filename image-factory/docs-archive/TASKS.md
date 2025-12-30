# Image Factory - Implementation Tasks

## Current Status

### Small TODOs
* Reorganise the documentation
* Reconsider how we commit version increments as atm if multiple images are built from a commit, they conflict. Either commit it immediately, only build one image at a time to prevent it being a problem, or another solution?
* Refactor image factory cdk8s project to make it easier to read, and ideally avoid the stage.add_json_patch(JsonPatch" stuff
* Scan "external" images - trivy? Where could we put the "result" of the scan?
* Refactor the docker image build github actions for re-use
* Represent the image factory in backstage

### ✅ Complete

1. **Analysis Tool** (`apps/image-factory/app.py`)
   - Reads `images.yaml` enrollment configuration
   - Distinguishes between managed and external images
   - Parses Dockerfiles to discover base images (managed images only)
   - Generates/updates state files in `state/images/` and `state/base-images/`
   - Adds warehouse config (repoURL, allowTags) to external images and base images
   - Does NOT add warehouse config to managed images
   - Runs as a Python script in the uv container
   - Accepts command-line arguments from Kargo AnalysisTemplate

2. **Kargo Resources** (`kustomize/image-factory/`)
   - Warehouse for backstage image (managed)
   - AnalysisTemplate that runs the tool
   - Stage pipeline: `analyze-dockerfile` → `analyzed`
   - ConfigMap with tool source code (via configMapGenerator)

3. **CDK8s App** (`cdk8s/image-factory/main.py`)
   - Reads BOTH images.yaml AND state files
   - Merges them (images.yaml takes precedence)
   - Generates Kargo Warehouse resources ONLY for images with repoURL + allowTags
   - Creates warehouses for each different image type

5. **Updated uv run.sh** (`apps/uv/run.sh`)
   - Accepts script name as first argument
   - Allows K8s jobs to run different Python scripts
   - Maintains backward compatibility for uvicorn server


### To be verified

4. **Tests**
   - Unit tests for the analysis tool (`apps/image-factory/test_app.py`)
   - Unit tests for the cdk8s app (`cdk8s/image-factory/test_main.py`)
   - Integration tests verifying tool → state → CDK8s workflow (`image-factory/test_integration.py`)
   - Tests verify data alignment between tool output and CDK8s input

6. **Documentation**
   - REQUIREMENTS.md - Functional requirements including managed vs external images
   - DESIGN.md - Architecture with data alignment contract
   - README.md - Concise user guide
   - WORKFLOW.md - Detailed workflow documentation

## 📋 Backlog

### Phase 1: Core Functionality

#### Task 4: Multi-Image Support
- [ ] Add more managed images to images.yaml
- [ ] Add external images to images.yaml (with warehouse config)
- [ ] Test analysis with different Dockerfile patterns
- [ ] Handle multi-stage builds
- [ ] Handle multiple FROM statements
- [ ] Verify correct warehouse generation for each type

#### Task 5: Image Lifecycle Transitions
- [ ] Test External → Managed transition (add source to images.yaml)
- [ ] Verify warehouse config removed from state
- [ ] Verify CDK8s stops generating warehouse
- [ ] Test Managed → External transition (remove source from images.yaml)
- [ ] Verify warehouse config added to state
- [ ] Verify CDK8s starts generating warehouse
- [ ] Test Base Image → Managed transition

#### Task 6: Git Integration
- [ ] Configure git credentials in analysis job
- [ ] Test commit and push from analysis job
- [ ] Handle merge conflicts
- [ ] Add commit message templates

#### Task 7: Error Handling
- [ ] Handle missing Dockerfiles gracefully (for managed images)
- [ ] Handle invalid Dockerfile syntax
- [ ] Handle missing warehouse config (for external images)
- [ ] Retry logic for transient failures
- [ ] Alert on persistent failures

### Phase 2: Base Image Monitoring

#### Task 8: Base Image Update Detection
- [ ] Verify Kargo detects base image digest changes
- [ ] Test Freight creation for base images
- [ ] Verify state updates on base image changes
- [ ] Ensure only base images (not managed images) trigger monitoring

#### Task 9: Rebuild Decision Logic
- [ ] Implement 7-day delay check
- [ ] Update state with rebuild eligibility
- [ ] Handle immediate rebuild for critical CVEs
- [ ] Track rebuild history

#### Task 10: Rebuild Triggering
- [ ] Implement GitHub workflow_dispatch trigger
- [ ] Implement GitLab pipeline trigger
- [ ] Pass base image digest to build
- [ ] Update state with rebuild attempt

### Phase 3: Advanced Features

#### Task 11: Dependency Graph
- [ ] Build complete dependency graph
- [ ] Visualize dependencies (managed → base images)
- [ ] Cascade rebuilds through chain
- [ ] Detect circular dependencies

#### Task 12: External Image Monitoring
- [ ] Test external image enrollment (postgres, redis, etc.)
- [ ] Verify warehouse config in state files
- [ ] Verify CDK8s generates warehouses for external images
- [ ] Test external image updates trigger Freight

#### Task 13: Multi-Provider Support
- [ ] Test with GitLab repositories
- [ ] Support GitLab CI/CD triggers
- [ ] Handle different authentication methods
- [ ] Support private registries

#### Task 14: Monitoring & Observability
- [ ] Add metrics for analysis runs
- [ ] Track rebuild success/failure rates
- [ ] Alert on stale images
- [ ] Dashboard for image status
- [ ] Metrics for managed vs external image counts
- [ ] Track lifecycle transitions

### Phase 4: Security & Compliance

#### Task 15: Image Verification
- [ ] Verify image signatures with cosign
- [ ] Check SBOM attestations
- [ ] Verify provenance
- [ ] Block unsigned images
- [ ] Apply to both managed and external images

#### Task 16: Vulnerability Scanning
- [ ] Integrate with Trivy
- [ ] Track CVEs in base images and external images
- [ ] Trigger immediate rebuilds for critical CVEs
- [ ] Generate vulnerability reports

#### Task 17: Compliance Reporting
- [ ] Track image age
- [ ] Report on stale images
- [ ] Audit rebuild history
- [ ] Generate compliance reports

## 🧪 Testing Tasks

### Task 16: Expand Test Coverage
- [ ] Add tests for multi-stage Dockerfiles
- [ ] Test error conditions
- [ ] Test merge logic thoroughly
- [ ] Add performance tests

### Task 17: Integration Testing
- [ ] End-to-end test in test cluster
- [ ] Test with real GitHub/GitLab repos
- [ ] Test rebuild triggering
- [ ] Test rollback scenarios

### Task 18: Load Testing
- [ ] Test with 100+ images
- [ ] Test concurrent analysis jobs
- [ ] Measure resource usage
- [ ] Optimize performance

## 📚 Documentation Tasks

### Task 19: User Documentation
- [ ] Getting started guide
- [ ] How to enroll an image
- [ ] Troubleshooting guide
- [ ] FAQ

### Task 20: Developer Documentation
- [ ] Architecture deep dive
- [ ] Contributing guide
- [ ] API documentation
- [ ] Testing guide

### Task 21: Operations Documentation
- [ ] Deployment guide
- [ ] Monitoring guide
- [ ] Backup and recovery
- [ ] Disaster recovery

## 🔧 Infrastructure Tasks

### Task 22: CI/CD Pipeline
- [ ] Automated testing on PR
- [ ] Build and push uv image
- [ ] Deploy to test cluster
- [ ] Automated promotion to prod

### Task 23: Secrets Management
- [ ] Document required secrets
- [ ] Setup secret rotation
- [ ] Audit secret access
- [ ] Implement least privilege

### Task 24: RBAC Configuration
- [ ] Define ServiceAccount permissions
- [ ] Create Roles and RoleBindings
- [ ] Test with minimal permissions
- [ ] Document RBAC requirements

## Quick Start Commands

### Running the Tool Locally
```bash
cd apps/image-factory
python app.py \
  --image backstage \
  --tag 0.6.3 \
  --digest sha256:... \
  --dockerfile apps/backstage/packages/backend/Dockerfile \
  --source-repo craigedmunds/argocd-eda \
  --source-provider github \
  --git-repo https://github.com/craigedmunds/argocd-eda.git \
  --git-branch main \
  --image-factory-dir ../../image-factory
```

### Generating Kargo Manifests
```bash
cd cdk8s/image-factory
cdk8s synth
# Output in dist/image-factory.k8s.yaml
```

### Running Tests
```bash
# Test the analysis tool
cd apps/image-factory
pytest test_app.py -v

# Test the cdk8s app
cd cdk8s/image-factory
pytest test_main.py -v

# Integration tests
cd image-factory
pytest test_integration.py -v
```

### Applying to Cluster
```bash
# Apply kustomize resources
kubectl apply -k kustomize/image-factory/

# Check status
kubectl get warehouses -n image-factory-kargo
kubectl get stages -n image-factory-kargo
kubectl get freight -n image-factory-kargo
```
