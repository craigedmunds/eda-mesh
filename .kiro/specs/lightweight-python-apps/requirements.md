# Requirements Document: Lightweight Python Applications

## Introduction

Lightweight Python applications are simple services that run using the existing UV base image without requiring custom Docker images. Currently, the backstage-catalog-api has its Python code embedded directly in a ConfigMap YAML file. This document specifies requirements for properly structuring UV-based applications with code stored as files, unit tests, and Kustomize-generated ConfigMaps. The UV base image itself requires no changes - it already supports this pattern.

## Glossary

- **UV_Image**: A Docker base image containing Python and the UV package manager
- **Lightweight_App**: A Python application that runs using the UV base image without a custom Docker build
- **App_Directory**: Directory containing a lightweight app's Python code, tests, and configuration
- **ConfigMap_Generator**: Kustomize feature that generates ConfigMaps from files
- **Unit_Test**: Automated test that verifies individual functions or components
- **Integration_Test**: Automated test that verifies the application works with external dependencies

## Requirements

### Requirement 1: Store Application Code as Files

**User Story:** As a developer, I want application code stored as Python files in the repository, so that I can use standard development tools, linters, and version control effectively.

#### Acceptance Criteria

1. THE App_Directory SHALL contain an app.py file with the application code
2. THE App_Directory SHALL contain a pyproject.toml file declaring dependencies
3. THE App_Directory SHALL be located at eda/mesh/{category}/{app-name}/ (alongside the source code)
4. THE kustomization.yaml SHALL NOT embed Python code directly in ConfigMap YAML

### Requirement 2: Generate ConfigMaps from Files

**User Story:** As a developer, I want Kustomize to automatically generate ConfigMaps from my Python files, so that deployments stay synchronized with code changes.

#### Acceptance Criteria

1. WHEN kustomization.yaml is built, THE ConfigMap_Generator SHALL create a ConfigMap containing app.py
2. WHEN kustomization.yaml is built, THE ConfigMap_Generator SHALL include pyproject.toml in the ConfigMap
3. WHEN files change, THE ConfigMap_Generator SHALL generate a new ConfigMap with a unique name suffix
4. THE kustomization.yaml SHALL use configMapGenerator with files option pointing to the integration directory

### Requirement 3: Provide Unit Testing

**User Story:** As a developer, I want to write and run unit tests for my application code, so that I can verify functionality before deployment.

#### Acceptance Criteria

1. THE App_Directory SHALL contain a tests/ subdirectory for unit tests
2. THE pyproject.toml SHALL include pytest as a dev dependency
3. WHEN unit tests run, THE Unit_Test SHALL verify API endpoints return expected responses
4. WHEN unit tests run, THE Unit_Test SHALL verify error handling works correctly
5. WHEN unit tests run, THE Unit_Test SHALL use mocking for external dependencies like Kubernetes API
6. WHEN unit tests run, THE Unit_Test SHALL NOT require a Kubernetes cluster

### Requirement 4: Provide Test Execution Commands

**User Story:** As a developer, I want simple commands to run tests locally and in CI/CD, so that testing is easy and consistent.

#### Acceptance Criteria

1. THE repository SHALL provide a task command for running unit tests (e.g., task eda:test:unit APP=backstage-catalog-api)
2. WHEN tests run locally, THE Unit_Test SHALL execute using pytest
3. WHEN tests run in CI, THE Unit_Test SHALL execute as part of the build pipeline
4. THE task command SHALL install test dependencies automatically before running tests

### Requirement 5: Mount Code into Containers

**User Story:** As a platform operator, I want application code mounted from ConfigMaps into containers, so that the UV base image can execute it.

#### Acceptance Criteria

1. WHEN a deployment is created, THE Kubernetes manifest SHALL mount the ConfigMap to /integration
2. WHEN the container starts, THE UV_Image entrypoint SHALL find app.py at /integration/app.py
3. WHEN the container starts, THE UV_Image entrypoint SHALL find pyproject.toml at /integration/pyproject.toml
4. WHEN dependencies are declared, THE UV_Image entrypoint SHALL install them before running the application

### Requirement 6: Support FastAPI Applications

**User Story:** As a developer, I want to build FastAPI applications that run with uvicorn, so that I can create REST APIs quickly.

#### Acceptance Criteria

1. WHEN app.py contains a FastAPI application, THE UV_Image SHALL run it with uvicorn
2. WHEN the application starts, THE UV_Image SHALL expose it on port 8080
3. WHEN the application starts, THE UV_Image SHALL bind to 0.0.0.0 for external access
4. THE pyproject.toml SHALL declare fastapi and uvicorn as dependencies

### Requirement 7: Maintain Consistent Structure

**User Story:** As a developer, I want all lightweight Python apps to follow the same structure, so that they are easy to understand and maintain.

#### Acceptance Criteria

1. THE App_Directory SHALL be located at: eda/mesh/{category}/{app-name}/
2. THE App_Directory SHALL contain: app.py, pyproject.toml, tests/
3. THE kustomization.yaml SHALL be located at: eda/kustomize/mesh/{app-name}/kustomization.yaml
4. THE kustomization.yaml SHALL reference the app directory using a relative path (../../../mesh/{category}/{app-name})
