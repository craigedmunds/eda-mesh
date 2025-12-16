"""
AnalysisTemplate and job spec builders for Dockerfile analysis.
"""
from constructs import Construct
from cdk8s import ApiObject, JsonPatch


def setup_analysis_template(chart: Construct):
    """Create the shared AnalysisTemplate for Dockerfile analysis."""
    import logging
    logging.warning("Creating shared AnalysisTemplate for Dockerfile analysis")
    
    args = [
        {"name": "imageName"},
        {"name": "imageTag"},
        {"name": "imageDigest"},
        {"name": "dockerfile"},
        {"name": "sourceRepo"},
        {"name": "sourceProvider"},
        {"name": "gitRepo"},
        {"name": "gitBranch"}
    ]
    
    create_analysis_template(
        chart,
        name="analyze-dockerfile",
        args=args,
        job_spec=build_analysis_job_spec()
    )


def build_analysis_job_spec() -> dict:
    """Build the Kubernetes Job spec for Dockerfile analysis."""
    return {
        "backoffLimit": 1,
        "template": {
            "spec": {
                "serviceAccountName": "image-factory",
                "restartPolicy": "Never",
                "imagePullSecrets": [{"name": "ghcr-pull-secret"}],
                "containers": [
                    {
                        "name": "analyzer",
                        "image": "ghcr.io/craigedmunds/uv:0.1.0",
                        "imagePullPolicy": "IfNotPresent",
                        "command": [
                            "/bin/sh",
                            "-c",
                            """
                            set -e
                            echo "Cloning repository..."
                            git clone --depth 1 --branch {{args.gitBranch}} {{args.gitRepo}} /workspace/repo
                            cd /workspace/repo
                            echo "Running analysis..."
                            /scripts/run.sh app.py --image {{args.imageName}} --tag {{args.imageTag}} --digest {{args.imageDigest}} --dockerfile {{args.dockerfile}} --source-repo {{args.sourceRepo}} --source-provider {{args.sourceProvider}} --git-repo {{args.gitRepo}} --git-branch {{args.gitBranch}} --image-factory-dir /workspace/repo/image-factory
                            """
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


def create_analysis_template(
    chart: Construct,
    name: str,
    args: list[dict],
    job_spec: dict
) -> ApiObject:
    """
    Create an Argo Rollouts AnalysisTemplate.
    
    Args:
        chart: The CDK8s chart/construct
        name: Template name
        args: List of argument dicts
        job_spec: Kubernetes Job spec dict
    
    Returns:
        ApiObject representing the AnalysisTemplate
    """
    template = ApiObject(
        chart,
        f"analysis-template-{name}",
        api_version="argoproj.io/v1alpha1",
        kind="AnalysisTemplate",
        metadata={"name": name}
    )
    
    template.add_json_patch(JsonPatch.add("/spec", {
        "args": args,
        "metrics": [
            {
                "name": f"{name}-metric",
                "provider": {
                    "job": {
                        "spec": job_spec
                    }
                }
            }
        ]
    }))
    
    return template
