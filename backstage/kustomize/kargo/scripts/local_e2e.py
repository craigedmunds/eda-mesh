#!/usr/bin/env python3
"""
Local E2E Test Script for testing the Backstage deployment
This script can run the E2E test either locally or inside the Docker container.
"""

import argparse
import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path


def create_temporary_configmaps(test_run_id: str) -> dict:
    """Create unique ConfigMaps for local testing to avoid conflicts with production resources."""
    print(f"🔧 Creating temporary ConfigMaps for test run: {test_run_id}")
    
    # Get the project root directory
    project_root = Path(__file__).parent.parent.parent.parent.parent
    
    # Define ConfigMap names with unique suffix
    configmap_names = {
        'scripts': f'backstage-acceptance-scripts-{test_run_id}',
        'tests': f'backstage-acceptance-tests-{test_run_id}',
        'lib': f'backstage-acceptance-lib-{test_run_id}',
        'eda-plugin': f'backstage-eda-plugin-tests-{test_run_id}',
        'image-factory-plugin': f'backstage-image-factory-plugin-tests-{test_run_id}'
    }
    
    try:
        # Create scripts ConfigMap
        scripts_dir = Path(__file__).parent
        subprocess.run([
            'kubectl', 'create', 'configmap', configmap_names['scripts'],
            f'--from-file={scripts_dir}/post_deployment_e2e.py',
            f'--from-file={scripts_dir}/setup_traefik_hosts.sh',
            '-n', 'backstage-kargo'
        ], check=True, capture_output=True)
        
        # Create tests and lib ConfigMaps using kustomize
        acceptance_dir = project_root / 'backstage' / 'app' / 'tests' / 'acceptance'
        
        # Apply kustomize to get the ConfigMap YAML, then modify names
        kustomize_result = subprocess.run([
            'kubectl', 'kustomize', str(acceptance_dir)
        ], capture_output=True, text=True, check=True)
        
        # Parse and modify the YAML to use unique names
        import tempfile
        try:
            import yaml
        except ImportError:
            print("❌ PyYAML is required for ConfigMap creation. Install with: pip install PyYAML")
            raise
        
        docs = list(yaml.safe_load_all(kustomize_result.stdout))
        for doc in docs:
            if doc and doc.get('kind') == 'ConfigMap':
                original_name = doc['metadata']['name']
                if original_name == 'backstage-acceptance-tests':
                    doc['metadata']['name'] = configmap_names['tests']
                elif original_name == 'backstage-acceptance-lib':
                    doc['metadata']['name'] = configmap_names['lib']
        
        # Apply the modified ConfigMaps
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump_all(docs, f)
            temp_file = f.name
        
        subprocess.run([
            'kubectl', 'apply', '-f', temp_file, '-n', 'backstage-kargo'
        ], check=True, capture_output=True)
        
        os.unlink(temp_file)
        
        # Create plugin ConfigMaps (these might not exist, so ignore errors)
        try:
            eda_plugin_dir = project_root / 'backstage' / 'app' / 'plugins' / 'eda' / 'tests' / 'acceptance'
            if eda_plugin_dir.exists():
                subprocess.run([
                    'kubectl', 'create', 'configmap', configmap_names['eda-plugin'],
                    f'--from-file={eda_plugin_dir}',
                    '-n', 'backstage-kargo'
                ], check=True, capture_output=True)
        except subprocess.CalledProcessError:
            print("ℹ️  EDA plugin tests not found, skipping ConfigMap creation")
        
        try:
            image_factory_plugin_dir = project_root / 'backstage' / 'app' / 'plugins' / 'image-factory' / 'tests' / 'acceptance'
            if image_factory_plugin_dir.exists():
                subprocess.run([
                    'kubectl', 'create', 'configmap', configmap_names['image-factory-plugin'],
                    f'--from-file={image_factory_plugin_dir}',
                    '-n', 'backstage-kargo'
                ], check=True, capture_output=True)
        except subprocess.CalledProcessError:
            print("ℹ️  Image Factory plugin tests not found, skipping ConfigMap creation")
        
        print(f"✅ Created temporary ConfigMaps: {', '.join(configmap_names.values())}")
        return configmap_names
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create temporary ConfigMaps: {e}")
        raise
    except Exception as e:
        print(f"❌ Error creating temporary ConfigMaps: {e}")
        raise


def cleanup_temporary_configmaps(configmap_names: dict):
    """Clean up temporary ConfigMaps created for local testing."""
    print(f"🧹 Cleaning up temporary ConfigMaps...")
    
    for name in configmap_names.values():
        try:
            subprocess.run([
                'kubectl', 'delete', 'configmap', name, '-n', 'backstage-kargo'
            ], capture_output=True)
        except Exception:
            pass  # Ignore cleanup errors
    
    print("✅ Temporary ConfigMaps cleaned up")


def run_in_docker(url: str, verbose: bool = False, shell: bool = False, test_filter: str = None, grep_pattern: str = None, extra_args: list = None) -> bool:
    """Run the E2E test inside the Docker container."""
    if shell:
        print("🐳 Opening shell inside Docker container...")
    else:
        print("🐳 Running acceptance test inside Docker container...")
    
    # Get the project root directory
    project_root = Path(__file__).parent.parent.parent.parent.parent
    scripts_dir = Path(__file__).parent
    backstage_app_dir = project_root / 'backstage' / 'app'
    artifacts_dir = project_root / '.backstage-acceptance-artifacts'
    
    # Ensure artifacts directory exists
    artifacts_dir.mkdir(exist_ok=True)
    
    # Docker run command
    docker_cmd = [
        'docker', 'run', '--rm',
        # Use host network to access local services (needed for 127.0.0.1.nip.io)
        '--network', 'host',
        # Mount the scripts
        '-v', f'{scripts_dir}:/scripts:ro',
        # Mount the entire backstage app directory for unified test discovery
        '-v', f'{backstage_app_dir}:/workspace/backstage/app:ro',
        # Mount artifacts directory
        '-v', f'{artifacts_dir}:/artifacts',
        # Set environment variables
        '-e', f'BACKSTAGE_URL={url}',
        '-e', 'PLAYWRIGHT_BROWSERS_PATH=/ms-playwright',
        '-e', 'KARGO_PROMOTION_ID=local-test',
        '-e', 'KARGO_FREIGHT_ID=local-test',
        # Use the E2E test runner image
        'ghcr.io/craigedmunds/e2e-test-runner:0.1.4',
    ]
    
    post_deployment_command = [
            'python3', '/scripts/post_deployment_e2e.py',
            '--url', url,
            '--max-wait-time', '60'
        ]
    
    # Add test filtering options
    if test_filter:
        post_deployment_command.extend(['--filter', test_filter])
    if grep_pattern:
        post_deployment_command.extend(['--grep', grep_pattern])
    if extra_args:
        post_deployment_command.extend(extra_args)
    # Add debug environment variable only in verbose mode
    if verbose:
        docker_cmd.extend(['-e', 'DEBUG=pw:browser*,pw:api*'])
    
    if shell:
        print(f"🚀 Command for inside shell: {' '.join(post_deployment_command)}")

        # Interactive mode for shell
        docker_cmd.insert(2, '-it')
        docker_cmd.append('/bin/bash')
    else:
        # Run the Python script
        docker_cmd.extend(post_deployment_command)
        
        if verbose:
            docker_cmd.append('--verbose')
    
    print(f"🚀 Running: {' '.join(docker_cmd)}")
    
    try:
        # For shell, we want to allow interaction
        if shell:
            subprocess.run(docker_cmd)
            return True
        else:
            result = subprocess.run(docker_cmd)
            return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running Docker E2E test: {e}")
        return False


def run_locally(url: str, verbose: bool = False, test_filter: str = None, grep_pattern: str = None, extra_args: list = None) -> bool:
    """Run the acceptance test locally by calling post_deployment_e2e.py with local configuration."""
    print("💻 Running acceptance test locally...")
    
    # Set up environment to simulate local testing
    env = os.environ.copy()
    
    # Create temporary directories to simulate the container environment
    temp_dir = Path('/tmp/backstage-acceptance-local')
    temp_dir.mkdir(exist_ok=True)
    
    # Copy acceptance test files to the expected location
    acceptance_tests_source = Path(__file__).parent.parent.parent.parent.parent / 'backstage' / 'app' / 'tests' / 'acceptance'
    acceptance_tests_target = temp_dir / 'acceptance-tests'
    
    if acceptance_tests_source.exists():
        # Create symlink instead of copying files
        if acceptance_tests_target.exists():
            acceptance_tests_target.unlink()
        acceptance_tests_target.symlink_to(acceptance_tests_source)
        print(f"✅ Linked acceptance tests: {acceptance_tests_source} -> {acceptance_tests_target}")
    else:
        print(f"❌ Acceptance tests not found at: {acceptance_tests_source}")
        return False
    
    # Set environment variables for local testing
    env['ACCEPTANCE_TESTS_PATH'] = str(acceptance_tests_target)
    
    # Call the main post_deployment_e2e.py script with local configuration
    script_path = Path(__file__).parent / 'post_deployment_e2e.py'
    
    cmd = [
        'python3', str(script_path),
        '--url', url,
        '--max-wait-time', '60'
    ]
    
    if verbose:
        cmd.append('--verbose')
    if test_filter:
        cmd.extend(['--filter', test_filter])
    if grep_pattern:
        cmd.extend(['--grep', grep_pattern])
    if extra_args:
        cmd.extend(extra_args)
    
    print(f"🚀 Running: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, env=env)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running acceptance test: {e}")
        return False
    finally:
        # Clean up
        if acceptance_tests_target.exists() and acceptance_tests_target.is_symlink():
            acceptance_tests_target.unlink()


def run_in_kubernetes(url: str, verbose: bool = False, shell: bool = False, test_filter: str = None, grep_pattern: str = None, extra_args: list = None) -> bool:
    """Run the E2E test in a Kubernetes pod with the same setup as Kargo AnalysisTemplate."""
    if shell:
        print("☸️  Opening shell inside Kubernetes pod...")
    else:
        print("☸️  Running acceptance test in Kubernetes pod...")
    
    import tempfile
    
    # Generate unique test run ID
    test_run_id = f"local-{int(time.time())}-{str(uuid.uuid4())[:8]}"
    configmap_names = None
    
    try:
        # Create temporary ConfigMaps for this test run
        configmap_names = create_temporary_configmaps(test_run_id)
        
        # Create the pod manifest with unique name
        pod_name = f'test-e2e-runner-{test_run_id}'
        pod_manifest = {
            'apiVersion': 'v1',
            'kind': 'Pod',
            'metadata': {
                'name': pod_name,
                'namespace': 'backstage-kargo'
            },
        'spec': {
            'restartPolicy': 'Never',
            'containers': [{
                'name': 'e2e-runner',
                'image': 'ghcr.io/craigedmunds/e2e-test-runner:0.1.4',
                'command': ['/bin/bash'],
                'args': ['-c', f'''
set -euo pipefail
echo "🚀 Starting Backstage acceptance verification..."

# Setup Traefik host resolution
/scripts/setup_traefik_hosts.sh

{"# Open shell for debugging" if shell else f'''# Execute the acceptance test runner using HTTPS through ingress
python3 /scripts/post_deployment_e2e.py \\
  --url "https://backstage.127.0.0.1.nip.io" \\
  --max-wait-time 300 \\
  {"--verbose" if verbose else ""} \\
  {f"--filter {test_filter}" if test_filter else ""} \\
  {f'--grep "{grep_pattern}"' if grep_pattern else ""} \\
  {" ".join(extra_args) if extra_args else ""}'''}

{"exec /bin/bash" if shell else ""}
                '''],
                'env': [
                    {'name': 'BACKSTAGE_URL', 'value': url},
                    {'name': 'PLAYWRIGHT_BROWSERS_PATH', 'value': '/ms-playwright'},
                    {'name': 'KARGO_PROMOTION_ID', 'value': 'test-run'},
                    {'name': 'KARGO_FREIGHT_ID', 'value': 'test-freight'},

                ],
                'volumeMounts': [
                    {'name': 'acceptance-scripts', 'mountPath': '/scripts', 'readOnly': True},
                    {'name': 'acceptance-tests', 'mountPath': '/workspace/backstage/app/tests/acceptance', 'readOnly': True},
                    {'name': 'acceptance-lib', 'mountPath': '/workspace/backstage/app/tests/acceptance/lib', 'readOnly': True},
                    {'name': 'eda-plugin-tests', 'mountPath': '/workspace/backstage/app/plugins/eda/tests/acceptance', 'readOnly': True},
                    {'name': 'image-factory-plugin-tests', 'mountPath': '/workspace/backstage/app/plugins/image-factory/tests/acceptance', 'readOnly': True},
                    {'name': 'acceptance-artifacts', 'mountPath': '/artifacts'}
                ]
            }],
            'volumes': [
                {'name': 'acceptance-scripts', 'configMap': {'name': configmap_names['scripts'], 'defaultMode': 0o755}},
                {'name': 'acceptance-tests', 'configMap': {'name': configmap_names['tests'], 'defaultMode': 0o755}},
                {'name': 'acceptance-lib', 'configMap': {'name': configmap_names['lib'], 'defaultMode': 0o755}},
                {'name': 'eda-plugin-tests', 'configMap': {'name': configmap_names['eda-plugin'], 'defaultMode': 0o755}},
                {'name': 'image-factory-plugin-tests', 'configMap': {'name': configmap_names['image-factory-plugin'], 'defaultMode': 0o755}},
                {'name': 'acceptance-artifacts', 'hostPath': {'path': '/Users/craig/src/hmrc-eis/eda/argocd-eda/.backstage-acceptance-artifacts', 'type': 'DirectoryOrCreate'}}
            ]
        }
    }
    
        # Write pod manifest to temporary file as JSON (kubectl accepts JSON)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(pod_manifest, f, indent=2)
            pod_file = f.name
        
        print(f"🚀 Creating Kubernetes pod: {pod_name}")
        
        # Delete existing pod if it exists
        subprocess.run(['kubectl', 'delete', 'pod', pod_name, '-n', 'backstage-kargo'], 
                      capture_output=True)
        
        # Create the pod
        result = subprocess.run(['kubectl', 'apply', '-f', pod_file], 
                               capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Failed to create pod: {result.stderr}")
            return False
        
        print("⏳ Waiting for pod to start...")
        
        # Wait for pod to be ready
        subprocess.run(['kubectl', 'wait', '--for=condition=Ready', f'pod/{pod_name}', 
                       '-n', 'backstage-kargo', '--timeout=60s'], check=True)
        
        if shell:
            print("🐚 Attaching to pod shell...")
            # Attach to the pod for interactive shell
            subprocess.run(['kubectl', 'attach', pod_name, '-n', 'backstage-kargo', '-it'])
        else:
            print("📋 Following pod logs...")
            # Follow the logs
            log_process = subprocess.run(['kubectl', 'logs', pod_name, '-n', 'backstage-kargo', '-f'])
            
            # Check final pod status
            result = subprocess.run(['kubectl', 'get', 'pod', pod_name, '-n', 'backstage-kargo', 
                                   '-o', 'jsonpath={.status.phase}'], capture_output=True, text=True)
            
            success = result.stdout.strip() == 'Succeeded'
            if success:
                print("✅ Kubernetes E2E test completed successfully!")
            else:
                print("❌ Kubernetes E2E test failed")
            
            return success
            
    except Exception as e:
        print(f"❌ Error running Kubernetes E2E test: {e}")
        # Clean up ConfigMaps if they were created
        if configmap_names:
            cleanup_temporary_configmaps(configmap_names)
        return False
    finally:
        # Clean up temporary ConfigMaps
        if configmap_names:
            cleanup_temporary_configmaps(configmap_names)
        
        # Clean up pod manifest file
        try:
            import os
            os.unlink(pod_file)
        except:
            pass
        
        # Optionally clean up the pod
        if not shell:
            print("🧹 Cleaning up pod...")
            subprocess.run(['kubectl', 'delete', 'pod', pod_name, '-n', 'backstage-kargo'], 
                          capture_output=True)


def main():
    """Main entry point for local E2E testing."""
    parser = argparse.ArgumentParser(
        description='Run E2E tests for Backstage locally or in Docker'
    )
    parser.add_argument(
        '--url',
        default='https://backstage.127.0.0.1.nip.io',
        help='Deployment URL to test against'
    )
    parser.add_argument(
        '--docker',
        action='store_true',
        help='Run inside Docker container (more realistic)'
    )
    parser.add_argument(
        '--shell', '-s',
        action='store_true',
        help='Open a shell inside the container instead of running tests'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    parser.add_argument(
        '--filter', '-f',
        help='Filter tests to run (e.g., "image-factory", "eda", "enrollment", "navigation")'
    )
    parser.add_argument(
        '--grep',
        help='Run tests matching this pattern (passed to Playwright --grep)'
    )
    parser.add_argument(
        '--kubernetes', '-k',
        action='store_true',
        help='Run in Kubernetes pod with same setup as Kargo AnalysisTemplate'
    )
    
    # Parse known args and capture any additional arguments for Playwright
    args, extra_args = parser.parse_known_args()
    
    if args.shell and not args.docker and not args.kubernetes:
        print("⚠️  Implied --docker because --shell was requested")
        args.docker = True
    
    if args.kubernetes:
        success = run_in_kubernetes(args.url, args.verbose, args.shell, args.filter, args.grep, extra_args)
    elif args.docker:
        success = run_in_docker(args.url, args.verbose, args.shell, args.filter, args.grep, extra_args)
    else:
        success = run_locally(args.url, args.verbose, args.filter, args.grep, extra_args)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()