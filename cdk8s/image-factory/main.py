#!/usr/bin/env python
"""
CDK8s app for generating Kargo resources for the Image Factory.

This app reads images.yaml and state files, then generates:
- Warehouses for all images (managed, base, and external)
- AnalysisTemplate for running Dockerfile analysis
- Stages for orchestrating analysis of managed images
"""
from constructs import Construct
from cdk8s import App, Chart, ApiObject
from imports import k8s
from imports.warehouse.io.akuity import kargo
from pathlib import Path
import logging
import yaml
import os

# Configure logging
logging.basicConfig(level=logging.WARN, format='%(asctime)s - %(levelname)s - %(message)s')

# Paths
SCRIPT_DIR = Path(__file__).parent
IMAGE_FACTORY_DIR = SCRIPT_DIR / "../../image-factory"
IMAGES_YAML = IMAGE_FACTORY_DIR / "images.yaml"
STATE_IMAGES_DIR = IMAGE_FACTORY_DIR / "state/images"
STATE_BASE_IMAGES_DIR = IMAGE_FACTORY_DIR / "state/base-images"
NAMESPACE = "image-factory-kargo"


def load_yaml_dir(path: Path) -> list:
    """Load all YAML files in a directory, excluding example files."""
    if not path.exists():
        logging.warning("Directory %s does not exist; skipping", path)
        return []

    entries = []
    for file in sorted(path.glob("*.yaml")):
        if file.name.endswith(".example.yaml"):
            continue
        with open(file, "r") as fh:
            entries.append(yaml.safe_load(fh))
            logging.warning("Loaded %s", file)
    return entries


def merge_images(images_yaml_path: Path, state_images_dir: Path, state_base_images_dir: Path) -> dict:
    """
    Merge images from images.yaml and state files.
    
    Returns a dict of {name: image_data} where images.yaml takes precedence.
    """
    images_by_name = {}

    def merge_entry(existing: dict, incoming: dict, prefer_incoming: bool) -> dict:
        """Shallow merge dictionaries, optionally preferring incoming values."""
        merged = dict(existing or {})
        for key, value in (incoming or {}).items():
            if prefer_incoming or key not in merged:
                merged[key] = value
        return merged

    def add_images(entries, source: str, prefer_incoming: bool = False):
        for image in entries:
            if not image or "name" not in image:
                logging.warning("Skipping entry without name from %s: %s", source, image)
                continue
            name = image["name"]
            if name in images_by_name:
                logging.warning("Merging duplicate entry for %s from %s", name, source)
                images_by_name[name] = merge_entry(images_by_name[name], image, prefer_incoming)
            else:
                images_by_name[name] = image

    # Load and merge (images.yaml takes precedence)
    with open(images_yaml_path, "r") as f:
        registry_images = yaml.safe_load(f) or []
        add_images(registry_images, "images.yaml", prefer_incoming=True)
        logging.warning("Loaded %d entries from images.yaml", len(registry_images))

    add_images(load_yaml_dir(state_images_dir), "state/images", prefer_incoming=False)
    add_images(load_yaml_dir(state_base_images_dir), "state/base-images", prefer_incoming=False)

    logging.warning(
        "Total images after merge: %d -> %s",
        len(images_by_name),
        ", ".join(sorted(images_by_name.keys()))
    )

    return images_by_name


def is_managed_image(image: dict) -> bool:
    """Check if an image is managed (has source info)."""
    enrollment = image.get("enrollment", {})
    source = enrollment.get("source", {})
    return source.get("repo") is not None


def create_warehouse_for_managed_image(chart: Chart, image: dict):
    """Create a Warehouse for a managed image (monitors published versions)."""
    name = image["name"]
    enrollment = image.get("enrollment", {})
    registry = enrollment.get("registry", "ghcr.io")
    repository = enrollment.get("repository", "")
    repo_url = f"{registry}/{repository}"
    
    # Check if image has a semver version, otherwise use latest tag
    current_version = image.get("currentVersion")
    
    if current_version:
        # Image has semver tags
        logging.warning("Creating warehouse for managed image %s (repo: %s) with semver", name, repo_url)
        image_config = {
            "repoUrl": repo_url,
            "semverConstraint": ">=0.1.0",
            "discoveryLimit": 10,
            "strictSemvers": False
        }
    else:
        # Image doesn't have semver tags yet, use latest
        logging.warning("Creating warehouse for managed image %s (repo: %s) with latest tag", name, repo_url)
        image_config = {
            "repoUrl": repo_url,
            "allowTags": "^latest$",
            "imageSelectionStrategy": kargo.WarehouseSpecSubscriptionsImageImageSelectionStrategy.LEXICAL,
            "discoveryLimit": 10,
            "strictSemvers": False
        }
    
    kargo.Warehouse(
        chart,
        f"warehouse-{name}",
        metadata={"name": name},
        spec={
            "interval": "5m",
            "subscriptions": [
                {
                    "image": image_config
                }
            ]
        }
    )


def create_warehouse_for_base_or_external_image(chart: Chart, image: dict):
    """Create a Warehouse for a base image or external image (monitors upstream updates)."""
    name = image["name"]
    repo_url = image.get("repoURL")
    allow_tags = image.get("allowTags")
    
    if not repo_url or not allow_tags:
        logging.warning("Skipping %s: missing repoURL or allowTags", name)
        return
    
    # Map strategy string to enum
    strategy_str = image.get("imageSelectionStrategy", "Lexical")
    strategy_map = {
        "Lexical": kargo.WarehouseSpecSubscriptionsImageImageSelectionStrategy.LEXICAL,
        "NewestBuild": kargo.WarehouseSpecSubscriptionsImageImageSelectionStrategy.NEWEST_BUILD,
        "SemVer": kargo.WarehouseSpecSubscriptionsImageImageSelectionStrategy.SEM_VER,
    }
    strategy = strategy_map.get(strategy_str, kargo.WarehouseSpecSubscriptionsImageImageSelectionStrategy.LEXICAL)
    
    logging.warning("Creating warehouse for base/external image %s (repo: %s, tags: %s)", name, repo_url, allow_tags)
    
    kargo.Warehouse(
        chart,
        f"warehouse-{name}",
        metadata={"name": name},
        spec={
            "interval": "5m",
            "subscriptions": [
                {
                    "image": {
                        "repoUrl": repo_url,
                        "allowTags": allow_tags,
                        "imageSelectionStrategy": strategy,
                        "discoveryLimit": 10,
                        "strictSemvers": False
                    }
                }
            ]
        }
    )


def create_analysis_template(chart: Chart):
    """Create the shared AnalysisTemplate for Dockerfile analysis."""
    logging.warning("Creating shared AnalysisTemplate for Dockerfile analysis")
    
    # Using ApiObject since AnalysisTemplate is not in kargo imports
    analysis_template = ApiObject(
        chart,
        "analysis-template",
        api_version="argoproj.io/v1alpha1",
        kind="AnalysisTemplate",
        metadata={
            "name": "analyze-dockerfile"
        }
    )
    
    # Add spec using JSON patch
    from cdk8s import JsonPatch
    analysis_template.add_json_patch(JsonPatch.add("/spec", {
        "args": [
            {"name": "imageName"},
            {"name": "imageTag"},
            {"name": "imageDigest"},
            {"name": "dockerfile"},
            {"name": "sourceRepo"},
            {"name": "sourceProvider"},
            {"name": "gitRepo"},
            {"name": "gitBranch"}
        ],
        "metrics": [
            {
                "name": "dockerfile-analysis",
                "provider": {
                    "job": {
                        "spec": {
                            "backoffLimit": 1,
                            "template": {
                                "spec": {
                                    "serviceAccountName": "image-factory",
                                    "restartPolicy": "Never",
                                    "imagePullSecrets": [
                                        {"name": "ghcr-pull-secret"}
                                    ],
                                    "containers": [
                                        {
                                            "name": "analyzer",
                                            "image": "ghcr.io/craigedmunds/uv:latest",
                                            "imagePullPolicy": "Always",
                                            "command": [
                                                "/bin/sh",
                                                "/scripts/run.sh",
                                                "app.py",
                                                "--image", "{{args.imageName}}",
                                                "--tag", "{{args.imageTag}}",
                                                "--digest", "{{args.imageDigest}}",
                                                "--dockerfile", "{{args.dockerfile}}",
                                                "--source-repo", "{{args.sourceRepo}}",
                                                "--source-provider", "{{args.sourceProvider}}",
                                                "--git-repo", "{{args.gitRepo}}",
                                                "--git-branch", "{{args.gitBranch}}"
                                            ],
                                            "volumeMounts": [
                                                {
                                                    "name": "analyzer-script",
                                                    "mountPath": "/integration"
                                                }
                                            ],
                                            "env": [
                                                {
                                                    "name": "GITHUB_TOKEN",
                                                    "valueFrom": {
                                                        "secretKeyRef": {
                                                            "name": "ghcr-credentials",
                                                            "key": "password"
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ],
                                    "volumes": [
                                        {
                                            "name": "analyzer-script",
                                            "configMap": {
                                                "name": "image-factory-analysis"
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        ]
    }))


def create_stage_for_managed_image(chart: Chart, image: dict):
    """Create analysis Stage for a managed image."""
    name = image["name"]
    enrollment = image.get("enrollment", {})
    registry = enrollment.get("registry", "ghcr.io")
    repository = enrollment.get("repository", "")
    repo_url = f"{registry}/{repository}"
    
    source = enrollment.get("source", {})
    git_repo = f"https://github.com/{source.get('repo', '')}.git"
    git_branch = source.get("branch", "main")
    dockerfile = source.get("dockerfile", "")
    source_repo = source.get("repo", "")
    source_provider = source.get("provider", "github")
    
    logging.warning("Creating analysis stage for managed image %s", name)
    
    # Using ApiObject since Stage and Warehouse are in different jsii packages
    from cdk8s import JsonPatch
    stage = ApiObject(
        chart,
        f"stage-analyze-{name}",
        api_version="kargo.akuity.io/v1alpha1",
        kind="Stage",
        metadata={
            "name": f"analyze-dockerfile-{name}"
        }
    )
    
    stage.add_json_patch(JsonPatch.add("/spec", {
        "requestedFreight": [
            {
                "origin": {
                    "kind": "Warehouse",
                    "name": name
                },
                "sources": {
                    "direct": True
                }
            }
        ],
        "promotionTemplate": {
            "spec": {
                "steps": [
                    {
                        "uses": "git-clone",
                        "config": {
                            "repoURL": git_repo,
                            "checkout": [
                                {
                                    "branch": git_branch,
                                    "path": "./repo"
                                }
                            ]
                        }
                    }
                ]
            }
        },
        "verification": {
            "analysisTemplates": [
                {"name": "analyze-dockerfile"}
            ],
            "args": [
                {"name": "imageName", "value": name},
                {"name": "imageTag", "value": f"${{{{ imageFrom(\"{repo_url}\").Tag }}}}"},
                {"name": "imageDigest", "value": f"${{{{ imageFrom(\"{repo_url}\").Digest }}}}"},
                {"name": "dockerfile", "value": dockerfile},
                {"name": "sourceRepo", "value": source_repo},
                {"name": "sourceProvider", "value": source_provider},
                {"name": "gitRepo", "value": git_repo},
                {"name": "gitBranch", "value": git_branch}
            ]
        }
    }))


def create_namespace(chart: Chart):
    """Create the namespace with labels for Kyverno secret cloning."""
    logging.warning("Creating namespace with Kyverno labels")
    
    from cdk8s import JsonPatch
    ns = ApiObject(
        chart,
        "namespace",
        api_version="v1",
        kind="Namespace",
        metadata={
            "name": NAMESPACE,
            "labels": {
                "kargo.akuity.io/project": "true",
                "kargo.deps/ghcr": "true"
            }
        }
    )
    # Remove the namespace field that Chart adds (Namespace is cluster-scoped)
    ns.add_json_patch(JsonPatch.remove("/metadata/namespace"))


def create_project(chart: Chart):
    """Create the Kargo Project (cluster-scoped)."""
    logging.warning("Creating Kargo Project")
    
    # Project is cluster-scoped - explicitly set namespace to None
    from cdk8s import JsonPatch
    project = ApiObject(
        chart,
        "project",
        api_version="kargo.akuity.io/v1alpha1",
        kind="Project",
        metadata={
            "name": NAMESPACE
        }
    )
    # Remove the namespace that Chart adds by default
    project.add_json_patch(JsonPatch.remove("/metadata/namespace"))


def create_project_config(chart: Chart):
    """Create the ProjectConfig with promotion policies."""
    logging.warning("Creating ProjectConfig")
    
    from cdk8s import JsonPatch
    project_config = ApiObject(
        chart,
        "project-config",
        api_version="kargo.akuity.io/v1alpha1",
        kind="ProjectConfig",
        metadata={
            "name": NAMESPACE
        }
    )
    
    project_config.add_json_patch(JsonPatch.add("/spec", {
        "promotionPolicies": [
            {
                "stageSelector": {"name": "analyze-dockerfile-backstage"},
                "autoPromotionEnabled": True
            },
            {
                "stageSelector": {"name": "analyze-dockerfile-uv"},
                "autoPromotionEnabled": True
            }
        ]
    }))


def create_analysis_configmap(chart: Chart):
    """Create ConfigMap with the analysis tool code."""
    logging.warning("Creating analysis tool ConfigMap")
    
    # Read the analysis tool files
    app_py_path = SCRIPT_DIR / "../../apps/image-factory/app.py"
    pyproject_path = SCRIPT_DIR / "../../apps/image-factory/pyproject.toml"
    
    with open(app_py_path, "r") as f:
        app_py_content = f.read()
    
    with open(pyproject_path, "r") as f:
        pyproject_content = f.read()
    
    k8s.KubeConfigMap(
        chart,
        "analysis-configmap",
        metadata={
            "name": "image-factory-analysis"
        },
        data={
            "app.py": app_py_content,
            "pyproject.toml": pyproject_content
        }
    )


def create_service_account(chart: Chart):
    """Create ServiceAccount for analysis jobs."""
    logging.warning("Creating ServiceAccount for analysis jobs")
    
    k8s.KubeServiceAccount(
        chart,
        "service-account",
        metadata={
            "name": "image-factory"
        }
    )


def create_docker_pull_secret(chart: Chart):
    """Create Docker pull secret for GHCR (copied from backstage namespace)."""
    logging.warning("Creating Docker pull secret for GHCR")
    
    # Note: This secret should be synced from backstage/ghcr-creds by Kyverno
    # We create a placeholder that will be updated by Kyverno policy
    from cdk8s import JsonPatch
    secret = ApiObject(
        chart,
        "docker-pull-secret",
        api_version="v1",
        kind="Secret",
        metadata={
            "name": "ghcr-pull-secret",
            "annotations": {
                "kyverno.io/source": "backstage/ghcr-creds"
            }
        }
    )
    
    secret.add_json_patch(JsonPatch.add("/type", "kubernetes.io/dockerconfigjson"))
    secret.add_json_patch(JsonPatch.add("/data", {
        ".dockerconfigjson": "e30K"  # Empty JSON object base64 encoded - will be replaced by Kyverno
    }))


def create_ghcr_pull_secret(chart: Chart):
    """Create a pull secret for GHCR with broader repoURL pattern."""
    logging.warning("Creating GHCR pull secret for image discovery")
    
    # Note: This assumes ghcr-credentials secret exists with username/password
    # We create a reference secret that Kargo can use for all ghcr.io/craigedmunds images
    from cdk8s import JsonPatch
    secret = ApiObject(
        chart,
        "ghcr-pull-secret",
        api_version="v1",
        kind="Secret",
        metadata={
            "name": "ghcr-pull-secret",
            "labels": {
                "kargo.akuity.io/cred-type": "image"
            }
        }
    )
    
    # Add string data for Kargo credentials
    # This will need to reference the actual credentials from ghcr-credentials
    secret.add_json_patch(JsonPatch.add("/stringData", {
        "repoURL": "ghcr.io/craigedmunds",
        "username": "$(GHCR_USERNAME)",
        "password": "$(GHCR_PASSWORD)"
    }))
    
    secret.add_json_patch(JsonPatch.add("/type", "Opaque"))


class ImageFactoryChart(Chart):
    """CDK8s Chart for Image Factory Kargo resources."""
    
    def __init__(self, scope: Construct, id: str):
        super().__init__(scope, id, namespace=NAMESPACE)
        
        logging.warning("Main script running in %s", SCRIPT_DIR)
        logging.warning("Looking for images.yaml file in %s", IMAGES_YAML.resolve())
        logging.warning("Looking for images state in %s", STATE_IMAGES_DIR.resolve())
        logging.warning("Looking for base images state in %s", STATE_BASE_IMAGES_DIR.resolve())
        
        # Create infrastructure resources
        create_namespace(self)
        create_project(self)
        create_project_config(self)
        create_analysis_configmap(self)
        create_service_account(self)
        create_docker_pull_secret(self)
        
        # Load and merge all images
        images_by_name = merge_images(IMAGES_YAML, STATE_IMAGES_DIR, STATE_BASE_IMAGES_DIR)
        
        # Separate managed images from base/external images
        managed_images = []
        
        for image in images_by_name.values():
            name = image.get("name")
            if not name:
                logging.warning("Skipping image without name: %s", image)
                continue
            
            if is_managed_image(image):
                managed_images.append(image)
                create_warehouse_for_managed_image(self, image)
            else:
                create_warehouse_for_base_or_external_image(self, image)
        
        # Generate AnalysisTemplate (shared by all managed images)
        if managed_images:
            create_analysis_template(self)
        
        # Generate Stages for each managed image
        for image in managed_images:
            create_stage_for_managed_image(self, image)


# Main entry point
app = App()
ImageFactoryChart(app, "image-factory")
app.synth()
