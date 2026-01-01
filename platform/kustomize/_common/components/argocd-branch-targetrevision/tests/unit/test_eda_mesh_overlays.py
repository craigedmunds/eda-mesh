#!/usr/bin/env python3
"""
Tests for branch targeting in EDA mesh overlays.
"""
import pytest
from base_test import BaseBranchTargetingTest


@pytest.mark.eda_mesh
@pytest.mark.branch_targeting
class TestEdaMeshOverlayCraig(BaseBranchTargetingTest):
    """Test branch targeting for eda/kustomize/mesh/overlays/craig."""
    
    def get_overlay_path(self) -> str:
        return "eda/kustomize/mesh/overlays/craig"
    
    def get_expected_target_revision(self) -> str:
        return "feature/backstage-events"
    
    def test_application_sets_have_branch_targeting_labels(self, kustomize_builder, branch_targeting_validator):
        """Test that EDA ApplicationSets have the required branch targeting labels."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        
        # Find all ArgoCD ApplicationSets
        application_sets = branch_targeting_validator.find_application_sets(documents)
        
        # ApplicationSets that should have branch targeting labels
        expected_app_sets = [
            "eda-mesh-consumers",
            "eda-mesh-producers", 
            "eda-mesh-services",
            "eda-mesh-lob-applications"
        ]
        
        found_app_sets = []
        for app_set in application_sets:
            app_set_name = app_set.get("metadata", {}).get("name", "")
            if branch_targeting_validator.has_branch_targeting_labels(app_set):
                found_app_sets.append(app_set_name)
        
        # Check that expected ApplicationSets are found with branch targeting labels
        for expected_app_set in expected_app_sets:
            matching_app_sets = [name for name in found_app_sets if expected_app_set in name]
            assert len(matching_app_sets) > 0, \
                f"Expected ApplicationSet containing '{expected_app_set}' with branch targeting labels not found. Found ApplicationSets: {found_app_sets}"
    
    def test_multisource_application_sets_handled_correctly(self, kustomize_builder, branch_targeting_validator):
        """Test that multisource ApplicationSets are handled correctly."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        expected_revision = self.get_expected_target_revision()
        
        # Find ApplicationSets with multisource strategy
        application_sets = branch_targeting_validator.find_application_sets(documents)
        multisource_app_sets = [
            app_set for app_set in application_sets
            if (branch_targeting_validator.has_branch_targeting_labels(app_set) and 
                branch_targeting_validator.is_multisource_application(app_set))
        ]
        
        # Should have at least one multisource ApplicationSet (consumers)
        assert len(multisource_app_sets) > 0, "Expected at least one multisource ApplicationSet"
        
        for app_set in multisource_app_sets:
            app_set_name = app_set.get("metadata", {}).get("name", "unknown")
            
            # Check git generators
            spec = app_set.get("spec", {})
            generators = spec.get("generators", [])
            
            for i, generator in enumerate(generators):
                if "git" in generator:
                    git_revision = generator["git"].get("revision")
                    assert git_revision == expected_revision, \
                        f"Multisource ApplicationSet '{app_set_name}' generator {i} has git revision '{git_revision}', expected '{expected_revision}'"
    
    def test_helm_application_sets_use_feature_branch(self, kustomize_builder, branch_targeting_validator):
        """Test that helm ApplicationSets use feature_branch parameter correctly."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        expected_revision = self.get_expected_target_revision()
        
        # Find helm ApplicationSets
        application_sets = branch_targeting_validator.find_application_sets(documents)
        helm_app_sets = [
            app_set for app_set in application_sets
            if (branch_targeting_validator.has_branch_targeting_labels(app_set) and 
                branch_targeting_validator.is_helm_application(app_set))
        ]
        
        # Should have at least one helm ApplicationSet (lob-applications)
        assert len(helm_app_sets) > 0, "Expected at least one helm ApplicationSet"
        
        for app_set in helm_app_sets:
            app_set_name = app_set.get("metadata", {}).get("name", "unknown")
            feature_branch = branch_targeting_validator.get_helm_feature_branch_parameter(app_set)
            
            assert feature_branch == expected_revision, \
                f"Helm ApplicationSet '{app_set_name}' has feature_branch parameter '{feature_branch}', expected '{expected_revision}'"


@pytest.mark.eda_mesh
@pytest.mark.branch_targeting
class TestEdaMeshOverlayLab(BaseBranchTargetingTest):
    """Test branch targeting for eda/kustomize/mesh/overlays/lab."""
    
    def get_overlay_path(self) -> str:
        return "eda/kustomize/mesh/overlays/lab"
    
    def get_expected_target_revision(self) -> str:
        return "feature/backstage-events"
    
    def test_application_sets_have_branch_targeting_labels(self, kustomize_builder, branch_targeting_validator):
        """Test that EDA ApplicationSets have the required branch targeting labels."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        
        # Find all ArgoCD ApplicationSets
        application_sets = branch_targeting_validator.find_application_sets(documents)
        
        # ApplicationSets that should have branch targeting labels
        expected_app_sets = [
            "eda-mesh-consumers",
            "eda-mesh-producers", 
            "eda-mesh-services",
            "eda-mesh-lob-applications"
        ]
        
        found_app_sets = []
        for app_set in application_sets:
            app_set_name = app_set.get("metadata", {}).get("name", "")
            if branch_targeting_validator.has_branch_targeting_labels(app_set):
                found_app_sets.append(app_set_name)
        
        # Check that expected ApplicationSets are found with branch targeting labels
        for expected_app_set in expected_app_sets:
            matching_app_sets = [name for name in found_app_sets if expected_app_set in name]
            assert len(matching_app_sets) > 0, \
                f"Expected ApplicationSet containing '{expected_app_set}' with branch targeting labels not found. Found ApplicationSets: {found_app_sets}"