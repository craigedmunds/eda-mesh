#!/usr/bin/env python3
"""
Tests for Backstage ingress build transformations.

Tests the backstage/kustomize/overlays/local overlay to ensure:
- Backstage ingress contains only .lab.local.ctoaas.co domain (private access)
- External domain patterns are excluded from private ingress
- TLS configuration for single domain certificate
"""
import pytest
from base_test import PrivateIngressTest, EnvironmentSpecificTest


@pytest.mark.ingress
@pytest.mark.private
@pytest.mark.backstage
@pytest.mark.lab
class TestBackstageIngressLocalOverlay(PrivateIngressTest, EnvironmentSpecificTest):
    """Test Backstage ingress transformation in local overlay."""
    
    @staticmethod
    def get_overlay_path() -> str:
        """Return the local overlay path for Backstage."""
        return "../../backstage/kustomize/overlays/local"
    
    def get_expected_ingress_name(self) -> str:
        """Return the Backstage ingress name."""
        return "backstage-ingress"
    
    def get_expected_internal_domain_suffix(self) -> str:
        """Return the expected internal domain suffix for lab environment."""
        return "lab.local.ctoaas.co"
    
    def get_expected_external_domain_suffixes(self) -> list[str]:
        """Return external domain suffixes that should NOT be present."""
        return ["lab.ctoaas.co"]
    
    def get_environment_name(self) -> str:
        """Return the environment name."""
        return "lab"
    
    def get_expected_annotations(self) -> dict[str, str]:
        """Return expected lab environment annotations."""
        return {
            "cert-manager.io/cluster-issuer": "letsencrypt-prod",
            "traefik.ingress.kubernetes.io/router.entrypoints": "websecure",
            "traefik.ingress.kubernetes.io/router.tls": "true"
        }
    
    def test_ingress_class_is_traefik(self, kustomize_builder, ingress_validator):
        """Test that ingress class is set to traefik."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        
        assert ingress.get("spec", {}).get("ingressClassName") == "traefik", \
            "Backstage ingress should have ingressClassName set to 'traefik'"
    
    def test_has_expected_service_backend(self, kustomize_builder, ingress_validator):
        """Test that ingress points to the correct Backstage service."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        rules = ingress.get("spec", {}).get("rules", [])
        
        assert len(rules) >= 1, "Backstage ingress should have at least one rule"
        
        # Check that all rules point to backstage service
        for rule in rules:
            paths = rule.get("http", {}).get("paths", [])
            assert len(paths) >= 1, "Each rule should have at least one path"
            
            for path in paths:
                backend = path.get("backend", {})
                service = backend.get("service", {})
                
                assert service.get("name") == "backstage", \
                    f"Backstage ingress should point to 'backstage' service, got '{service.get('name')}'"
                assert service.get("port", {}).get("name") == "http-backend", \
                    f"Backstage ingress should use 'http-backend' port, got '{service.get('port', {}).get('name')}'"
    
    def test_tls_secret_name_generation(self, kustomize_builder, ingress_validator):
        """Test that TLS secret name is generated correctly."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        tls_configs = ingress.get("spec", {}).get("tls", [])
        
        if not tls_configs:
            pytest.skip("TLS not configured for this ingress")
        
        # Should have exactly one TLS configuration
        assert len(tls_configs) == 1, "Backstage ingress should have exactly one TLS configuration"
        
        tls_config = tls_configs[0]
        secret_name = tls_config.get("secretName")
        
        # Secret name should be based on ingress name
        expected_secret_name = "backstage-ingress"
        assert secret_name == expected_secret_name, \
            f"TLS secret name should be '{expected_secret_name}', got '{secret_name}'"
    
    def test_specific_domain_pattern(self, kustomize_builder, ingress_validator):
        """Test specific domain pattern for Backstage in lab environment."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        hosts = ingress_validator.get_hosts(ingress)
        
        # Should have exactly 1 host for private ingress
        assert len(hosts) == 1, f"Backstage private ingress should have exactly 1 host, got {len(hosts)}: {hosts}"
        
        # Check for specific expected domain
        expected_internal = "backstage.lab.local.ctoaas.co"
        
        assert expected_internal in hosts, \
            f"Backstage ingress should have internal domain '{expected_internal}', got hosts: {hosts}"
        
        # Ensure no external domains
        for host in hosts:
            assert not host.endswith(".lab.ctoaas.co"), \
                f"Private Backstage ingress should not have external domain, found: {host}"
    
    def test_namespace_is_backstage(self, kustomize_builder, ingress_validator):
        """Test that Backstage ingress is in the backstage namespace."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        namespace = ingress.get("metadata", {}).get("namespace")
        
        assert namespace == "backstage", \
            f"Backstage ingress should be in 'backstage' namespace, got '{namespace}'"
    
    def test_single_domain_tls_configuration(self, kustomize_builder, ingress_validator):
        """Test that TLS configuration covers only the single internal domain."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        hosts = ingress_validator.get_hosts(ingress)
        tls_hosts = ingress_validator.get_tls_hosts(ingress)
        
        if not tls_hosts:
            pytest.skip("TLS not configured for this ingress")
        
        # Should have exactly 1 TLS host for private ingress
        assert len(tls_hosts) == 1, f"Backstage private ingress should have exactly 1 TLS host, got {len(tls_hosts)}: {tls_hosts}"
        
        # TLS hosts should match ingress hosts exactly
        assert set(hosts) == set(tls_hosts), \
            f"TLS hosts should match ingress hosts. Hosts: {hosts}, TLS hosts: {tls_hosts}"
        
        # Ensure TLS host is internal domain only
        tls_host = tls_hosts[0]
        assert tls_host.endswith(".lab.local.ctoaas.co"), \
            f"TLS host should be internal domain, got: {tls_host}"


@pytest.mark.ingress
@pytest.mark.integration
class TestBackstageIngressIntegration:
    """Integration tests for Backstage ingress transformation."""
    
    def test_backstage_ingress_transformation_complete(self, kustomize_builder, ingress_validator):
        """Test that Backstage ingress transformation is complete and valid."""
        overlay_path = TestBackstageIngressLocalOverlay.get_overlay_path() # "backstage/kustomize/overlays/local"
        documents = kustomize_builder(overlay_path)
        
        # Find Backstage ingress
        backstage_ingress = ingress_validator.find_ingress_by_name(documents, "backstage-ingress")
        assert backstage_ingress is not None, "Backstage ingress not found in local overlay"
        
        # Validate complete transformation
        hosts = ingress_validator.get_hosts(backstage_ingress)
        tls_hosts = ingress_validator.get_tls_hosts(backstage_ingress)
        annotations = ingress_validator.get_annotations(backstage_ingress)
        labels = ingress_validator.get_labels(backstage_ingress)
        
        # Should have only internal domain (private ingress)
        assert len(hosts) == 1, f"Expected 1 host for private ingress, got {len(hosts)}"
        assert hosts[0].endswith(".lab.local.ctoaas.co"), "Should have internal domain only"
        assert not any(h.endswith(".lab.ctoaas.co") for h in hosts), "Should not have external domain"
        
        # Should have private management label
        assert labels.get("ingress.ctoaas.co/managed") == "true", "Should have private management label"
        assert "ingress.ctoaas.co/managed-public" not in labels, "Should not have public management label"
        
        # TLS should cover the single domain
        if tls_hosts:
            assert len(tls_hosts) == 1, f"Expected 1 TLS host, got {len(tls_hosts)}"
            assert set(hosts) == set(tls_hosts), "TLS hosts should match ingress hosts"
        
        # Should have cert-manager annotation
        assert "cert-manager.io/cluster-issuer" in annotations, "Missing cert-manager annotation"
        assert annotations["cert-manager.io/cluster-issuer"] == "letsencrypt-prod", \
            "Incorrect cert-manager issuer"
        
        # Should have ingress class
        assert backstage_ingress.get("spec", {}).get("ingressClassName") == "traefik", \
            "Incorrect ingress class"
    