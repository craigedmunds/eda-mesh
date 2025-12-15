#!/usr/bin/env python3
"""
Local E2E Test Script for testing the Backstage deployment
This script can run the E2E test either locally or inside the Docker container.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path


def run_in_docker(url: str, verbose: bool = False, shell: bool = False) -> bool:
    """Run the E2E test inside the Docker container."""
    if shell:
        print("🐳 Opening shell inside Docker container...")
    else:
        print("🐳 Running E2E test inside Docker container...")
    
    # Get the project root directory
    project_root = Path(__file__).parent.parent.parent.parent
    scripts_dir = Path(__file__).parent
    acceptance_tests_dir = project_root / 'apps' / 'backstage' / 'tests' / 'acceptance'
    artifacts_dir = project_root / '.backstage-e2e-artifacts'
    
    # Ensure artifacts directory exists
    artifacts_dir.mkdir(exist_ok=True)
    
    # Docker run command
    docker_cmd = [
        'docker', 'run', '--rm',
        # Use host network to access local services (needed for 127.0.0.1.nip.io)
        '--network', 'host',
        # Mount the scripts
        '-v', f'{scripts_dir}:/scripts:ro',
        # Mount the acceptance tests
        '-v', f'{acceptance_tests_dir}:/acceptance-tests:ro',
        # Mount artifacts directory
        '-v', f'{artifacts_dir}:/artifacts',
        # Set environment variables
        '-e', f'BACKSTAGE_URL={url}',
        '-e', 'PLAYWRIGHT_BROWSERS_PATH=/ms-playwright',
        '-e', 'KARGO_PROMOTION_ID=local-test',
        '-e', 'KARGO_FREIGHT_ID=local-test',
        '-e', 'DEBUG=pw:browser*',
        # Use the E2E test runner image
        'ghcr.io/craigedmunds/e2e-test-runner:0.1.4',
    ]
    
    post_deployment_command = [
            'python3', '/scripts/post_deployment_e2e.py',
            '--url', url,
            '--max-wait-time', '60'
        ]
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


def run_locally(url: str, verbose: bool = False) -> bool:
    """Run the E2E test locally by calling post_deployment_e2e.py with local configuration."""
    print("💻 Running E2E test locally...")
    
    # Set up environment to simulate local testing
    env = os.environ.copy()
    
    # Create temporary directories to simulate the container environment
    temp_dir = Path('/tmp/backstage-e2e-local')
    temp_dir.mkdir(exist_ok=True)
    
    # Copy acceptance test files to the expected location
    acceptance_tests_source = Path(__file__).parent.parent.parent.parent / 'apps' / 'backstage' / 'tests' / 'acceptance'
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
    
    print(f"🚀 Running: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, env=env)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running E2E test: {e}")
        return False
    finally:
        # Clean up
        if acceptance_tests_target.exists() and acceptance_tests_target.is_symlink():
            acceptance_tests_target.unlink()


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
    
    args = parser.parse_args()
    
    if args.shell and not args.docker:
        print("⚠️  Implied --docker because --shell was requested")
        args.docker = True
    
    if args.docker:
        success = run_in_docker(args.url, args.verbose, args.shell)
    else:
        success = run_locally(args.url, args.verbose)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()