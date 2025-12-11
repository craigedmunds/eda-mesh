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
                # Check if endpoint is responding
                with urllib.request.urlopen(self.deployment_url, timeout=10) as response:
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

    def setup_backstage_repo(self) -> bool:
        """
        Clone and setup the Backstage repository for E2E testing.
        
        Returns:
            bool: True if setup successful
        """
        try:
            self.logger.info(f"📦 Setting up Backstage repository in {self.work_dir}")
            
            # Clean up any existing directory
            if self.work_dir.exists():
                subprocess.run(['rm', '-rf', str(self.work_dir)], check=True)
            
            # Clone the repository
            self.logger.info(f"🔄 Cloning {self.backstage_repo_url} (branch: {self.backstage_branch})")
            subprocess.run([
                'git', 'clone', 
                '--branch', self.backstage_branch,
                '--depth', '1',
                self.backstage_repo_url,
                str(self.work_dir)
            ], check=True, capture_output=True)
            
            # Change to the Backstage app directory
            backstage_app_dir = self.work_dir / 'apps' / 'backstage'
            if not backstage_app_dir.exists():
                self.logger.error(f"❌ Backstage app directory not found: {backstage_app_dir}")
                return False
            
            os.chdir(backstage_app_dir)
            self.logger.info(f"📁 Changed to directory: {backstage_app_dir}")
            
            # Install dependencies
            self.logger.info("📦 Installing dependencies...")
            result = subprocess.run(['yarn', 'install'], capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                self.logger.error(f"❌ Failed to install dependencies: {result.stderr}")
                return False
            
            # Install Playwright browsers
            self.logger.info("🎭 Installing Playwright browsers...")
            result = subprocess.run(['npx', 'playwright', 'install'], capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                self.logger.warning(f"⚠️  Playwright install warning: {result.stderr}")
                # Continue anyway as this might not be critical
            
            self.logger.info("✅ Repository setup completed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            self.logger.error(f"❌ Git clone failed: {e}")
            return False
        except subprocess.TimeoutExpired:
            self.logger.error("❌ Repository setup timed out")
            return False
        except Exception as e:
            self.logger.error(f"❌ Unexpected error during repository setup: {e}")
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
            
            # Run Playwright tests - focus on image-factory E2E tests for now
            cmd = [
                'npx', 'playwright', 'test',
                'plugins/image-factory/e2e-tests/simple-navigation.test.ts',
                'tests/acceptance/events.spec.ts',
                '--reporter=line',
                '--reporter=json:test-results/results.json'
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
        app_version = os.environ.get('KARGO_FREIGHT_ID', 'unknown')[:8]  # Short version
        
        artifact_dir = artifacts_volume / f"backstage-e2e-{timestamp}-{deployment_id}-{app_version}"
        artifact_dir.mkdir(parents=True, exist_ok=True)
        
        self.logger.info(f"📦 Copying artifacts to {artifact_dir}")
        
        try:
            # Copy Playwright HTML report
            html_report_dir = Path.cwd() / 'e2e-test-report'
            if html_report_dir.exists():
                subprocess.run(['cp', '-r', str(html_report_dir), str(artifact_dir / 'html-report')], check=True)
                self.logger.info("✅ Copied HTML test report")
            
            # Copy Playwright screenshots and traces
            test_results_dir = Path.cwd() / 'node_modules' / '.cache' / 'e2e-test-results'
            if test_results_dir.exists():
                subprocess.run(['cp', '-r', str(test_results_dir), str(artifact_dir / 'test-results')], check=True)
                self.logger.info("✅ Copied screenshots and traces")
            
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
                'app_version': app_version,
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
            if passes < 2:  # We expect at least 2 tests (app.test.ts and events.spec.ts)
                self.logger.warning(f"⚠️  Only {passes} tests passed, expected at least 2")
            
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
            
            # Step 2: Setup Backstage repository for testing
            if not self.setup_backstage_repo():
                self.logger.error("💥 Repository setup failed. Aborting E2E tests.")
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