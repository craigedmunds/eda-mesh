#!/usr/bin/env python3
"""
Tests for branch targeting in platform seed overlays.
"""
import pytest
from base_test import BaseBranchTargetingTest


@pytest.mark.platform_seed
@pytest.mark.branch_targeting
class TestPlatformSeedLocalPi(BaseBranchTargetingTest):
    """Test branch targeting for platform/kustomize/seed/overlays/local/pi."""
    
    def get_overlay_path(self) -> str:
        return "platform/kustomize/seed/overlays/local/pi"
    
    def get_expected_target_revision(self) -> str:
        return "main"


@pytest.mark.platform_seed
@pytest.mark.branch_targeting
class TestPlatformSeedLocalCraig(BaseBranchTargetingTest):
    """Test branch targeting for platform/kustomize/seed/overlays/local/craig."""
    
    def get_overlay_path(self) -> str:
        return "platform/kustomize/seed/overlays/local/craig"
    
    def get_expected_target_revision(self) -> str:
        return "main"


@pytest.mark.platform_seed
@pytest.mark.branch_targeting
class TestPlatformSeedLocalLab(BaseBranchTargetingTest):
    """Test branch targeting for platform/kustomize/seed/overlays/local/lab."""
    
    def get_overlay_path(self) -> str:
        return "platform/kustomize/seed/overlays/local/lab"
    
    def get_expected_target_revision(self) -> str:
        return "main"
    
    def test_applications_have_branch_targeting_labels(self, kustomize_builder, branch_targeting_validator):
        """Test that ArgoCD applications have the required branch targeting labels."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        
        # Find all ArgoCD applications
        applications = branch_targeting_validator.find_applications(documents)
        
        # Applications that should have branch targeting labels
        expected_apps = [
            "backstage",
            "backstage-kargo", 
            "image-factory",
            "eda-mesh",
            "central-secret-store"
        ]
        
        found_apps = []
        for app in applications:
            app_name = app.get("metadata", {}).get("name", "")
            if branch_targeting_validator.has_branch_targeting_labels(app):
                found_apps.append(app_name)
        
        # Check that expected apps are found with branch targeting labels
        for expected_app in expected_apps:
            matching_apps = [name for name in found_apps if expected_app in name]
            assert len(matching_apps) > 0, \
                f"Expected application containing '{expected_app}' with branch targeting labels not found. Found apps: {found_apps}"