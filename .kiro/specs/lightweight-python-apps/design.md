# Design Document: Lightweight Python Applications

## Overview

This design specifies how to structure lightweight Python applications that run using the UV base image. The key principle is to store Python code as actual files in the repository (not embedded in YAML), use Kustomize to generate ConfigMaps from those files, and provide unit testing infrastructure. The UV base image itself requires no changes - it already supports mounting code from ConfigMaps at `/integration`.

## Architecture

### Directory Structure

```
eda/
├── mesh/
│   └── services/
│       └── backstage-catalog-api/
│           ├── app.py                 # Application code
│           ├── pyproject.toml         # Dependencies
│           └── tests/                 # Unit tests
│               ├── __init__.py
│               ├── test_app.py
│               └── conftest.py
└── kustomize/
    └── mesh/
        └── backstage-catalog-api/
            ├── kustomization.yaml     # References ../../../mesh/services/backstage-catalog-api
            ├── deployment.yaml
            └── service.yaml
```

### Component Flow

1. **Development**: Developer writes Python code in `eda/mesh/{category}/{app-name}/`
2. **Testing**: Developer runs `task eda:test:unit APP={app-name}` to execute unit tests
3. **Build**: Kustomize reads Python files and generates ConfigMap with hash suffix
4. **Deploy**: Kubernetes mounts ConfigMap to `/integration` in container
5. **Runtime**: UV entrypoint finds code at `/integration` and executes it

## Components and Interfaces

### Application Directory

**Location**: `eda/mesh/{category}/{app-name}/`

**Required Files**:
- `app.py`: FastAPI application with endpoints
- `pyproject.toml`: Dependency declarations
- `tests/`: Unit test directory

**Example app.py**:
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello World"}
```

**Example pyproject.toml**:
```toml
[project]
name = "backstage-catalog-api"
version = "0.1.0"
requires-python = ">=3.12"

dependencies = [
    "fastapi",
    "uvicorn",
    "kubernetes",
    "pyyaml",
]

[tool.uv]
dev-dependencies = [
    "pytest",
    "pytest-asyncio",
    "httpx",  # For FastAPI testing
]
```

### Kustomization Configuration

**Location**: `eda/kustomize/mesh/{app-name}/kustomization.yaml`

**ConfigMap Generator**:
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
  - name: backstage-catalog-api-config
    files:
      - app.py=../../../mesh/services/backstage-catalog-api/app.py
      - pyproject.toml=../../../mesh/services/backstage-catalog-api/pyproject.toml

resources:
  - deployment.yaml
  - service.yaml
```

**Key Points**:
- Uses relative path to reference source files
- Kustomize automatically adds hash suffix to ConfigMap name
- Hash changes when files change, triggering pod restart

### Deployment Configuration

**Volume Mount**:
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          image: ghcr.io/craigedmunds/uv:latest
          volumeMounts:
            - name: app-code
              mountPath: /integration
      volumes:
        - name: app-code
          configMap:
            name: backstage-catalog-api-config  # Kustomize adds hash suffix
```

### Unit Testing

**Test Structure**:
```python
# tests/test_app.py
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import sys
sys.path.insert(0, '..')

from app import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

@patch('app.v1')  # Mock Kubernetes client
def test_list_catalog_items(mock_k8s):
    mock_k8s.list_config_map_for_all_namespaces.return_value = Mock(items=[])
    response = client.get("/")
    assert response.status_code == 200
```

### Task Commands

**Taskfile.yaml** (in eda/ or root):
```yaml
tasks:
  eda:test:unit:
    desc: Run unit tests for an EDA mesh app
    dir: eda/mesh/{{.CATEGORY}}/{{.APP}}
    cmds:
      - uv pip install --python python3 -e ".[dev]"
      - uv run pytest tests/
    vars:
      CATEGORY: '{{.CATEGORY | default "services"}}'
    requires:
      vars: [APP]
```

**Usage**:
```bash
task eda:test:unit APP=backstage-catalog-api
task eda:test:unit APP=backstage-catalog-api CATEGORY=services
```

## Data Models

### Application Metadata

```python
from dataclasses import dataclass
from pathlib import Path

@dataclass
class LightweightApp:
    """Metadata for a lightweight Python application."""
    name: str
    category: str  # e.g., "services", "consumers", "producers"
    source_dir: Path  # e.g., eda/mesh/services/backstage-catalog-api
    kustomize_dir: Path  # e.g., eda/kustomize/mesh/backstage-catalog-api
    
    @property
    def app_file(self) -> Path:
        return self.source_dir / "app.py"
    
    @property
    def pyproject_file(self) -> Path:
        return self.source_dir / "pyproject.toml"
    
    @property
    def tests_dir(self) -> Path:
        return self.source_dir / "tests"
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Application Directory Structure

*For any* lightweight Python application, the application directory SHALL contain app.py, pyproject.toml, and a tests/ subdirectory.

**Validates: Requirements 1.1, 1.2, 3.1, 7.2**

### Property 2: Directory Location Pattern

*For any* lightweight Python application, the application directory SHALL be located at eda/mesh/{category}/{app-name}/ where category and app-name are non-empty strings.

**Validates: Requirements 1.3, 7.1**

### Property 3: No Embedded Python Code

*For any* kustomization.yaml file for a lightweight Python app, it SHALL NOT contain embedded Python code (patterns like "app.py: |" followed by Python code).

**Validates: Requirements 1.4**

### Property 4: ConfigMap Generation

*For any* valid kustomization.yaml with configMapGenerator, building it SHALL produce a ConfigMap containing both app.py and pyproject.toml as data keys.

**Validates: Requirements 2.1, 2.2**

### Property 5: Hash Suffix on File Change

*For any* kustomization.yaml with configMapGenerator, if a source file changes, building it SHALL produce a ConfigMap with a different name suffix than before the change.

**Validates: Requirements 2.3**

### Property 6: ConfigMap Generator Configuration

*For any* kustomization.yaml for a lightweight Python app, it SHALL contain a configMapGenerator section with files pointing to app.py and pyproject.toml using relative paths.

**Validates: Requirements 2.4**

### Property 7: Pytest Dev Dependency

*For any* pyproject.toml for a lightweight Python app, it SHALL include pytest in the dev-dependencies or tool.uv.dev-dependencies section.

**Validates: Requirements 3.2**

### Property 8: Tests Run Without Kubernetes

*For any* lightweight Python app with unit tests, running pytest SHALL complete successfully without requiring connectivity to a Kubernetes cluster.

**Validates: Requirements 3.6**

### Property 9: Task Command Invokes Pytest

*For any* lightweight Python app, running the task command for unit tests SHALL invoke pytest as the test runner.

**Validates: Requirements 4.2**

### Property 10: Task Installs Dependencies

*For any* lightweight Python app, running the task command for unit tests SHALL install dev dependencies before executing tests.

**Validates: Requirements 4.4**

### Property 11: ConfigMap Mount Configuration

*For any* deployment for a lightweight Python app, the pod spec SHALL include a volumeMount mounting the ConfigMap to /integration.

**Validates: Requirements 5.1**

### Property 12: FastAPI Dependencies

*For any* pyproject.toml for a FastAPI-based lightweight Python app, it SHALL declare both fastapi and uvicorn as dependencies.

**Validates: Requirements 6.4**

### Property 13: Kustomization Location Pattern

*For any* lightweight Python app, the kustomization.yaml SHALL be located at eda/kustomize/mesh/{app-name}/kustomization.yaml.

**Validates: Requirements 7.3**

### Property 14: Relative Path Reference

*For any* kustomization.yaml for a lightweight Python app, the configMapGenerator files SHALL use relative paths matching the pattern ../../../mesh/{category}/{app-name}/.

**Validates: Requirements 7.4**

## Error Handling

### Missing Files

- If `app.py` is missing: Kustomize build fails with clear error
- If `pyproject.toml` is missing: UV entrypoint installs default dependencies
- If tests/ directory is missing: Test task fails with clear message

### Invalid Python Code

- Syntax errors in `app.py`: Caught during unit testing
- Import errors: Caught during unit testing or container startup
- Runtime errors: Logged by uvicorn, visible in pod logs

### Kustomize Build Failures

- Invalid YAML: Kustomize reports parse error
- Missing source files: Kustomize reports file not found
- Invalid relative paths: Kustomize reports path resolution error

### Test Failures

- Test failures: pytest exits with non-zero code, task command fails
- Missing test dependencies: uv pip install fails, task command fails
- Import errors in tests: pytest reports collection errors

## Testing Strategy

### Unit Tests

Unit tests verify specific functionality of individual applications:

- **API Endpoint Tests**: Verify each endpoint returns expected responses
- **Error Handling Tests**: Verify error conditions are handled correctly
- **Mocking Tests**: Use mocks for external dependencies (Kubernetes API, databases)
- **Edge Cases**: Test empty responses, malformed inputs, missing data

**Example Test Cases**:
- Test root endpoint returns 200 OK
- Test endpoint with mocked Kubernetes API
- Test error handling when ConfigMap is missing
- Test YAML formatting of responses

### Property-Based Tests

Property-based tests verify universal properties across all lightweight Python apps:

- **Directory Structure**: Verify all apps follow the required structure
- **Kustomize Configuration**: Verify all kustomization.yaml files are valid
- **Dependency Declarations**: Verify all pyproject.toml files are valid
- **Test Isolation**: Verify tests don't require external services

**Test Configuration**:
- Minimum 100 iterations per property test
- Use pytest with hypothesis for property-based testing
- Tag format: `# Feature: lightweight-python-apps, Property {N}: {description}`

### Integration Tests

Integration tests verify the complete deployment flow:

- Build kustomization and verify ConfigMap is generated
- Deploy to test cluster and verify pod starts successfully
- Send HTTP requests and verify responses
- Verify ConfigMap updates trigger pod restarts

### CI/CD Integration

- Run unit tests on every commit
- Run property-based tests on every PR
- Run integration tests before merging to main
- Fail build if any tests fail

## Implementation Notes

### Migration Path

For existing apps with embedded code (like backstage-catalog-api):

1. Create directory: `eda/mesh/services/backstage-catalog-api/`
2. Extract `app.py` from ConfigMap YAML to file
3. Extract `pyproject.toml` from ConfigMap YAML to file
4. Create `tests/` directory with initial tests
5. Update `kustomization.yaml` to use configMapGenerator
6. Remove embedded code from ConfigMap YAML
7. Test locally with `task eda:test:unit`
8. Deploy and verify

### Best Practices

- Keep `app.py` focused and simple (single responsibility)
- Use type hints for better IDE support and testing
- Mock external dependencies in unit tests
- Use FastAPI's TestClient for endpoint testing
- Run tests locally before committing
- Use descriptive test names that explain what is being tested

### Limitations

- ConfigMaps have a 1MB size limit (sufficient for most lightweight apps)
- Large applications should use custom Docker images instead
- Binary dependencies require custom Docker images
- Complex build steps require custom Docker images
