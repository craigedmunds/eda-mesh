#!/usr/bin/env python3
"""
Pytest configuration and fixtures for kustomize build testing.
"""
import pytest
import subprocess
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional
import tempfile
import os


@pytest.fixture(scope="session")
def project_root():
    """Get the project root directory."""
    return Path(__file__).parent.parent.parent


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
def ingress_validator():
    """Factory for validating ingress resources."""
    
    class IngressValidator:
        """Helper class for validating ingress resources."""
        
        @staticmethod
        def find_ingresses(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            """Find all ingress resources in the documents."""
            return [
                doc for doc in documents
                if doc.get("kind") == "Ingress" and 
                doc.get("apiVersion", "").startswith("networking.k8s.io/")
            ]
        
        @staticmethod
        def find_ingress_by_name(documents: List[Dict[str, Any]], name: str) -> Optional[Dict[str, Any]]:
            """Find a specific ingress by name."""
            ingresses = IngressValidator.find_ingresses(documents)
            for ingress in ingresses:
                if ingress.get("metadata", {}).get("name") == name:
                    return ingress
            return None
        
        @staticmethod
        def get_hosts(ingress: Dict[str, Any]) -> List[str]:
            """Extract all hosts from an ingress resource."""
            hosts = []
            rules = ingress.get("spec", {}).get("rules", [])
            for rule in rules:
                if "host" in rule:
                    hosts.append(rule["host"])
            return hosts
        
        @staticmethod
        def get_tls_hosts(ingress: Dict[str, Any]) -> List[str]:
            """Extract all TLS hosts from an ingress resource."""
            hosts = []
            tls_configs = ingress.get("spec", {}).get("tls", [])
            for tls_config in tls_configs:
                hosts.extend(tls_config.get("hosts", []))
            return hosts
        
        @staticmethod
        def get_annotations(ingress: Dict[str, Any]) -> Dict[str, str]:
            """Get annotations from an ingress resource."""
            return ingress.get("metadata", {}).get("annotations", {})
        
        @staticmethod
        def get_labels(ingress: Dict[str, Any]) -> Dict[str, str]:
            """Get labels from an ingress resource."""
            return ingress.get("metadata", {}).get("labels", {})
        
        @staticmethod
        def has_management_label(ingress: Dict[str, Any], label_type: str = "any") -> bool:
            """
            Check if ingress has management labels.
            
            Args:
                ingress: Ingress resource
                label_type: "private", "public", or "any"
            """
            labels = IngressValidator.get_labels(ingress)
            
            private_label = "ingress.ctoaas.co/managed"
            public_label = "ingress.ctoaas.co/managed-public"
            
            if label_type == "private":
                return labels.get(private_label) == "true"
            elif label_type == "public":
                return labels.get(public_label) == "true"
            else:  # any
                return (labels.get(private_label) == "true" or 
                       labels.get(public_label) == "true")
        
        @staticmethod
        def validate_domain_pattern(host: str, expected_pattern: str) -> bool:
            """
            Validate that a host matches an expected domain pattern.
            
            Args:
                host: The actual host from ingress
                expected_pattern: Pattern like "*.lab.local.ctoaas.co"
            """
            if expected_pattern.startswith("*."):
                suffix = expected_pattern[2:]  # Remove "*."
                return host.endswith(f".{suffix}")
            else:
                return host == expected_pattern
    
    return IngressValidator()


@pytest.fixture
def overlay_discovery(project_root):
    """Discover kustomize overlays automatically."""
    
    def _discover_overlays(base_path: str = "") -> List[str]:
        """
        Discover all kustomize overlay directories.
        
        Args:
            base_path: Base path to search from (relative to project root)
            
        Returns:
            List of overlay paths relative to project root
        """
        search_path = project_root / base_path if base_path else project_root
        overlays = []
        
        # Look for directories named "overlays" and their subdirectories
        for overlay_dir in search_path.rglob("overlays"):
            if overlay_dir.is_dir():
                # Find subdirectories that contain kustomization.yaml
                for subdir in overlay_dir.iterdir():
                    if subdir.is_dir():
                        kustomization_files = [
                            "kustomization.yaml",
                            "kustomization.yml", 
                            "Kustomization"
                        ]
                        
                        if any((subdir / f).exists() for f in kustomization_files):
                            # Make path relative to project root
                            relative_path = subdir.relative_to(project_root)
                            overlays.append(str(relative_path))
        
        return sorted(overlays)
    
    return _discover_overlays