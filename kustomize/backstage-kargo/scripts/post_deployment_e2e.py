#!/usr/bin/env python3
"""
Post-deployment E2E Test Execution Script for Kargo
This script runs e2e tests after successful deployment to validate Backstage functionality.
Requirements: 3.1, 3.2, 3.3, 3.4, 3.5

This script is designed to run within Kargo's verification phase after ArgoCD deployment.
It validates that the Backstage application is working correctly by running the existing
Playwright E2E tests against the deployed instance.
"""

import argparse
import json
import logging
import os
import shutil
import subprocess
import sys
import time
import ssl
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import urllib.request
import urllib.error


class PostDeploymentE2E:
    """Handles post-deployment E2E test execution for Backstage within Kargo verification."""
    
    def __init__(self, config: Dict):
        self.config = config
        self.deployment_url = config.get('deployment_url', 'http://backstage.backstage.svc.cluster.local:7007')
        self.max_wait_time = config.get('max_wait_time', 300)  # 5 minutes
        self.health_check_interval = config.get('health_check_interval', 10)  # 10 seconds
        # Since we're running in a container, we need to clone/access the Backstage repo
        self.work_dir = Path('/tmp/backstage-e2e')
        self.backstage_repo_url = config.get('backstage_repo_url', 'https://github.com/craigedmunds/argocd-eda.git')
        self.backstage_branch = config.get('backstage_branch', 'feature/backstage-events')
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.logger = logging.getLogger(__name__)

    def check_deployment_readiness(self) -> bool:
        """
        Check if the Backstage deployment is ready and responding.
        
        Returns:
            bool: True if deployment is ready, False otherwise
        """
        max_attempts = self.max_wait_time // self.health_check_interval
        
        self.logger.info(f"Checking deployment readiness at {self.deployment_url}")
        
        for attempt in range(1, max_attempts + 1):
            self.logger.info(f"Health check attempt {attempt}/{max_attempts}")
            
            try:
                # Create SSL context that ignores certificate verification for self-signed certs
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                
                # Check if endpoint is responding
                with urllib.request.urlopen(self.deployment_url, timeout=10, context=ssl_context) as response:
                    if response.status == 200:
                        self.logger.info(f"Deployment is responding at {self.deployment_url}")
                        
                        # Check for Backstage content
                        content = response.read().decode('utf-8')
                        if 'EDA Backstage App' in content or 'Backstage' in content:
                            self.logger.info("✅ Deployment readiness confirmed - Backstage content detected")
                            return True
                        else:
                            self.logger.warning("⚠️  Endpoint responding but Backstage content not detected")
                            
            except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
                self.logger.warning(f"⚠️  Deployment not ready yet (attempt {attempt}/{max_attempts}): {e}")
            
            if attempt < max_attempts:
                self.logger.info(f"Waiting {self.health_check_interval}s before next check...")
                time.sleep(self.health_check_interval)
        
        self.logger.error(f"❌ Deployment readiness check failed after {self.max_wait_time}s")
        return False

    def setup_acceptance_tests(self) -> bool:
        """
        Setup the lightweight acceptance tests using files from mounted ConfigMap.
        
        Returns:
            bool: True if setup successful
        """
        try:
            self.logger.info(f"📦 Setting up acceptance tests in {self.work_dir}")
            
            # Clean up any existing directory
            if self.work_dir.exists():
                subprocess.run(['rm', '-rf', str(self.work_dir)], check=True)
            
            # Create test directory structure
            self.work_dir.mkdir(parents=True, exist_ok=True)
            os.chdir(self.work_dir)
            
            # Copy test files from mounted ConfigMaps or local path
            self.logger.info("📋 Copying test files from ConfigMaps...")
            
            # Check if we're running locally with a custom acceptance tests path
            local_acceptance_tests = os.environ.get('ACCEPTANCE_TESTS_PATH')
            if local_acceptance_tests and Path(local_acceptance_tests).exists():
                acceptance_tests_dir = Path(local_acceptance_tests)
                self.logger.info(f"Using local acceptance tests from: {acceptance_tests_dir}")
            else:
                acceptance_tests_dir = Path('/acceptance-tests')
            
            # Copy the test files from the acceptance tests ConfigMap
            test_files = [
                'package.json',
                'playwright.config.ts', 
                'events.spec.ts',
                'basic.spec.ts',
                'tsconfig.json'
            ]
            
            for file_name in test_files:
                src_file = acceptance_tests_dir / file_name
                if src_file.exists():
                    subprocess.run(['cp', str(src_file), str(self.work_dir / file_name)], check=True)
                    self.logger.info(f"✅ Copied {file_name}")
                else:
                    self.logger.warning(f"⚠️  Test file not found: {src_file}")
            
            # Install only the lightweight test dependencies
            self.logger.info("📦 Installing test dependencies (lightweight)...")
            result = subprocess.run(['npm', 'install'], capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                self.logger.error(f"❌ Failed to install test dependencies: {result.stderr}")
                return False
            
            # Install Playwright browsers
            # self.logger.info("🎭 Installing Playwright browsers...")
            # result = subprocess.run(['npx', 'playwright', 'install', 'chromium'], capture_output=True, text=True, timeout=180)
            # if result.returncode != 0:
            #     self.logger.warning(f"⚠️  Playwright install warning: {result.stderr}")
            #     # Continue anyway as this might not be critical
            
            self.logger.info("✅ Acceptance tests setup completed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            self.logger.error(f"❌ File copy failed: {e}")
            return False
        except subprocess.TimeoutExpired:
            self.logger.error("❌ Acceptance tests setup timed out")
            return False
        except Exception as e:
            self.logger.error(f"❌ Unexpected error during acceptance tests setup: {e}")
            return False

    def run_e2e_tests(self) -> Tuple[bool, Optional[Dict]]:
        """
        Execute the E2E tests using Playwright against the deployed Backstage instance.
        
        Returns:
            Tuple[bool, Optional[Dict]]: (success, test_results)
        """
        self.logger.info(f"🧪 Starting E2E test execution against {self.deployment_url}")
        
        # Set environment variables for Playwright
        env = os.environ.copy()
        env['PLAYWRIGHT_BASE_URL'] = self.deployment_url
        env['CI'] = 'true'
        
        try:
            # Create results directory
            results_dir = Path.cwd() / 'test-results'
            results_dir.mkdir(exist_ok=True)
            
            self.logger.info(f"Using acceptance tests from: {self.work_dir}")
            
            # Log the environment variable to be sure
            self.logger.info(f"Setting PLAYWRIGHT_BASE_URL to: {env.get('PLAYWRIGHT_BASE_URL')}")

            # Run Playwright tests - using direct binary to avoid npm/npx issues and ensure env vars pass
            # Run basic acceptance tests to verify Backstage functionality
            cmd = [
                './node_modules/.bin/playwright', 'test', 'basic.spec.ts',
                '-g', 'should validate Backstage deployment'
            ]
            
            self.logger.info(f"Running command: {' '.join(cmd)}")
            self.logger.info(f"Working directory: {Path.cwd()}")
            self.logger.info(f"Target URL: {self.deployment_url}")
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout
            )
            
            # Log the output for debugging
            if result.stdout:
                self.logger.info(f"Test output: {result.stdout}")
            if result.stderr:
                self.logger.warning(f"Test stderr: {result.stderr}")
            
            # Parse test results if available
            test_results = None
            results_file = results_dir / 'results.json'
            if results_file.exists():
                try:
                    with open(results_file, 'r') as f:
                        test_results = json.load(f)
                        self.logger.info("📊 Test results parsed successfully")
                except json.JSONDecodeError as e:
                    self.logger.warning(f"Could not parse test results: {e}")
            
            # Copy artifacts to mounted volume regardless of test success/failure
            self.copy_artifacts_to_volume()
            
            if result.returncode == 0:
                self.logger.info("✅ E2E tests completed successfully")
                
                # Parse test summary from stdout if results.json not available
                if result.stdout:
                    # Look for "X passed" in the output
                    import re
                    passed_match = re.search(r'(\d+)\s+passed', result.stdout)
                    failed_match = re.search(r'(\d+)\s+failed', result.stdout)
                    
                    if passed_match:
                        passes = int(passed_match.group(1))
                        failures = int(failed_match.group(1)) if failed_match else 0
                        # Override or create test_results
                        test_results = {
                            'stats': {
                                'tests': passes + failures,
                                'passes': passes,
                                'failures': failures
                            }
                        }
                        self.logger.info(f"📊 Parsed test results from output: {passes} passed, {failures} failed")
                
                # Log test summary if available
                if test_results:
                    # Playwright results structure may vary, try different formats
                    if 'suites' in test_results:
                        total_tests = sum(len(suite.get('specs', [])) for suite in test_results.get('suites', []))
                        self.logger.info(f"📈 Test Summary: {total_tests} tests executed")
                    elif 'stats' in test_results:
                        stats = test_results['stats']
                        self.logger.info(
                            f"📈 Test Summary: "
                            f"Tests: {stats.get('tests', 'N/A')}, "
                            f"Passed: {stats.get('passes', 'N/A')}, "
                            f"Failed: {stats.get('failures', 'N/A')}"
                        )
                
                return True, test_results
            else:
                self.logger.error("❌ E2E tests failed")
                self.logger.error(f"Exit code: {result.returncode}")
                
                return False, test_results
                
        except subprocess.TimeoutExpired:
            self.logger.error("❌ E2E tests timed out")
            return False, None
        except Exception as e:
            self.logger.error(f"❌ Unexpected error during test execution: {e}")
            return False, None

    def collect_kargo_artifacts(self, artifact_dir: Path) -> None:
        """
        Collect basic execution metadata (kubectl not available in container).
        """
        try:
            kargo_dir = artifact_dir / 'execution-metadata'
            kargo_dir.mkdir(exist_ok=True)
            
            self.logger.info("📋 Collecting execution metadata...")
            
            # Save environment variables and execution context
            env_file = kargo_dir / 'environment.json'
            env_data = {
                'kargo_promotion_id': os.environ.get('KARGO_PROMOTION_ID', 'unknown'),
                'kargo_freight_id': os.environ.get('KARGO_FREIGHT_ID', 'unknown'),
                'backstage_url': os.environ.get('BACKSTAGE_URL', 'unknown'),
                'playwright_browsers_path': os.environ.get('PLAYWRIGHT_BROWSERS_PATH', 'unknown'),
                'execution_time': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
                'working_directory': str(Path.cwd()),
                'hostname': os.environ.get('HOSTNAME', 'unknown')
            }
            
            with open(env_file, 'w') as f:
                json.dump(env_data, f, indent=2)
            
            self.logger.info("✅ Collected execution metadata")
                
        except Exception as e:
            self.logger.error(f"❌ Error collecting execution metadata: {e}")

    def copy_artifacts_to_volume(self) -> None:
        """
        Copy test artifacts to the mounted host volume for persistence.
        """
        artifacts_volume = Path('/artifacts')
        if not artifacts_volume.exists():
            self.logger.warning("⚠️  Artifacts volume not mounted, skipping artifact copy")
            return
        
        # Generate unique directory name with timestamp and deployment info
        timestamp = time.strftime('%Y%m%d-%H%M%S')
        deployment_id = os.environ.get('KARGO_PROMOTION_ID', 'unknown')
        freight_id = os.environ.get('KARGO_FREIGHT_ID', 'unknown')
        
        # Use shorter, cleaner identifiers for the folder name
        if deployment_id != 'unknown' and len(deployment_id) > 20:
            deployment_short = deployment_id[-12:]  # Last 12 chars
        else:
            deployment_short = deployment_id
            
        if freight_id != 'unknown' and len(freight_id) > 20:
            freight_short = freight_id[:8]  # First 8 chars
        else:
            freight_short = freight_id[:8] if freight_id != 'unknown' else 'unknown'
        
        self.logger.info(f"🔍 Debug - KARGO_PROMOTION_ID: {deployment_id}")
        self.logger.info(f"🔍 Debug - KARGO_FREIGHT_ID: {freight_id}")
        
        artifact_dir = artifacts_volume / f"backstage-e2e-{timestamp}-{deployment_short}.{freight_short}"
        artifact_dir.mkdir(parents=True, exist_ok=True)
        
        self.logger.info(f"📦 Copying artifacts to {artifact_dir}")
        
        try:
            # Copy Playwright HTML report
            html_report_dir = Path.cwd() / 'test-results' / 'html-report'
            if html_report_dir.exists():
                subprocess.run(['cp', '-r', str(html_report_dir), str(artifact_dir / 'html-report')], check=True)
                self.logger.info("✅ Copied HTML test report")
            
            # Copy Playwright artifacts with better organization
            test_artifacts_dir = Path.cwd() / 'test-results' / 'artifacts'
            if test_artifacts_dir.exists():
                # Create separate directories for different types of artifacts
                screenshots_dir = artifact_dir / 'screenshots'
                traces_dir = artifact_dir / 'traces'
                videos_dir = artifact_dir / 'videos'
                
                screenshots_dir.mkdir(exist_ok=True)
                traces_dir.mkdir(exist_ok=True)
                videos_dir.mkdir(exist_ok=True)
                
                # Organize artifacts by type
                for item in test_artifacts_dir.rglob('*'):
                    if item.is_file():
                        if item.suffix.lower() in ['.png', '.jpg', '.jpeg']:
                            # Copy screenshots
                            subprocess.run(['cp', str(item), str(screenshots_dir / item.name)], check=True)
                        elif item.suffix.lower() == '.zip' and 'trace' in item.name:
                            # Copy traces
                            subprocess.run(['cp', str(item), str(traces_dir / item.name)], check=True)
                        elif item.suffix.lower() in ['.webm', '.mp4']:
                            # Copy videos
                            subprocess.run(['cp', str(item), str(videos_dir / item.name)], check=True)
                        else:
                            # Copy other artifacts to a general folder
                            other_dir = artifact_dir / 'other-artifacts'
                            other_dir.mkdir(exist_ok=True)
                            subprocess.run(['cp', str(item), str(other_dir / item.name)], check=True)
                
                # Count what we found
                screenshot_count = len(list(screenshots_dir.glob('*')))
                trace_count = len(list(traces_dir.glob('*')))
                video_count = len(list(videos_dir.glob('*')))
                
                self.logger.info(f"✅ Organized artifacts: {screenshot_count} screenshots, {trace_count} traces, {video_count} videos")
            else:
                self.logger.warning("⚠️ No test artifacts directory found - screenshots may not have been generated")
            
            # Also copy the entire test-results directory for completeness
            test_results_complete = Path.cwd() / 'test-results'
            if test_results_complete.exists():
                subprocess.run(['cp', '-r', str(test_results_complete), str(artifact_dir / 'complete-test-results')], check=True)
                self.logger.info("✅ Copied complete test results directory")
            
            # Copy any additional test-results content
            test_results_base = Path.cwd() / 'test-results'
            if test_results_base.exists():
                # Copy all test-results content
                for item in test_results_base.iterdir():
                    if item.name not in ['html-report', 'artifacts']:  # Already copied above
                        if item.is_dir():
                            subprocess.run(['cp', '-r', str(item), str(artifact_dir / item.name)], check=True)
                        else:
                            subprocess.run(['cp', str(item), str(artifact_dir / item.name)], check=True)
                self.logger.info("✅ Copied additional test results")
            
            # List all test-results for debugging
            self.logger.info("🔍 Debug - Listing all test result files:")
            try:
                result = subprocess.run(['find', str(Path.cwd()), '-name', '*test*', '-o', '-name', '*screenshot*', '-o', '-name', '*.png', '-o', '-name', '*.jpg'], 
                                      capture_output=True, text=True, check=True)
                self.logger.info(f"📋 Found files: {result.stdout}")
            except subprocess.CalledProcessError:
                self.logger.warning("Could not list test files")
            
            # Collect Kargo-related logs and status
            self.collect_kargo_artifacts(artifact_dir)
            
            # Copy JSON test results
            json_results_dir = Path.cwd() / 'test-results'
            if json_results_dir.exists():
                subprocess.run(['cp', '-r', str(json_results_dir), str(artifact_dir / 'json-results')], check=True)
                self.logger.info("✅ Copied JSON test results")
            
            # Create a summary file with metadata
            summary_file = artifact_dir / 'test-summary.json'
            summary_data = {
                'timestamp': timestamp,
                'deployment_id': deployment_id,
                'freight_id': freight_short,
                'deployment_url': self.deployment_url,
                'test_execution_time': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
                'artifacts': {
                    'html_report': 'html-report/index.html',
                    'screenshots': 'test-results/',
                    'json_results': 'json-results/results.json'
                }
            }
            
            with open(summary_file, 'w') as f:
                json.dump(summary_data, f, indent=2)
            
            self.logger.info(f"✅ Created test summary at {summary_file}")
            self.logger.info(f"🎯 All artifacts saved to: {artifact_dir}")
            
            # Log the contents for verification
            try:
                result = subprocess.run(['find', str(artifact_dir), '-type', 'f'], 
                                      capture_output=True, text=True, check=True)
                file_count = len(result.stdout.strip().split('\n')) if result.stdout.strip() else 0
                self.logger.info(f"📊 Saved {file_count} artifact files")
            except subprocess.CalledProcessError:
                self.logger.warning("Could not count artifact files")
                
        except subprocess.CalledProcessError as e:
            self.logger.error(f"❌ Failed to copy artifacts: {e}")
        except Exception as e:
            self.logger.error(f"❌ Unexpected error copying artifacts: {e}")

    def validate_test_results(self, test_results: Optional[Dict]) -> bool:
        """
        Validate that test results meet our requirements.
        
        Args:
            test_results: Parsed test results from Playwright
            
        Returns:
            bool: True if validation passes
        """
        if not test_results:
            self.logger.warning("⚠️  No test results to validate")
            return False
        
        try:
            stats = test_results.get('stats', {})
            
            # Check that tests actually ran
            total_tests = stats.get('tests', 0)
            if total_tests == 0:
                self.logger.error("❌ No tests were executed")
                return False
            
            # Check for failures
            failures = stats.get('failures', 0)
            if failures > 0:
                self.logger.error(f"❌ {failures} test(s) failed")
                return False
            
            # Check that we have expected test coverage
            passes = stats.get('passes', 0)
            if passes < 1:  # We expect at least 1 test to pass
                self.logger.warning(f"⚠️  Only {passes} tests passed, expected at least 1")
                return False
            
            self.logger.info(f"✅ Test validation passed: {passes} tests passed, {failures} failed")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error validating test results: {e}")
            return False

    def run(self) -> bool:
        """
        Execute the complete post-deployment E2E workflow for Kargo verification.
        
        Returns:
            bool: True if all steps succeed
        """
        self.logger.info("🚀 Starting Kargo post-deployment E2E test automation")
        self.logger.info(f"Target deployment: {self.deployment_url}")
        
        try:
            # Step 1: Check deployment readiness
            if not self.check_deployment_readiness():
                self.logger.error("💥 Deployment readiness check failed. Aborting E2E tests.")
                return False
            
            # Step 2: Setup lightweight acceptance tests
            if not self.setup_acceptance_tests():
                self.logger.error("💥 Acceptance tests setup failed. Aborting E2E tests.")
                return False
            
            # Step 3: Run E2E tests
            success, test_results = self.run_e2e_tests()
            if not success:
                self.logger.error("💥 E2E test execution failed")
                return False
            
            # Step 4: Validate test results
            if not self.validate_test_results(test_results):
                self.logger.error("💥 Test result validation failed")
                return False
            
            self.logger.info("🎉 Kargo post-deployment E2E test automation completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"💥 Unexpected error in E2E automation: {e}")
            return False


def load_config(config_file: Optional[str] = None) -> Dict:
    """Load configuration from file or use defaults for Kargo environment."""
    default_config = {
        'deployment_url': 'http://backstage.backstage.svc.cluster.local:7007',
        'max_wait_time': 300,
        'health_check_interval': 10,
        'test_timeout': 600,
        'backstage_repo_url': 'https://github.com/craigedmunds/argocd-eda.git',
        'backstage_branch': 'feature/backstage-events'
    }
    
    if config_file and Path(config_file).exists():
        try:
            with open(config_file, 'r') as f:
                file_config = json.load(f)
                default_config.update(file_config)
        except Exception as e:
            logging.warning(f"Could not load config file {config_file}: {e}")
    
    return default_config


def main():
    """Main entry point for Kargo post-deployment E2E testing."""
    parser = argparse.ArgumentParser(
        description='Run post-deployment E2E tests for Backstage within Kargo verification'
    )
    parser.add_argument(
        '--url',
        default='http://backstage.backstage.svc.cluster.local:7007',
        help='Deployment URL to test against (internal Kubernetes service)'
    )
    parser.add_argument(
        '--max-wait-time',
        type=int,
        default=300,
        help='Maximum time to wait for deployment readiness (seconds)'
    )
    parser.add_argument(
        '--health-interval',
        type=int,
        default=10,
        help='Interval between health checks (seconds)'
    )
    parser.add_argument(
        '--config',
        help='Path to configuration file'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Setup logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Load configuration
    config = load_config(args.config)
    
    # Override with command line arguments
    config.update({
        'deployment_url': args.url,
        'max_wait_time': args.max_wait_time,
        'health_check_interval': args.health_interval
    })
    
    # Run the E2E automation
    automation = PostDeploymentE2E(config)
    success = automation.run()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()