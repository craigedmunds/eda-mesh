import pytest
from unittest.mock import Mock, patch
import sys
from pathlib import Path

# Add parent directory to path so we can import app
sys.path.insert(0, str(Path(__file__).parent.parent))

# Patch Kubernetes config loading BEFORE importing app
with patch('kubernetes.config.load_incluster_config'):
    with patch('kubernetes.client.CoreV1Api'):
        import app


@pytest.fixture
def mock_kubernetes_config():
    """Mock Kubernetes config loading to avoid cluster dependency."""
    with patch('app.config.load_incluster_config'):
        yield


@pytest.fixture
def mock_k8s_client():
    """Mock Kubernetes client for testing."""
    with patch('app.client.CoreV1Api') as mock_api:
        yield mock_api.return_value
