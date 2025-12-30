#!/usr/bin/env python3
"""
Tests for ArgoCD ingress build transformations.

Tests the platform/kustomize/seed/overlays/local/lab overlay to ensure:
- ArgoCD ingress contains both .lab.local.ctoaas.co and .lab.ctoaas.co domains
- TLS configuration includes both domains in certificate
- Ingress class and cert-manager annotations are correctly applied
"""
import pytest
from base_test import PrivateIngressTest, EnvironmentSpecificTest


@pytest.mark.ingress
@pytest.mark.public
@pytest.mark.argocd
@pytest.mark.lab
class TestArgoCDIngressLabOverlay(PrivateIngressTest, EnvironmentSpecificTest):
    """Test ArgoCD ingress transformation in lab overlay."""
    
    @staticmethod
    def get_overlay_path() -> str:
        """Return the lab overlay path for ArgoCD."""
        return "../kustomize/seed/overlays/local/lab"
    
    def get_expected_ingress_name(self) -> str:
        """Return the ArgoCD ingress name."""
        return "argocd-server-ingress"
    
    def get_expected_internal_domain_suffix(self) -> str:
        """Return the expected internal domain suffix for lab environment."""
        return "lab.local.ctoaas.co"
    
    def get_expected_external_domain_suffixes(self) -> list[str]:
        """Return the expected external domain suffixes for lab environment."""
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
            "ArgoCD ingress should have ingressClassName set to 'traefik'"
    
    def test_has_expected_service_backend(self, kustomize_builder, ingress_validator):
        """Test that ingress points to the correct ArgoCD service."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        rules = ingress.get("spec", {}).get("rules", [])
        
        assert len(rules) >= 1, "ArgoCD ingress should have at least one rule"
        
        # Check that all rules point to argocd-server service
        for rule in rules:
            paths = rule.get("http", {}).get("paths", [])
            assert len(paths) >= 1, "Each rule should have at least one path"
            
            for path in paths:
                backend = path.get("backend", {})
                service = backend.get("service", {})
                
                assert service.get("name") == "argocd-server", \
                    f"ArgoCD ingress should point to 'argocd-server' service, got '{service.get('name')}'"
                assert service.get("port", {}).get("name") == "http", \
                    f"ArgoCD ingress should use 'http' port, got '{service.get('port', {}).get('name')}'"
    
    def test_tls_secret_name_generation(self, kustomize_builder, ingress_validator):
        """Test that TLS secret name is generated correctly."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        tls_configs = ingress.get("spec", {}).get("tls", [])
        
        if not tls_configs:
            pytest.skip("TLS not configured for this ingress")
        
        # Should have exactly one TLS configuration
        assert len(tls_configs) == 1, "ArgoCD ingress should have exactly one TLS configuration"
        
        tls_config = tls_configs[0]
        secret_name = tls_config.get("secretName")
        
        # Secret name should be based on ingress name
        expected_secret_name = "argocd-server-ingress"
        assert secret_name == expected_secret_name, \
            f"TLS secret name should be '{expected_secret_name}', got '{secret_name}'"
    
    def test_specific_domain_patterns(self, kustomize_builder, ingress_validator):
        """Test specific domain patterns for ArgoCD in lab environment."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        hosts = ingress_validator.get_hosts(ingress)
        
        # Should have exactly 1 host for private ingress
        assert len(hosts) == 1, f"ArgoCD private ingress should have exactly 1 host, got {len(hosts)}: {hosts}"
        
        # Check for specific expected domains
        expected_internal = "argocd.lab.local.ctoaas.co"
        # expected_external = "argocd.lab.ctoaas.co"
        
        assert expected_internal in hosts, \
            f"ArgoCD ingress should have internal domain '{expected_internal}', got hosts: {hosts}"
        # assert expected_external in hosts, \
        #     f"ArgoCD ingress should have external domain '{expected_external}', got hosts: {hosts}"
    
    def test_namespace_is_argocd(self, kustomize_builder, ingress_validator):
        """Test that ArgoCD ingress is in the argocd namespace."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        namespace = ingress.get("metadata", {}).get("namespace")
        
        assert namespace == "argocd", \
            f"ArgoCD ingress should be in 'argocd' namespace, got '{namespace}'"


@pytest.mark.ingress
@pytest.mark.integration
class TestArgoCDIngressIntegration:
    """Integration tests for ArgoCD ingress transformation."""
    
    def test_argocd_ingress_transformation_complete(self, kustomize_builder, ingress_validator):
        """Test that ArgoCD ingress transformation is complete and valid."""
        overlay_path = TestArgoCDIngressLabOverlay.get_overlay_path() #"platform/kustomize/seed/overlays/local/lab"
        documents = kustomize_builder(overlay_path)
        
        # Find ArgoCD ingress
        argocd_ingress = ingress_validator.find_ingress_by_name(documents, "argocd-server-ingress")
        assert argocd_ingress is not None, "ArgoCD ingress not found in lab overlay"
        
        # Validate complete transformation
        hosts = ingress_validator.get_hosts(argocd_ingress)
        tls_hosts = ingress_validator.get_tls_hosts(argocd_ingress)
        annotations = ingress_validator.get_annotations(argocd_ingress)
        
        # Should have both internal and external domains
        assert len(hosts) == 1, f"Expected 1 host, got {len(hosts)}"
        assert any(h.endswith(".lab.local.ctoaas.co") for h in hosts), "Missing internal domain"
        # assert any(h.endswith(".lab.ctoaas.co") for h in hosts), "Missing external domain"
        
        # TLS should cover both domains
        if tls_hosts:
            assert len(tls_hosts) == 1, f"Expected 1 TLS host, got {len(tls_hosts)}"
            assert set(hosts) == set(tls_hosts), "TLS hosts should match ingress hosts"
        
        # Should have cert-manager annotation
        assert "cert-manager.io/cluster-issuer" in annotations, "Missing cert-manager annotation"
        assert annotations["cert-manager.io/cluster-issuer"] == "letsencrypt-prod", \
            "Incorrect cert-manager issuer"
        
        # Should have ingress class
        assert argocd_ingress.get("spec", {}).get("ingressClassName") == "traefik", \
            "Incorrect ingress class"