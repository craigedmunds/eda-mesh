#!/usr/bin/env python3
"""
Base test classes for kustomize ingress validation.
"""
import pytest
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Set
from pathlib import Path


class BaseKustomizeTest(ABC):
    """Base class for kustomize build tests."""
    
    @abstractmethod
    def get_overlay_path(self) -> str:
        """Return the overlay path to test (relative to project root)."""
        pass
    
    def test_kustomize_build_succeeds(self, kustomize_builder):
        """Test that kustomize build succeeds without errors."""
        overlay_path = self.get_overlay_path()
        
        # This will raise an exception if build fails
        documents = kustomize_builder(overlay_path)
        
        # Basic validation - should have at least one document
        assert len(documents) > 0, f"No documents generated for {overlay_path}"
        
        # All documents should have apiVersion and kind
        for i, doc in enumerate(documents):
            assert "apiVersion" in doc, f"Document {i} missing apiVersion in {overlay_path}"
            assert "kind" in doc, f"Document {i} missing kind in {overlay_path}"


class BaseIngressTest(BaseKustomizeTest):
    """Base class for ingress-specific tests."""
    
    @abstractmethod
    def get_expected_ingress_name(self) -> str:
        """Return the name of the ingress resource to test."""
        pass
    
    def get_built_documents(self, kustomize_builder) -> List[Dict[str, Any]]:
        """Get the built documents for this overlay."""
        return kustomize_builder(self.get_overlay_path())
    
    def get_ingress_resource(self, kustomize_builder, ingress_validator) -> Dict[str, Any]:
        """Get the specific ingress resource being tested."""
        documents = self.get_built_documents(kustomize_builder)
        ingress_name = self.get_expected_ingress_name()
        
        ingress = ingress_validator.find_ingress_by_name(documents, ingress_name)
        assert ingress is not None, f"Ingress '{ingress_name}' not found in {self.get_overlay_path()}"
        
        return ingress
    
    def test_ingress_exists(self, kustomize_builder, ingress_validator):
        """Test that the expected ingress resource exists."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        assert ingress["metadata"]["name"] == self.get_expected_ingress_name()


class PrivateIngressTest(BaseIngressTest):
    """Base class for testing private ingress resources (internal access only)."""
    
    @abstractmethod
    def get_expected_internal_domain_suffix(self) -> str:
        """Return the expected internal domain suffix (e.g., 'lab.local.ctoaas.co')."""
        pass
    
    def get_expected_external_domain_suffixes(self) -> List[str]:
        """Return external domain suffixes that should NOT be present."""
        return ["lab.ctoaas.co"]  # Default external domain
    
    def test_has_private_management_label(self, kustomize_builder, ingress_validator):
        """Test that ingress has the private management label."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        
        assert ingress_validator.has_management_label(ingress, "private"), \
            f"Ingress '{self.get_expected_ingress_name()}' should have private management label"
    
    def test_only_internal_domains(self, kustomize_builder, ingress_validator):
        """Test that ingress only has internal domain hosts."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        hosts = ingress_validator.get_hosts(ingress)
        
        internal_suffix = self.get_expected_internal_domain_suffix()
        external_suffixes = self.get_expected_external_domain_suffixes()
        
        assert len(hosts) > 0, f"Ingress '{self.get_expected_ingress_name()}' has no hosts"
        
        for host in hosts:
            # Should end with internal domain
            assert host.endswith(f".{internal_suffix}"), \
                f"Host '{host}' should end with internal domain '.{internal_suffix}'"
            
            # Should NOT end with external domains
            for external_suffix in external_suffixes:
                assert not host.endswith(f".{external_suffix}"), \
                    f"Private ingress host '{host}' should not have external domain '.{external_suffix}'"
    
    def test_tls_covers_internal_domains_only(self, kustomize_builder, ingress_validator):
        """Test that TLS configuration covers only internal domains."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        tls_hosts = ingress_validator.get_tls_hosts(ingress)
        
        if not tls_hosts:
            # TLS is optional for private ingress
            return
        
        internal_suffix = self.get_expected_internal_domain_suffix()
        external_suffixes = self.get_expected_external_domain_suffixes()
        
        for host in tls_hosts:
            # Should end with internal domain
            assert host.endswith(f".{internal_suffix}"), \
                f"TLS host '{host}' should end with internal domain '.{internal_suffix}'"
            
            # Should NOT end with external domains
            for external_suffix in external_suffixes:
                assert not host.endswith(f".{external_suffix}"), \
                    f"Private ingress TLS host '{host}' should not have external domain '.{external_suffix}'"


class PublicIngressTest(BaseIngressTest):
    """Base class for testing public ingress resources (internal + external access)."""
    
    @abstractmethod
    def get_expected_internal_domain_suffix(self) -> str:
        """Return the expected internal domain suffix (e.g., 'lab.local.ctoaas.co')."""
        pass
    
    @abstractmethod
    def get_expected_external_domain_suffixes(self) -> List[str]:
        """Return the expected external domain suffixes (e.g., ['lab.ctoaas.co'])."""
        pass
    
    def test_has_public_management_label(self, kustomize_builder, ingress_validator):
        """Test that ingress has the public management label."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        
        assert ingress_validator.has_management_label(ingress, "public"), \
            f"Ingress '{self.get_expected_ingress_name()}' should have public management label"
    
    def test_has_both_internal_and_external_domains(self, kustomize_builder, ingress_validator):
        """Test that ingress has both internal and external domain hosts."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        hosts = ingress_validator.get_hosts(ingress)
        
        internal_suffix = self.get_expected_internal_domain_suffix()
        external_suffixes = self.get_expected_external_domain_suffixes()
        
        assert len(hosts) > 0, f"Ingress '{self.get_expected_ingress_name()}' has no hosts"
        
        # Check for internal domain
        internal_hosts = [h for h in hosts if h.endswith(f".{internal_suffix}")]
        assert len(internal_hosts) > 0, \
            f"Public ingress should have at least one internal domain host ending with '.{internal_suffix}'"
        
        # Check for external domains
        external_hosts = []
        for external_suffix in external_suffixes:
            external_hosts.extend([h for h in hosts if h.endswith(f".{external_suffix}")])
        
        assert len(external_hosts) > 0, \
            f"Public ingress should have at least one external domain host ending with {external_suffixes}"
    
    def test_tls_covers_all_domains(self, kustomize_builder, ingress_validator):
        """Test that TLS configuration covers both internal and external domains."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        hosts = ingress_validator.get_hosts(ingress)
        tls_hosts = ingress_validator.get_tls_hosts(ingress)
        
        if not tls_hosts:
            # TLS is optional
            return
        
        # All hosts should be covered by TLS
        for host in hosts:
            assert host in tls_hosts, \
                f"Host '{host}' should be covered by TLS configuration"


class UnmanagedIngressTest(BaseIngressTest):
    """Base class for testing unmanaged ingress resources (no transformation)."""
    
    @abstractmethod
    def get_expected_hosts(self) -> List[str]:
        """Return the expected hosts that should remain unchanged."""
        pass
    
    def test_has_no_management_labels(self, kustomize_builder, ingress_validator):
        """Test that ingress has no management labels."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        
        assert not ingress_validator.has_management_label(ingress, "any"), \
            f"Unmanaged ingress '{self.get_expected_ingress_name()}' should not have management labels"
    
    def test_hosts_unchanged(self, kustomize_builder, ingress_validator):
        """Test that hosts remain exactly as specified (no transformation)."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        actual_hosts = ingress_validator.get_hosts(ingress)
        expected_hosts = self.get_expected_hosts()
        
        assert set(actual_hosts) == set(expected_hosts), \
            f"Unmanaged ingress hosts should remain unchanged. Expected: {expected_hosts}, Got: {actual_hosts}"


class EnvironmentSpecificTest(ABC):
    """Mixin for environment-specific test behavior."""
    
    @abstractmethod
    def get_environment_name(self) -> str:
        """Return the environment name (e.g., 'local', 'lab')."""
        pass
    
    def get_expected_annotations(self) -> Dict[str, str]:
        """Return expected environment-specific annotations."""
        env = self.get_environment_name()
        
        if env == "local":
            return {
                "traefik.ingress.kubernetes.io/router.tls": "true"
            }
        elif env == "lab":
            return {
                "cert-manager.io/cluster-issuer": "letsencrypt-prod"
            }
        else:
            return {}
    
    def test_environment_specific_annotations(self, kustomize_builder, ingress_validator):
        """Test that environment-specific annotations are applied."""
        if not hasattr(self, 'get_ingress_resource'):
            pytest.skip("Not an ingress test")
            
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        annotations = ingress_validator.get_annotations(ingress)
        expected_annotations = self.get_expected_annotations()
        
        for key, expected_value in expected_annotations.items():
            assert key in annotations, \
                f"Expected annotation '{key}' not found in ingress '{self.get_expected_ingress_name()}'"
            assert annotations[key] == expected_value, \
                f"Annotation '{key}' has value '{annotations[key]}', expected '{expected_value}'"