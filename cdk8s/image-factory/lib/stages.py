"""
Stage creation utilities for Kargo.
"""
from cdk8s import ApiObject, JsonPatch
import logging

logger = logging.getLogger(__name__)


def create_rebuild_trigger_stage(chart, base_image: dict, dependent_images: list, namespace: str):
    """
    Create a Kargo stage that triggers GitHub workflow rebuilds when a base image updates.
    
    Args:
        chart: CDK8s Chart
        base_image: Base image dict with name, repoURL
        dependent_images: List of dependent image dicts with enrollment.source info
        namespace: Kubernetes namespace
    """
    base_name = base_image.get("name")
    logger.warning(f"Creating rebuild-trigger stage for {base_name} with {len(dependent_images)} dependents")
    
    # Build HTTP steps to trigger each dependent workflow
    http_steps = []
    
    for dep_image in dependent_images:
        dep_name = dep_image.get("name")
        source = dep_image.get("enrollment", {}).get("source", {})
        workflow_file = source.get("workflow", f"{dep_name}.yml")
        repo = source.get("repo", "")
        branch = source.get("branch", "main")
        
        if not repo:
            logger.warning(f"Skipping {dep_name} - no repo configured")
            continue
        
        # GitHub workflow_dispatch API call
        http_steps.append({
            "uses": "http",
            "as": f"trigger-{dep_name}",
            "config": {
                "url": f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_file}/dispatches",
                "method": "POST",
                "headers": [
                    {
                        "name": "Accept",
                        "value": "application/vnd.github.v3+json"
                    },
                    {
                        "name": "Authorization", 
                        "value": "Bearer ${secret.GITHUB_TOKEN}"
                    },
                    {
                        "name": "Content-Type",
                        "value": "application/json"
                    }
                ],
                "body": f'{{"ref":"{branch}","inputs":{{"version_bump":"patch","triggered_by":"kargo-base-image-update","base_image":"{base_name}"}}}}'
            }
        })
    
    if not http_steps:
        logger.warning(f"No valid dependents for {base_name}, skipping rebuild-trigger stage")
        return
    
    stage = ApiObject(
        chart,
        f"stage-rebuild-trigger-{base_name}",
        api_version="kargo.akuity.io/v1alpha1",
        kind="Stage",
        metadata={
            "name": f"rebuild-trigger-{base_name}",
            "namespace": namespace
        }
    )
    
    stage.add_json_patch(JsonPatch.add("/spec", {
        "requestedFreight": [
            {
                "origin": {
                    "kind": "Warehouse",
                    "name": base_name
                },
                "sources": {
                    "direct": True
                }
            }
        ],
        "promotionTemplate": {
            "spec": {
                "steps": http_steps
            }
        }
    }))
    
    return stage
