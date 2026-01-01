#!/usr/bin/env python3
"""
Pytest configuration and fixtures for branch targeting component testing.
"""
import pytest
import subprocess
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional


@pytest.fixture(scope="session")
def project_root():
    """Get the project root directory."""
    # From conftest.py location, go up 8 levels to reach project root
    # conftest.py -> unit -> tests -> argocd-branch-targetrevision -> components -> _common -> kustomize -> platform -> project_root
    conftest_path = Path(__file__).resolve()
    return conftest_path.parent.parent.parent.parent.parent.parent.parent.parent


@pytest.fixture(scope="session")
def kustomize_builder(project_root):
    """Factory for building kustomize overlays with caching."""
    
    # Cache to store build results per overlay path
    _cache = {}
    
    def _build(overlay_path: str, enable_helm: bool = True) -> List[Dict[str, Any]]:
        """
        Build a kustomize overlay and return parsed YAML documents.
        Results are cached per overlay path to avoid redundant builds.
        
        Args:
            overlay_path: Path to kustomize overlay relative to project root
            enable_helm: Whether to enable helm processing
            
        Returns:
            List of parsed YAML documents
            
        Raises:
            subprocess.CalledProcessError: If kustomize build fails
        """
        # Create cache key
        cache_key = (overlay_path, enable_helm)
        
        # Return cached result if available
        if cache_key in _cache:
            return _cache[cache_key]
        
        full_path = project_root / overlay_path
        if not full_path.exists():
            raise FileNotFoundError(f"Overlay path does not exist: {full_path}")
            
        cmd = ["kustomize", "build", str(full_path)]
        if enable_helm:
            cmd.append("--enable-helm")
            cmd.append("--load-restrictor=LoadRestrictionsNone")
            
        print(f"🔨 Building kustomize overlay: {overlay_path}")  # Show when actually building
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                cwd=project_root
            )
        except subprocess.CalledProcessError as e:
            print(f"Kustomize build failed for {overlay_path}")
            print(f"Command: {' '.join(cmd)}")
            print(f"Exit code: {e.returncode}")
            print(f"Stdout: {e.stdout}")
            print(f"Stderr: {e.stderr}")
            raise
            
        # Parse YAML documents
        documents = []
        for doc in yaml.safe_load_all(result.stdout):
            if doc is not None:  # Skip empty documents
                documents.append(doc)
        
        # Cache the result
        _cache[cache_key] = documents
        
        return documents
    
    return _build


@pytest.fixture
def branch_targeting_validator():
    """Factory for validating branch targeting functionality."""
    
    class BranchTargetingValidator:
        """Helper class for validating branch targeting in ArgoCD resources."""
        
        @staticmethod
        def find_applications(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            """Find all ArgoCD Application resources."""
            return [
                doc for doc in documents
                if doc.get("kind") == "Application" and 
                doc.get("apiVersion") == "argoproj.io/v1alpha1"
            ]
        
        @staticmethod
        def find_application_sets(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            """Find all ArgoCD ApplicationSet resources."""
            return [
                doc for doc in documents
                if doc.get("kind") == "ApplicationSet" and 
                doc.get("apiVersion") == "argoproj.io/v1alpha1"
            ]
        
        @staticmethod
        def find_config_maps(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            """Find all ConfigMap resources."""
            return [
                doc for doc in documents
                if doc.get("kind") == "ConfigMap" and 
                doc.get("apiVersion") == "v1"
            ]
        
        @staticmethod
        def get_branch_targeting_config_map(documents: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
            """Find the branch targeting ConfigMap."""
            config_maps = BranchTargetingValidator.find_config_maps(documents)
            for cm in config_maps:
                if cm.get("metadata", {}).get("name") == "argocd-branch-targetrevision":
                    return cm
            return None
        
        @staticmethod
        def get_target_revision_from_config_map(config_map: Dict[str, Any]) -> Optional[str]:
            """Extract target revision from branch targeting ConfigMap."""
            if not config_map:
                return None
            return config_map.get("data", {}).get("targetRevision")
        
        @staticmethod
        def has_branch_targeting_labels(resource: Dict[str, Any]) -> bool:
            """Check if resource has branch targeting labels."""
            labels = resource.get("metadata", {}).get("labels", {})
            return (labels.get("repo") == "argocd-eda" and 
                   labels.get("argocd-branch-targetrevision") == "true")
        
        @staticmethod
        def is_helm_application(resource: Dict[str, Any]) -> bool:
            """Check if resource is a helm application."""
            labels = resource.get("metadata", {}).get("labels", {})
            return labels.get("source-type") == "helm"
        
        @staticmethod
        def is_multisource_application(resource: Dict[str, Any]) -> bool:
            """Check if resource uses multisource strategy."""
            labels = resource.get("metadata", {}).get("labels", {})
            return labels.get("argocd-branch-targetrevision-strategy") == "multisource"
        
        @staticmethod
        def get_application_target_revision(app: Dict[str, Any]) -> Optional[str]:
            """Get target revision from Application resource."""
            spec = app.get("spec", {})
            
            # Check for single source
            if "source" in spec:
                return spec["source"].get("targetRevision")
            
            # Check for multi-source
            if "sources" in spec:
                sources = spec["sources"]
                if sources and len(sources) > 0:
                    return sources[0].get("targetRevision")
            
            return None
        
        @staticmethod
        def get_application_set_target_revision(app_set: Dict[str, Any]) -> Optional[str]:
            """Get target revision from ApplicationSet resource."""
            spec = app_set.get("spec", {})
            template_spec = spec.get("template", {}).get("spec", {})
            
            # Check template source
            if "source" in template_spec:
                return template_spec["source"].get("targetRevision")
            
            # Check template sources (multisource)
            if "sources" in template_spec:
                sources = template_spec["sources"]
                if sources and len(sources) > 0:
                    return sources[0].get("targetRevision")
            
            return None
        
        @staticmethod
        def get_application_set_git_revision(app_set: Dict[str, Any]) -> Optional[str]:
            """Get git revision from ApplicationSet generators."""
            spec = app_set.get("spec", {})
            generators = spec.get("generators", [])
            
            for generator in generators:
                if "git" in generator:
                    return generator["git"].get("revision")
            
            return None
        
        @staticmethod
        def get_helm_feature_branch_parameter(resource: Dict[str, Any]) -> Optional[str]:
            """Get feature_branch parameter value from helm application."""
            spec = resource.get("spec", {})
            
            # For Application resources
            if "source" in spec and "helm" in spec["source"]:
                parameters = spec["source"]["helm"].get("parameters", [])
                for param in parameters:
                    if param.get("name") == "feature_branch":
                        return param.get("value")
            
            # For ApplicationSet resources
            if "template" in spec:
                template_spec = spec["template"].get("spec", {})
                if "source" in template_spec and "helm" in template_spec["source"]:
                    parameters = template_spec["source"]["helm"].get("parameters", [])
                    for param in parameters:
                        if param.get("name") == "feature_branch":
                            return param.get("value")
            
            return None
    
    return BranchTargetingValidator()