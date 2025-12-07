# Image Factory Spec

This directory contains the formal specification for the Image Factory system, following Kiro's spec-driven development methodology.

## Spec Documents

### [requirements.md](requirements.md)
User stories and acceptance criteria in EARS (Easy Approach to Requirements Syntax) format. Defines what the system should do from a user perspective.

**Key sections:**
- Image enrollment and lifecycle management
- Dockerfile analysis and dependency discovery
- State management and GitOps integration
- Base image monitoring and rebuild orchestration
- Error handling and resilience

### [design.md](design.md)
Architecture, component design, data models, and correctness properties. Defines how the system works internally.

**Key sections:**
- Event-driven workflow architecture
- Component design (Analysis Tool, CDK8s App, Kargo Resources)
- Data models (images.yaml, state files)
- Data alignment contract between components
- Correctness properties for testing
- Integration points and security design

### [tasks.md](tasks.md)
Implementation checklist showing what's complete and what's planned. Organized into phases.

**Current status:**
- ✅ Phase 1 Complete: Core implementation working
- 📋 Phase 2 Next: Enhanced functionality (multi-stage, external images, delays)
- 🔮 Phase 3-5 Future: Advanced features, documentation, optimization

## Implementation Status

**✅ Working (Phase 1 Complete):**
- Analysis Tool parses Dockerfiles and generates state files
- CDK8s App generates Kargo Warehouse and Stage manifests
- Kargo monitors registries and triggers analysis jobs
- Automated rebuild triggers via GitHub Actions
- State files tracked in git for audit trail
- Basic test coverage

**📋 Next Steps (Phase 2):**
- Multi-stage Dockerfile support (track all FROM statements)
- External image enrollment (postgres, redis, etc.)
- Rebuild delay enforcement (7-day wait period)
- Enhanced error handling and notifications

**🔮 Future Enhancements (Phase 3-5):**
- GitLab support
- Dependency graph visualization
- Security scanning (Trivy, cosign)
- Performance optimization
- Backstage integration

## Quick Links

- **User Guide**: `image-factory/README.md` - Quick reference for daily use
- **Analysis Tool**: `apps/image-factory/app.py` - Dockerfile parser and state generator
- **CDK8s App**: `cdk8s/image-factory/main.py` - Manifest generator
- **Configuration**: `image-factory/images.yaml` - Image enrollment registry
- **State Files**: `image-factory/state/` - Runtime tracking data
- **Tests**: `apps/image-factory/test_app.py`, `cdk8s/image-factory/test_main.py`, `image-factory/test_integration.py`

## Development Workflow

1. **Enroll image** - Add to `image-factory/images.yaml`
2. **Generate state** - Run Analysis Tool (or let Kargo do it)
3. **Generate manifests** - Run `cdk8s synth` in `cdk8s/image-factory/`
4. **Apply to cluster** - `kubectl apply -f dist/image-factory.k8s.yaml`
5. **Monitor** - Check Kargo UI or `kubectl get warehouses,stages,freight -n image-factory-kargo`

## Architecture Overview

```
images.yaml (enrollment) → Analysis Tool → state files
                                              ↓
                                          CDK8s App
                                              ↓
                                    Kargo manifests
                                              ↓
                                          ArgoCD
                                              ↓
                                    Kubernetes cluster
                                              ↓
                        Kargo Warehouses monitor registries
                                              ↓
                        Freight triggers analysis & rebuilds
```

## Key Design Decisions

1. **Pure Kargo**: All monitoring via Warehouses, all orchestration via Stages
2. **Event-driven**: No polling, react to Freight creation
3. **GitOps native**: All config and state in git, ArgoCD applies everything
4. **Data alignment**: Analysis Tool output matches CDK8s input requirements
5. **Separation of concerns**: Analysis generates state, CDK8s generates manifests, Kargo orchestrates

## Testing Strategy

- **Unit tests**: Test individual components (Analysis Tool, CDK8s App)
- **Integration tests**: Test complete workflow (enrollment → state → manifests)
- **Property-based tests**: Future enhancement using Hypothesis
- **Manual testing**: Test in cluster with real images and registries

## Documentation History

This spec was created on 2024-12-07 by consolidating and organizing the original documentation files that were scattered in the `image-factory/` directory. The original files have been archived in `image-factory/docs-archive/` for reference.

The spec follows Kiro's methodology:
- **Requirements**: EARS-compliant user stories and acceptance criteria
- **Design**: Architecture, components, data models, correctness properties
- **Tasks**: Implementation checklist with phase organization
