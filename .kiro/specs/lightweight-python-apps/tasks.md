# Implementation Plan: Lightweight Python Applications

## Overview

Refactor backstage-catalog-api to follow the lightweight Python app pattern: extract code from ConfigMap YAML to files, add unit tests, and use Kustomize to generate ConfigMaps.

## Tasks

- [x] 1. Refactor backstage-catalog-api to use file-based code
  - [x] 1.1 Create directory structure and extract code
    - Create `eda/mesh/services/backstage-catalog-api/` directory
    - Extract `app.py` from configmap.yaml to `eda/mesh/services/backstage-catalog-api/app.py`
    - Extract `pyproject.toml` from configmap.yaml to `eda/mesh/services/backstage-catalog-api/pyproject.toml`
    - Add pytest, pytest-asyncio, and httpx to dev-dependencies in pyproject.toml
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.2_
  
  - [x] 1.2 Create unit tests
    - Create `tests/` directory with `__init__.py`, `conftest.py`, and `test_app.py`
    - Write tests for root endpoint (GET /) with mocked Kubernetes API
    - Write tests for ConfigMap endpoint (GET /{namespace}/{configmap})
    - Test error handling (missing ConfigMap, empty data)
    - Ensure tests run without requiring Kubernetes cluster
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 1.3 Update Kustomize configuration
    - Update `eda/kustomize/mesh/backstage-catalog-api/kustomization.yaml` to use configMapGenerator
    - Reference files with relative path: `../../../mesh/services/backstage-catalog-api/`
    - Remove embedded code from configmap.yaml (or delete file if no longer needed)
    - Verify deployment mounts ConfigMap to /integration
    - _Requirements: 2.1, 2.2, 2.4, 5.1, 7.4_
  
  - [x] 1.4 Add task command and verify
    - Add `eda:test:unit` task to Taskfile.yaml (accepts APP and CATEGORY parameters)
    - Test locally: `task eda:test:unit APP=backstage-catalog-api`
    - Build kustomization and verify ConfigMap is generated correctly
    - Deploy to cluster and verify application works
    - _Requirements: 4.1, 4.2, 4.4, 2.3, 6.4_

## Notes

- Focus on backstage-catalog-api as the first example
- UV base image requires no changes
- Pattern can be replicated for other lightweight Python apps
