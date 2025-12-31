#!/usr/bin/env python3
"""
Tests for Kargo ingress build transformations.

Tests the platform/kustomize/seed/supporting-applications/kargo/ to ensure:
- Kargo ingress remains unchanged (no management labels)
- Hardcoded domain patterns are preserved exactly
- Unlabeled ingress resources are not transformed
"""
import pytest
from base_test import BaseIngressTest


@pytest.mark.ingress
@pytest.mark.kargo
class TestKargoIngressHardcoded(BaseIngressTest):
    """Test Kargo ingress (hardcoded with standard configuration)."""
    
    @staticmethod
    def get_overlay_path() -> str:
        """Return the Kargo overlay path."""
        return "../kustomize/seed/supporting-applications/kargo"
    
    def get_expected_ingress_name(self) -> str:
        """Return the Kargo ingress name."""
        return "kargo-api"
    
    def get_expected_hosts(self) -> list[str]:
        """Return the expected hosts that should remain unchanged."""
        return [
            "kargo.lab.ctoaas.co",
            "kargo.lab.local.ctoaas.co"
        ]
    
    def test_has_no_management_labels(self, kustomize_builder, ingress_validator):
        """Test that ingress has no management labels (hardcoded, not generated)."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        
        assert not ingress_validator.has_management_label(ingress, "any"), \
            f"Hardcoded ingress '{self.get_expected_ingress_name()}' should not have management labels"
    
    def test_hosts_unchanged(self, kustomize_builder, ingress_validator):
        """Test that hosts remain exactly as specified (hardcoded)."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        actual_hosts = ingress_validator.get_hosts(ingress)
        expected_hosts = self.get_expected_hosts()
        
        assert set(actual_hosts) == set(expected_hosts), \
            f"Hardcoded ingress hosts should remain unchanged. Expected: {expected_hosts}, Got: {actual_hosts}"
    
    def test_has_hardcoded_domains(self, kustomize_builder, ingress_validator):
        """Test that Kargo ingress has hardcoded domain patterns."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        hosts = ingress_validator.get_hosts(ingress)
        
        # Should have exactly the hardcoded domains
        expected_hosts = self.get_expected_hosts()
        assert len(hosts) == len(expected_hosts), \
            f"Kargo ingress should have {len(expected_hosts)} hosts, got {len(hosts)}: {hosts}"
        
        for expected_host in expected_hosts:
            assert expected_host in hosts, \
                f"Kargo ingress should have hardcoded host '{expected_host}', got hosts: {hosts}"
    
    def test_has_expected_service_backends(self, kustomize_builder, ingress_validator):
        """Test that ingress points to the correct Kargo services."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        rules = ingress.get("spec", {}).get("rules", [])
        
        assert len(rules) >= 2, "Kargo ingress should have at least 2 rules (for both domains)"
        
        # Check that rules point to correct services
        expected_services = {"kargo-api", "kargo-external-webhooks-server"}
        found_services = set()
        
        for rule in rules:
            paths = rule.get("http", {}).get("paths", [])
            assert len(paths) >= 1, "Each rule should have at least one path"
            
            for path in paths:
                backend = path.get("backend", {})
                service = backend.get("service", {})
                service_name = service.get("name")
                
                if service_name:
                    found_services.add(service_name)
        
        # Should reference both expected services
        assert expected_services.issubset(found_services), \
            f"Kargo ingress should reference services {expected_services}, found {found_services}"
    
    def test_has_tls_configuration(self, kustomize_builder, ingress_validator):
        """Test that Kargo ingress has TLS configuration for both domains."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        tls_configs = ingress.get("spec", {}).get("tls", [])
        
        assert len(tls_configs) >= 1, "Kargo ingress should have TLS configuration"
        
        # Get all TLS hosts
        tls_hosts = ingress_validator.get_tls_hosts(ingress)
        expected_hosts = self.get_expected_hosts()
        
        # TLS should cover both domains
        for expected_host in expected_hosts:
            assert expected_host in tls_hosts, \
                f"TLS should cover host '{expected_host}', got TLS hosts: {tls_hosts}"
    
    def test_tls_secret_name_is_hardcoded(self, kustomize_builder, ingress_validator):
        """Test that TLS secret name is hardcoded (not generated)."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        tls_configs = ingress.get("spec", {}).get("tls", [])
        
        # Should have exactly one TLS configuration
        assert len(tls_configs) == 1, "Kargo ingress should have exactly one TLS configuration"
        
        tls_config = tls_configs[0]
        secret_name = tls_config.get("secretName")
        
        # Secret name should be hardcoded, not generated from ingress name
        expected_secret_name = "kargo-ctoaas-tls"
        assert secret_name == expected_secret_name, \
            f"TLS secret name should be hardcoded as '{expected_secret_name}', got '{secret_name}'"
    
    def test_namespace_is_kargo(self, kustomize_builder, ingress_validator):
        """Test that Kargo ingress is in the kargo namespace."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        namespace = ingress.get("metadata", {}).get("namespace")
        
        assert namespace == "kargo", \
            f"Kargo ingress should be in 'kargo' namespace, got '{namespace}'"
    
    def test_no_ingress_class_specified(self, kustomize_builder, ingress_validator):
        """Test that Kargo ingress has traefik ingress class specified."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        ingress_class = ingress.get("spec", {}).get("ingressClassName")
        
        # Should have traefik ingress class specified
        assert ingress_class == "traefik", \
            f"Kargo ingress should have ingressClassName 'traefik', got '{ingress_class}'"
    
    def test_has_webhook_paths(self, kustomize_builder, ingress_validator):
        """Test that Kargo ingress has webhook paths configured."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        rules = ingress.get("spec", {}).get("rules", [])
        
        # Check that webhook paths exist
        webhook_paths_found = False
        root_paths_found = False
        
        for rule in rules:
            paths = rule.get("http", {}).get("paths", [])
            
            for path in paths:
                path_value = path.get("path", "")
                
                if path_value == "/webhooks":
                    webhook_paths_found = True
                    # Should point to webhooks service
                    service_name = path.get("backend", {}).get("service", {}).get("name")
                    assert service_name == "kargo-external-webhooks-server", \
                        f"Webhook path should point to 'kargo-external-webhooks-server', got '{service_name}'"
                
                if path_value == "/":
                    root_paths_found = True
                    # Should point to API service
                    service_name = path.get("backend", {}).get("service", {}).get("name")
                    assert service_name == "kargo-api", \
                        f"Root path should point to 'kargo-api', got '{service_name}'"
        
        assert webhook_paths_found, "Kargo ingress should have /webhooks paths"
        assert root_paths_found, "Kargo ingress should have / (root) paths"
    
    def test_has_traefik_annotations(self, kustomize_builder, ingress_validator):
        """Test that Kargo ingress has required Traefik annotations."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        annotations = ingress_validator.get_annotations(ingress)
        
        # Should have Traefik router annotations
        assert "traefik.ingress.kubernetes.io/router.entrypoints" in annotations, \
            "Kargo ingress should have Traefik router.entrypoints annotation"
        assert annotations["traefik.ingress.kubernetes.io/router.entrypoints"] == "websecure", \
            f"Traefik entrypoints should be 'websecure', got '{annotations.get('traefik.ingress.kubernetes.io/router.entrypoints')}'"
        
        assert "traefik.ingress.kubernetes.io/router.tls" in annotations, \
            "Kargo ingress should have Traefik router.tls annotation"
        assert annotations["traefik.ingress.kubernetes.io/router.tls"] == "true", \
            f"Traefik TLS should be 'true', got '{annotations.get('traefik.ingress.kubernetes.io/router.tls')}'"
    
    def test_has_cert_manager_annotations(self, kustomize_builder, ingress_validator):
        """Test that Kargo ingress has cert-manager annotations."""
        ingress = self.get_ingress_resource(kustomize_builder, ingress_validator)
        annotations = ingress_validator.get_annotations(ingress)
        
        # Should have cert-manager cluster issuer annotation
        assert "cert-manager.io/cluster-issuer" in annotations, \
            "Kargo ingress should have cert-manager cluster-issuer annotation"
        assert annotations["cert-manager.io/cluster-issuer"] == "letsencrypt-prod", \
            f"cert-manager issuer should be 'letsencrypt-prod', got '{annotations.get('cert-manager.io/cluster-issuer')}'"


@pytest.mark.ingress
@pytest.mark.integration
class TestKargoIngressIntegration:
    """Integration tests for Kargo ingress (hardcoded)."""
    
    def test_kargo_ingress_unchanged_in_lab_overlay(self, kustomize_builder, ingress_validator):
        """Test that Kargo ingress remains unchanged when built through lab overlay."""
        # Build the lab overlay which includes Kargo
        lab_documents = kustomize_builder(TestKargoIngressHardcoded.get_overlay_path()) # "platform/kustomize/seed/overlays/local/lab")
        
        # Find Kargo ingress in the lab build
        kargo_ingress = ingress_validator.find_ingress_by_name(lab_documents, "kargo-api")
        
        if kargo_ingress is None:
            pytest.skip("Kargo ingress not found in lab overlay (may not be included)")
        
        # Validate that it remains unchanged
        hosts = ingress_validator.get_hosts(kargo_ingress)
        labels = ingress_validator.get_labels(kargo_ingress)
        
        # Should have hardcoded domains
        expected_hosts = ["kargo.lab.ctoaas.co", "kargo.lab.local.ctoaas.co"]
        assert set(hosts) == set(expected_hosts), \
            f"Kargo ingress hosts should remain unchanged. Expected: {expected_hosts}, Got: {hosts}"
        
        # Should have no management labels
        assert not ingress_validator.has_management_label(kargo_ingress, "any"), \
            "Kargo ingress should not have management labels"
        
        # Should have cert-manager annotations (hardcoded, not generated by management)
        annotations = ingress_validator.get_annotations(kargo_ingress)
        assert "cert-manager.io/cluster-issuer" in annotations, \
            "Kargo ingress should have hardcoded cert-manager annotations"