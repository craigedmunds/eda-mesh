#!/usr/bin/env python3
"""
Base test classes for branch targeting component validation.
"""
import pytest
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional


class BaseBranchTargetingTest(ABC):
    """Base class for branch targeting tests."""
    
    @abstractmethod
    def get_overlay_path(self) -> str:
        """Return the overlay path to test (relative to project root)."""
        pass
    
    @abstractmethod
    def get_expected_target_revision(self) -> str:
        """Return the expected target revision for this overlay."""
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
    
    def test_branch_targeting_config_map_exists(self, kustomize_builder, branch_targeting_validator):
        """Test that branch targeting ConfigMap exists with correct target revision."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        
        config_map = branch_targeting_validator.get_branch_targeting_config_map(documents)
        assert config_map is not None, f"Branch targeting ConfigMap not found in {overlay_path}"
        
        target_revision = branch_targeting_validator.get_target_revision_from_config_map(config_map)
        expected_revision = self.get_expected_target_revision()
        
        assert target_revision == expected_revision, \
            f"ConfigMap target revision '{target_revision}' does not match expected '{expected_revision}'"
    
    @pytest.mark.git_applications
    def test_git_applications_use_target_revision(self, kustomize_builder, branch_targeting_validator):
        """Test that git applications with branch targeting labels use the correct target revision."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        expected_revision = self.get_expected_target_revision()
        
        # Test Application resources
        applications = branch_targeting_validator.find_applications(documents)
        git_applications = [
            app for app in applications
            if (branch_targeting_validator.has_branch_targeting_labels(app) and 
                not branch_targeting_validator.is_helm_application(app))
        ]
        
        for app in git_applications:
            app_name = app.get("metadata", {}).get("name", "unknown")
            target_revision = branch_targeting_validator.get_application_target_revision(app)
            
            assert target_revision == expected_revision, \
                f"Application '{app_name}' has target revision '{target_revision}', expected '{expected_revision}'"
    
    @pytest.mark.application_sets
    @pytest.mark.git_applications
    def test_git_application_sets_use_target_revision(self, kustomize_builder, branch_targeting_validator):
        """Test that git ApplicationSets with branch targeting labels use the correct target revision."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        expected_revision = self.get_expected_target_revision()
        
        # Test ApplicationSet resources
        application_sets = branch_targeting_validator.find_application_sets(documents)
        git_application_sets = [
            app_set for app_set in application_sets
            if (branch_targeting_validator.has_branch_targeting_labels(app_set) and 
                not branch_targeting_validator.is_helm_application(app_set))
        ]
        
        for app_set in git_application_sets:
            app_set_name = app_set.get("metadata", {}).get("name", "unknown")
            
            # Check template target revision
            template_target_revision = branch_targeting_validator.get_application_set_target_revision(app_set)
            assert template_target_revision == expected_revision, \
                f"ApplicationSet '{app_set_name}' template has target revision '{template_target_revision}', expected '{expected_revision}'"
            
            # Check git generator revision
            git_revision = branch_targeting_validator.get_application_set_git_revision(app_set)
            assert git_revision == expected_revision, \
                f"ApplicationSet '{app_set_name}' git generator has revision '{git_revision}', expected '{expected_revision}'"
    
    @pytest.mark.helm_applications
    def test_helm_applications_use_feature_branch_parameter(self, kustomize_builder, branch_targeting_validator):
        """Test that helm applications with branch targeting labels use the correct feature_branch parameter."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        expected_revision = self.get_expected_target_revision()
        
        # Test Application resources
        applications = branch_targeting_validator.find_applications(documents)
        helm_applications = [
            app for app in applications
            if (branch_targeting_validator.has_branch_targeting_labels(app) and 
                branch_targeting_validator.is_helm_application(app))
        ]
        
        for app in helm_applications:
            app_name = app.get("metadata", {}).get("name", "unknown")
            feature_branch = branch_targeting_validator.get_helm_feature_branch_parameter(app)
            
            assert feature_branch == expected_revision, \
                f"Helm Application '{app_name}' has feature_branch parameter '{feature_branch}', expected '{expected_revision}'"
    
    @pytest.mark.application_sets
    @pytest.mark.helm_applications
    def test_helm_application_sets_use_feature_branch_parameter(self, kustomize_builder, branch_targeting_validator):
        """Test that helm ApplicationSets with branch targeting labels use the correct feature_branch parameter."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        expected_revision = self.get_expected_target_revision()
        
        # Test ApplicationSet resources
        application_sets = branch_targeting_validator.find_application_sets(documents)
        helm_application_sets = [
            app_set for app_set in application_sets
            if (branch_targeting_validator.has_branch_targeting_labels(app_set) and 
                branch_targeting_validator.is_helm_application(app_set))
        ]
        
        for app_set in helm_application_sets:
            app_set_name = app_set.get("metadata", {}).get("name", "unknown")
            feature_branch = branch_targeting_validator.get_helm_feature_branch_parameter(app_set)
            
            assert feature_branch == expected_revision, \
                f"Helm ApplicationSet '{app_set_name}' has feature_branch parameter '{feature_branch}', expected '{expected_revision}'"
    
    @pytest.mark.multisource
    def test_multisource_applications_handle_all_sources(self, kustomize_builder, branch_targeting_validator):
        """Test that multisource applications update all sources correctly."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        expected_revision = self.get_expected_target_revision()
        
        # Test Application resources with multisource strategy
        applications = branch_targeting_validator.find_applications(documents)
        multisource_applications = [
            app for app in applications
            if (branch_targeting_validator.has_branch_targeting_labels(app) and 
                branch_targeting_validator.is_multisource_application(app) and
                not branch_targeting_validator.is_helm_application(app))
        ]
        
        for app in multisource_applications:
            app_name = app.get("metadata", {}).get("name", "unknown")
            spec = app.get("spec", {})
            sources = spec.get("sources", [])
            
            assert len(sources) > 0, f"Multisource Application '{app_name}' has no sources"
            
            # All sources should have the target revision
            for i, source in enumerate(sources):
                source_target_revision = source.get("targetRevision")
                assert source_target_revision == expected_revision, \
                    f"Multisource Application '{app_name}' source {i} has target revision '{source_target_revision}', expected '{expected_revision}'"
    
    @pytest.mark.application_sets
    @pytest.mark.multisource
    def test_multisource_application_sets_handle_all_sources(self, kustomize_builder, branch_targeting_validator):
        """Test that multisource ApplicationSets update all sources correctly."""
        overlay_path = self.get_overlay_path()
        documents = kustomize_builder(overlay_path)
        expected_revision = self.get_expected_target_revision()
        
        # Test ApplicationSet resources with multisource strategy
        application_sets = branch_targeting_validator.find_application_sets(documents)
        multisource_application_sets = [
            app_set for app_set in application_sets
            if (branch_targeting_validator.has_branch_targeting_labels(app_set) and 
                branch_targeting_validator.is_multisource_application(app_set) and
                not branch_targeting_validator.is_helm_application(app_set))
        ]
        
        for app_set in multisource_application_sets:
            app_set_name = app_set.get("metadata", {}).get("name", "unknown")
            spec = app_set.get("spec", {})
            template_spec = spec.get("template", {}).get("spec", {})
            sources = template_spec.get("sources", [])
            
            assert len(sources) > 0, f"Multisource ApplicationSet '{app_set_name}' has no sources"
            
            # All sources should have the target revision
            for i, source in enumerate(sources):
                source_target_revision = source.get("targetRevision")
                assert source_target_revision == expected_revision, \
                    f"Multisource ApplicationSet '{app_set_name}' source {i} has target revision '{source_target_revision}', expected '{expected_revision}'"