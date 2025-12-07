"""
Warehouse creation functions for Kargo.
"""
from constructs import Construct
from imports.warehouse.io.akuity import kargo
import logging

logger = logging.getLogger(__name__)


def create_warehouse_for_managed_image(chart: Construct, image: dict):
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
        logger.warning("Creating warehouse for managed image %s (repo: %s) with semver", name, repo_url)
        image_config = {
            "repoUrl": repo_url,
            "semverConstraint": ">=0.1.0",
            "discoveryLimit": 10,
            "strictSemvers": False
        }
    else:
        # Image doesn't have semver tags yet, use latest
        logger.warning("Creating warehouse for managed image %s (repo: %s) with latest tag", name, repo_url)
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
            "subscriptions": [{"image": image_config}]
        }
    )


def create_warehouse_for_base_or_external_image(chart: Construct, image: dict):
    """Create a Warehouse for a base image or external image (monitors upstream updates)."""
    name = image["name"]
    repo_url = image.get("repoURL")
    allow_tags = image.get("allowTags")
    
    if not repo_url or not allow_tags:
        logger.warning("Skipping %s: missing repoURL or allowTags", name)
        return
    
    # Map strategy string to enum
    strategy_str = image.get("imageSelectionStrategy", "Lexical")
    strategy_map = {
        "Lexical": kargo.WarehouseSpecSubscriptionsImageImageSelectionStrategy.LEXICAL,
        "NewestBuild": kargo.WarehouseSpecSubscriptionsImageImageSelectionStrategy.NEWEST_BUILD,
        "SemVer": kargo.WarehouseSpecSubscriptionsImageImageSelectionStrategy.SEM_VER,
    }
    strategy = strategy_map.get(strategy_str, kargo.WarehouseSpecSubscriptionsImageImageSelectionStrategy.LEXICAL)
    
    logger.warning("Creating warehouse for base/external image %s (repo: %s, tags: %s)", name, repo_url, allow_tags)
    
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
