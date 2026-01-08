from fastapi.testclient import TestClient
from unittest.mock import Mock, MagicMock, patch
import pytest
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import app, detect_scheme_host


@pytest.fixture
def client(mock_kubernetes_config, mock_k8s_client):
    """Create test client with mocked Kubernetes."""
    return TestClient(app)


@pytest.fixture
def mock_k8s_api():
    """Create a mock Kubernetes API client."""
    return MagicMock()


class TestRootEndpoint:
    """Tests for the root endpoint (GET /)."""
    
    def test_root_endpoint_returns_200(self, client, mock_k8s_client):
        """Test that root endpoint returns 200 OK."""
        # Mock empty ConfigMap list
        with patch('app.v1') as mock_v1:
            mock_v1.list_config_map_for_all_namespaces.return_value = Mock(items=[])
            
            response = client.get("/")
            assert response.status_code == 200
    
    def test_root_endpoint_returns_yaml(self, client, mock_k8s_client):
        """Test that root endpoint returns YAML content."""
        with patch('app.v1') as mock_v1:
            mock_v1.list_config_map_for_all_namespaces.return_value = Mock(items=[])
            
            response = client.get("/")
            assert "application/yaml" in response.headers["content-type"]
            assert "apiVersion: backstage.io/v1alpha1" in response.text
            assert "kind: Location" in response.text
    
    def test_root_endpoint_with_configmaps(self, client, mock_k8s_client):
        """Test root endpoint with mocked ConfigMaps."""
        # Create mock ConfigMaps
        mock_cm1 = Mock()
        mock_cm1.metadata.namespace = "default"
        mock_cm1.metadata.name = "catalog-1"
        
        mock_cm2 = Mock()
        mock_cm2.metadata.namespace = "production"
        mock_cm2.metadata.name = "catalog-2"
        
        with patch('app.v1') as mock_v1:
            mock_v1.list_config_map_for_all_namespaces.return_value = Mock(
                items=[mock_cm1, mock_cm2]
            )
            
            response = client.get("/")
            assert response.status_code == 200
            assert "default/catalog-1" in response.text
            assert "production/catalog-2" in response.text
    
    def test_root_endpoint_detects_forwarded_headers(self, client, mock_k8s_client):
        """Test that root endpoint respects X-Forwarded headers."""
        # Create a mock ConfigMap so we can see the URL in the response
        mock_cm = Mock()
        mock_cm.metadata.namespace = "default"
        mock_cm.metadata.name = "catalog-1"
        
        with patch('app.v1') as mock_v1:
            mock_v1.list_config_map_for_all_namespaces.return_value = Mock(
                items=[mock_cm]
            )
            
            response = client.get(
                "/",
                headers={
                    "x-forwarded-proto": "https",
                    "x-forwarded-host": "example.com"
                }
            )
            assert response.status_code == 200
            assert "https://example.com" in response.text


class TestConfigMapEndpoint:
    """Tests for the ConfigMap endpoint (GET /{namespace}/{configmap})."""
    
    def test_configmap_endpoint_returns_data(self, client, mock_k8s_client):
        """Test that ConfigMap endpoint returns ConfigMap data."""
        # Mock ConfigMap with data
        mock_cm = Mock()
        mock_cm.data = {
            "catalog.yaml": "apiVersion: backstage.io/v1alpha1\nkind: Component",
            "metadata.yaml": "name: test-component"
        }
        
        with patch('app.v1') as mock_v1:
            mock_v1.read_namespaced_config_map.return_value = mock_cm
            
            response = client.get("/default/test-configmap")
            assert response.status_code == 200
            assert "apiVersion: backstage.io/v1alpha1" in response.text
            assert "name: test-component" in response.text
    
    def test_configmap_endpoint_missing_configmap(self, client, mock_k8s_client):
        """Test error handling when ConfigMap doesn't exist."""
        from kubernetes import client as k8s_client
        
        with patch('app.v1') as mock_v1:
            # Mock API exception
            mock_v1.read_namespaced_config_map.side_effect = \
                k8s_client.exceptions.ApiException(status=404, reason="Not Found")
            
            response = client.get("/default/missing-configmap")
            assert response.status_code == 200
            assert "Error: Not Found" in response.text
    
    def test_configmap_endpoint_empty_data(self, client, mock_k8s_client):
        """Test handling of ConfigMap with no data."""
        # Mock ConfigMap with empty data
        mock_cm = Mock()
        mock_cm.data = None
        
        with patch('app.v1') as mock_v1:
            mock_v1.read_namespaced_config_map.return_value = mock_cm
            
            response = client.get("/default/empty-configmap")
            assert response.status_code == 200
            assert "No data entries found" in response.text
    
    def test_configmap_endpoint_empty_dict_data(self, client, mock_k8s_client):
        """Test handling of ConfigMap with empty dict data."""
        # Mock ConfigMap with empty dict
        mock_cm = Mock()
        mock_cm.data = {}
        
        with patch('app.v1') as mock_v1:
            mock_v1.read_namespaced_config_map.return_value = mock_cm
            
            response = client.get("/default/empty-dict-configmap")
            assert response.status_code == 200
            assert "No data entries found" in response.text


class TestHelperFunctions:
    """Tests for helper functions."""
    
    def test_detect_scheme_host_with_forwarded_headers(self):
        """Test scheme/host detection with forwarded headers."""
        mock_request = Mock()
        mock_request.headers.get = Mock(side_effect=lambda key, default=None: {
            "x-forwarded-proto": "https",
            "x-forwarded-host": "example.com"
        }.get(key, default))
        mock_request.url.scheme = "http"
        
        proto, host = detect_scheme_host(mock_request)
        assert proto == "https"
        assert host == "example.com"
    
    def test_detect_scheme_host_without_forwarded_headers(self):
        """Test scheme/host detection without forwarded headers."""
        mock_request = Mock()
        mock_request.headers.get = Mock(side_effect=lambda key, default=None: {
            "host": "localhost:8080"
        }.get(key, default))
        mock_request.url.scheme = "http"
        
        proto, host = detect_scheme_host(mock_request)
        assert proto == "http"
        assert host == "localhost:8080"
