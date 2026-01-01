# Branch Targeting Component Tests

This directory contains comprehensive tests for the ArgoCD branch targeting component functionality.

## Overview

The branch targeting component allows all ArgoCD applications to track a specific Git branch by:
1. Updating `targetRevision` fields in git sources
2. Updating `feature_branch` helm parameters for helm applications
3. Supporting both Application and ApplicationSet resources
4. Handling multisource applications correctly

## Test Structure

### Unit Tests (`unit/`)

- **`test_platform_seed_overlays.py`** - Tests for platform seed overlays:
  - `platform/kustomize/seed/overlays/local/pi` (main branch)
  - `platform/kustomize/seed/overlays/local/craig` (feature/backstage-events branch)
  - `platform/kustomize/seed/overlays/local/lab` (main branch)

- **`test_eda_mesh_overlays.py`** - Tests for EDA mesh overlays:
  - `eda/kustomize/mesh/overlays/craig` (feature/backstage-events branch)
  - `eda/kustomize/mesh/overlays/lab` (main branch)

### Base Classes

- **`base_test.py`** - Base test classes with common functionality:
  - `BaseBranchTargetingTest` - Core branch targeting validation
  - Tests for git applications, ApplicationSets, helm applications, and multisource handling

- **`conftest.py`** - Pytest fixtures and utilities:
  - `kustomize_builder` - Builds kustomize overlays with caching
  - `branch_targeting_validator` - Validates branch targeting functionality

## Test Coverage

The tests validate:

1. **ConfigMap Existence**: Branch targeting ConfigMap exists with correct target revision
2. **Git Applications**: Applications with branch targeting labels use correct target revision
3. **Git ApplicationSets**: ApplicationSets with branch targeting labels use correct target revision and git generator revision
4. **Helm Applications**: Helm applications use correct `feature_branch` parameter value
5. **Helm ApplicationSets**: Helm ApplicationSets use correct `feature_branch` parameter value
6. **Multisource Support**: Multisource applications update all sources correctly
7. **Label Validation**: Resources have required branch targeting labels

## Running Tests

### Prerequisites

```bash
# Install dependencies
pip install -r requirements.txt

# Ensure kustomize is available
which kustomize
```

### Run All Tests

```bash
# From the unit test directory
cd platform/kustomize/_common/components/argocd-branch-targetrevision/tests/unit
pytest

# Or from project root
pytest platform/kustomize/_common/components/argocd-branch-targetrevision/tests/unit/
```

### Run Specific Test Files

```bash
# Platform seed overlay tests
pytest test_platform_seed_overlays.py

# EDA mesh overlay tests  
pytest test_eda_mesh_overlays.py
```

### Run Specific Test Classes

```bash
# Test specific overlay
pytest test_platform_seed_overlays.py::TestPlatformSeedLocalCraig

# Test specific functionality
pytest -k "helm_applications"
```

## Test Requirements Validation

These tests validate the following requirements:

- **5.1**: Branch targeting mechanism allows all applications to track specific branch
- **5.2**: Target revision ConfigMap controls all labeled applications
- **5.3**: Applications are labeled with repo=argocd-eda for targeting
- **5.4**: Component supports both single-source and multi-source applications
- **5.5**: Component works for both Application and ApplicationSet resources
- **5.6**: Helm applications have branch parameters updated automatically
- **5.7**: Generic "feature_branch" parameter is used instead of service-specific names
- **5.8**: Helm applications are updated by component without manual patches

## Expected Test Results

All tests should pass when:
- Kustomize overlays build successfully
- Branch targeting ConfigMaps exist with correct target revisions
- ArgoCD resources with branch targeting labels use the configured target revision
- Helm applications use the correct `feature_branch` parameter value
- Multisource applications handle all sources correctly

## Troubleshooting

### Common Issues

1. **Kustomize build failures**: Ensure all referenced resources exist and paths are correct
2. **Missing labels**: Verify ArgoCD resources have required `repo=argocd-eda` and `argocd-branch-targetrevision=true` labels
3. **Wrong target revision**: Check ConfigMap generation in overlay kustomization.yaml files
4. **Helm parameter issues**: Verify helm applications have `feature_branch` parameter defined

### Debug Output

Tests include detailed output showing:
- Which overlay is being tested
- Expected vs actual target revisions
- Found applications and ApplicationSets
- Label validation results