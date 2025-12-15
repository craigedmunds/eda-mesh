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
        self.test_filter = config.get('test_filter')  # Test filtering
        self.grep_pattern = config.get('grep_pattern')  # Playwright grep pattern
        self.extra_playwright_args = config.get('extra_playwright_args', [])  # Additional Playwright arguments
        # Since we're running in a container, we need to clone/access the Backstage repo
        self.work_dir = Path('/tmp/backstage-acceptance')
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
        Setup unified test execution using single Playwright installation.
        Copies plugin tests to central location to avoid conflicts.
        
        Returns:
            bool: True if setup successful
        """
        try:
            self.logger.info(f"📦 Setting up unified test execution with single Playwright installation")
            
            # Use the existing working test directory directly
            central_tests_source = Path('/workspace/apps/backstage/tests/acceptance')
            
            # Check if we're running locally with custom paths
            local_acceptance_tests = os.environ.get('ACCEPTANCE_TESTS_PATH')
            if local_acceptance_tests and Path(local_acceptance_tests).exists():
                # Local development mode
                test_dir = Path(local_acceptance_tests)
                plugins_base = test_dir.parent.parent / 'plugins'
                self.logger.info(f"Using local acceptance tests from: {test_dir}")
            elif central_tests_source.exists():
                # Container mode - use the mounted tests directly
                test_dir = central_tests_source
                plugins_base = Path('/workspace/apps/backstage/plugins')
                self.logger.info(f"Using mounted acceptance tests from: {test_dir}")
            else:
                self.logger.error("❌ No acceptance tests found")
                return False
            
            # Create a writable working directory that preserves the original structure
            work_dir = Path('/tmp/unified-tests')
            work_dir.mkdir(exist_ok=True)
            
            # Recreate the original directory structure: apps/backstage/
            apps_dir = work_dir / 'apps' / 'backstage'
            apps_dir.mkdir(parents=True, exist_ok=True)
            
            # Copy the entire central test directory to preserve structure
            unified_test_dir = apps_dir / 'tests' / 'acceptance'
            if unified_test_dir.exists():
                shutil.rmtree(unified_test_dir)
            shutil.copytree(test_dir, unified_test_dir)
            
            # Ensure custom reporter and teardown files are available
            custom_files = [
                # 'artifact-organizer-reporter.ts',
                # 'global-teardown.helper.ts',
                'playwright.config.ts',
                'package.json',
                'tsconfig.json'
            ]
            
            self.logger.info(f"🔍 Looking for custom files in: {test_dir}")
            self.logger.info(f"🔍 Contents of test_dir: {list(test_dir.iterdir()) if test_dir.exists() else 'Directory does not exist'}")
            
            for custom_file in custom_files:
                source_file = test_dir / custom_file
                target_file = unified_test_dir / custom_file
                
                self.logger.info(f"🔍 Checking for {custom_file} at: {source_file}")
                if source_file.exists():
                    shutil.copy2(source_file, target_file)
                    self.logger.info(f"✅ Copied custom file: {custom_file}")
                    
                    # Special logging for playwright.config.ts to verify reporter configuration
                    if custom_file == 'playwright.config.ts':
                        try:
                            with open(target_file, 'r') as f:
                                config_content = f.read()
                                if 'artifact-organizer-reporter' in config_content:
                                    self.logger.info(f"✅ Playwright config includes custom artifact organizer reporter")
                                else:
                                    self.logger.warning(f"⚠️  Playwright config does not include artifact organizer reporter")
                        except Exception as e:
                            self.logger.warning(f"⚠️  Could not verify playwright config content: {e}")
                else:
                    self.logger.warning(f"❌ Custom file not found: {custom_file} at {source_file}")
            
            # Change to the central acceptance tests directory for npm install and test execution
            os.chdir(unified_test_dir)
            self.logger.info(f"Changed working directory to: {unified_test_dir}")
            self.logger.info(f"Plugin tests can now import from: ../../../../tests/acceptance/lib/auth-helper")
            self.logger.info(f"This resolves to: {unified_test_dir / 'lib' / 'auth-helper.ts'}")
            
            # Install dependencies in the acceptance tests directory
            self.logger.info("📦 Installing test dependencies...")
            result = subprocess.run(['npm', 'install'], capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                self.logger.error(f"❌ Failed to install test dependencies: {result.stderr}")
                return False
            self.logger.info("✅ Test dependencies installed")
            
            # Verify that custom files are in place
            self.logger.info("🔍 Verifying custom files in unified test directory:")
            for custom_file in custom_files:
                target_file = unified_test_dir / custom_file
                if target_file.exists():
                    self.logger.info(f"  ✅ {custom_file} is present")
                else:
                    self.logger.warning(f"  ❌ {custom_file} is missing")
            
            # Discover central test files
            central_test_files = list(unified_test_dir.glob('*.spec.ts')) + list(unified_test_dir.glob('*.test.ts'))
            self.logger.info(f"✅ Found {len(central_test_files)} central test files: {[f.name for f in central_test_files]}")
            
            # Discover and copy plugin test files to avoid Playwright conflicts
            plugin_test_files = []
            if plugins_base.exists():
                plugin_test_patterns = [
                    '*/tests/acceptance/**/*.spec.ts',
                    '*/tests/acceptance/**/*.test.ts'
                ]
                
                # Create the plugins directory structure to preserve import paths
                plugins_dir = apps_dir / 'plugins'
                plugins_dir.mkdir(exist_ok=True)
                
                for pattern in plugin_test_patterns:
                    found_files = list(plugins_base.glob(pattern))
                    for plugin_file in found_files:
                        # Extract plugin name from path (e.g., 'eda' from 'eda/tests/acceptance/events.spec.ts')
                        plugin_name = plugin_file.parts[-4]
                        
                        # Recreate the full plugin directory structure
                        plugin_test_dir = plugins_dir / plugin_name / 'tests' / 'acceptance'
                        plugin_test_dir.mkdir(parents=True, exist_ok=True)
                        
                        # Copy test file to preserve original structure
                        dest_file = plugin_test_dir / plugin_file.name
                        shutil.copy2(plugin_file, dest_file)
                        plugin_test_files.append(dest_file)
                        
                        self.logger.info(f"  📋 Copied {plugin_name}/{plugin_file.name} to preserve structure")
                
                if plugin_test_files:
                    self.logger.info(f"✅ Copied {len(plugin_test_files)} plugin test files to unified location")
                    
                    # Create symlinks to node_modules for each plugin so they can find @playwright/test
                    central_node_modules = unified_test_dir / 'node_modules'
                    if central_node_modules.exists():
                        for pattern in plugin_test_patterns:
                            found_files = list(plugins_base.glob(pattern))
                            processed_plugins = set()
                            
                            for plugin_file in found_files:
                                plugin_name = plugin_file.parts[-4]
                                if plugin_name not in processed_plugins:
                                    processed_plugins.add(plugin_name)
                                    
                                    plugin_test_dir = plugins_dir / plugin_name / 'tests' / 'acceptance'
                                    plugin_node_modules = plugin_test_dir / 'node_modules'
                                    
                                    if not plugin_node_modules.exists():
                                        try:
                                            plugin_node_modules.symlink_to(central_node_modules, target_is_directory=True)
                                            self.logger.info(f"  🔗 Created node_modules symlink for {plugin_name}")
                                        except Exception as e:
                                            self.logger.warning(f"  ⚠️  Could not create node_modules symlink for {plugin_name}: {e}")
                else:
                    self.logger.info("ℹ️  No plugin test files found")
            
            total_test_files = central_test_files + plugin_test_files
            if not total_test_files:
                self.logger.error("❌ No test files found")
                return False
            
            self.logger.info(f"✅ Total test files available: {len(total_test_files)} (using single Playwright installation)")
            self.logger.info("✅ Test setup completed successfully with preserved directory structure")
            
            # Debug: Show the actual directory structure
            self.logger.info("🔍 Actual directory structure created:")
            try:
                result = subprocess.run(['find', str(work_dir), '-type', 'f', '-name', '*.ts'], 
                                      capture_output=True, text=True, check=True)
                files = result.stdout.strip().split('\n') if result.stdout.strip() else []
                for file in files[:10]:  # Show first 10 files
                    self.logger.info(f"  📄 {file}")
                if len(files) > 10:
                    self.logger.info(f"  ... and {len(files) - 10} more files")
            except subprocess.CalledProcessError:
                self.logger.warning("Could not list directory structure")
            
            # Debug: Check if auth-helper exists where expected
            auth_helper_path = unified_test_dir / 'lib' / 'auth-helper.ts'
            self.logger.info(f"🔍 Auth helper expected at: {auth_helper_path}")
            self.logger.info(f"🔍 Auth helper exists: {auth_helper_path.exists()}")
            
            # Debug: Show what the plugin test import should resolve to
            if plugin_test_files:
                sample_plugin_test = plugin_test_files[0]
                self.logger.info(f"🔍 Sample plugin test: {sample_plugin_test}")
                plugin_dir = sample_plugin_test.parent
                expected_lib_path = plugin_dir / '..' / '..' / '..' / '..' / 'tests' / 'acceptance' / 'lib' / 'auth-helper.ts'
                resolved_path = expected_lib_path.resolve()
                self.logger.info(f"🔍 Plugin import ../../tests/acceptance/lib/auth-helper should resolve to: {resolved_path}")
                self.logger.info(f"🔍 Resolved path exists: {resolved_path.exists()}")
                
            # Debug: Show current working directory
            self.logger.info(f"🔍 Current working directory: {Path.cwd()}")
            self.logger.info(f"🔍 Working directory contents: {list(Path.cwd().iterdir())}")
            
            return True
            
        except subprocess.CalledProcessError as e:
            self.logger.error(f"❌ Test setup failed: {e}")
            return False
        except subprocess.TimeoutExpired:
            self.logger.error("❌ Test setup timed out")
            return False
        except Exception as e:
            self.logger.error(f"❌ Unexpected error during test setup: {e}")
            return False

    def create_fallback_config(self) -> None:
        """Create fallback configuration if mounted config is not available."""
        self.logger.info("📝 Creating fallback test configuration...")
        
        # Create minimal package.json
        package_json = {
            "name": "backstage-unified-tests",
            "version": "1.0.0",
            "private": True,
            "scripts": {
                "test": "playwright test"
            },
            "dependencies": {
                "@playwright/test": "1.40.0"
            }
        }
        
        with open(self.work_dir / 'package.json', 'w') as f:
            json.dump(package_json, f, indent=2)
        
        # Create minimal playwright.config.ts
        playwright_config = '''import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/backstage',
  testMatch: [
    'tests/acceptance/**/*.spec.ts',
    'plugins/**/tests/acceptance/**/*.spec.ts'
  ],
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.BACKSTAGE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  outputDir: 'test-results/artifacts',
});'''
        
        with open(self.work_dir / 'playwright.config.ts', 'w') as f:
            f.write(playwright_config)

    def run_e2e_tests(self) -> Tuple[bool, Optional[Dict]]:
        """
        Execute E2E tests using the original working Playwright configuration.
        
        Returns:
            Tuple[bool, Optional[Dict]]: (success, test_results)
        """
        self.logger.info(f"🧪 Starting E2E test execution against {self.deployment_url}")
        
        # Set environment variables for Playwright
        env = os.environ.copy()
        env['PLAYWRIGHT_BASE_URL'] = self.deployment_url
        env['BACKSTAGE_URL'] = self.deployment_url  # Fallback for older configs
        env['CI'] = 'true'
        
        # Add traceability information for test reports
        env['KARGO_PROMOTION_ID'] = os.environ.get('KARGO_PROMOTION_ID', 'local-test')
        env['KARGO_FREIGHT_ID'] = os.environ.get('KARGO_FREIGHT_ID', 'unknown')
        env['TEST_EXECUTION_TIMESTAMP'] = time.strftime('%Y-%m-%d_%H-%M-%S')
        env['DEPLOYMENT_URL'] = self.deployment_url
        
        # Generate unique test run ID
        test_run_id = f"{env['KARGO_PROMOTION_ID']}-{env['TEST_EXECUTION_TIMESTAMP']}"
        env['TEST_RUN_ID'] = test_run_id
        
        # Set up direct output to mounted artifact directory
        artifacts_volume = Path('/artifacts')
        if artifacts_volume.exists():
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
            
            artifact_dir = artifacts_volume / f"backstage-e2e-{timestamp}"
            artifact_dir.mkdir(parents=True, exist_ok=True)
            
            # Configure centralized environment variables for artifact storage
            env['TEST_RESULTS_DIR'] = str(artifact_dir)
            env['PLAYWRIGHT_HTML_REPORT_DIR'] = str(artifact_dir / 'reports' / 'html')
            
            # Centralized artifact directory environment variables
            env['PLAYWRIGHT_ARTIFACTS_DIR'] = str(artifact_dir)
            env['PLAYWRIGHT_SCREENSHOTS_DIR'] = str(artifact_dir / 'screenshots')
            env['PLAYWRIGHT_VIDEOS_DIR'] = str(artifact_dir / 'videos')
            env['PLAYWRIGHT_TRACES_DIR'] = str(artifact_dir / 'traces')
            env['PLAYWRIGHT_HTML_REPORT_DIR'] = str(artifact_dir / 'html-report')
            
            self.logger.info(f"🎯 Tests will write directly to: {artifact_dir}")
            self.logger.info(f"📁 Centralized artifact directories configured:")
            self.logger.info(f"   Screenshots: {env['PLAYWRIGHT_SCREENSHOTS_DIR']}")
            self.logger.info(f"   Videos: {env['PLAYWRIGHT_VIDEOS_DIR']}")
            self.logger.info(f"   Traces: {env['PLAYWRIGHT_TRACES_DIR']}")
            self.logger.info(f"   HTML Report: {env['PLAYWRIGHT_HTML_REPORT_DIR']}")
            self.logger.info(f"   Test Run ID: {env['TEST_RUN_ID']}")
            self.logger.info("ℹ️  Plugin tests should use these environment variables for consistent artifact storage")
        else:
            # Fallback to /tmp if no artifacts volume
            base_dir = Path('/tmp/test-results')
            env['TEST_RESULTS_DIR'] = str(base_dir)
            env['PLAYWRIGHT_ARTIFACTS_DIR'] = str(base_dir)
            env['PLAYWRIGHT_SCREENSHOTS_DIR'] = str(base_dir / 'artifacts')
            env['PLAYWRIGHT_VIDEOS_DIR'] = str(base_dir / 'artifacts')
            env['PLAYWRIGHT_TRACES_DIR'] = str(base_dir / 'artifacts')
            env['PLAYWRIGHT_HTML_REPORT_DIR'] = str(base_dir / 'html-report')
            self.logger.warning("⚠️  No artifacts volume mounted, using /tmp")
        
        try:
            self.logger.info(f"Working directory: {Path.cwd()}")
            self.logger.info(f"Setting PLAYWRIGHT_BASE_URL to: {env.get('PLAYWRIGHT_BASE_URL')}")
            self.logger.info(f"Test results directory: {env.get('TEST_RESULTS_DIR')}")
            self.logger.info(f"Target URL: {self.deployment_url}")
            
            # Log the test files for debugging
            self.logger.info("🔍 Available test files:")
            try:
                test_files = list(Path.cwd().glob('*.spec.ts'))
                for test_file in test_files:
                    self.logger.info(f"  - {test_file.name}")
            except Exception as e:
                self.logger.warning(f"Could not list test files: {e}")
            
            # Run Playwright tests using the local npm script (which uses locally installed Playwright)
            cmd = ['npm', 'run', 'test']
            
            # Add test filtering and extra arguments if specified
            if self.test_filter or self.grep_pattern or self.extra_playwright_args:
                cmd.append('--')  # Separator for npm run arguments
                
                if self.test_filter:
                    # Map filter names to test patterns
                    filter_patterns = {
                        'image-factory': 'image-factory',
                        'eda': 'eda',
                        'enrollment': 'enrollment',
                        'navigation': 'navigation',
                        'catalog': 'catalog',
                        'registry': 'registry',
                        'pipeline': 'pipeline'
                    }
                    
                    if self.test_filter in filter_patterns:
                        pattern = filter_patterns[self.test_filter]
                        self.logger.info(f"🎯 Filtering tests with pattern: {pattern}")
                        cmd.extend(['--grep', pattern])
                    else:
                        # Use the filter as a direct pattern
                        self.logger.info(f"🎯 Filtering tests with custom pattern: {self.test_filter}")
                        cmd.extend(['--grep', self.test_filter])
                
                if self.grep_pattern:
                    self.logger.info(f"🔍 Using grep pattern: {self.grep_pattern}")
                    cmd.extend(['--grep', self.grep_pattern])
                
                # Add any extra Playwright arguments
                if self.extra_playwright_args:
                    self.logger.info(f"🔧 Adding extra Playwright arguments: {' '.join(self.extra_playwright_args)}")
                    cmd.extend(self.extra_playwright_args)
            
            self.logger.info(f"Running test command: {' '.join(cmd)}")
            
            # Run with real-time output streaming
            self.logger.info("🚀 Starting Playwright test execution with real-time output...")
            
            process = subprocess.Popen(
                cmd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1  # Line buffered
            )
            
            # Stream output in real-time
            while True:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    # Print directly to stdout for real-time visibility
                    print(output.strip())
            
            # Wait for process to complete and get return code
            return_code = process.wait()
            
            self.logger.info(f"Test command completed with exit code: {return_code}")
            
            # Create a mock result object for compatibility
            class MockResult:
                def __init__(self, returncode):
                    self.returncode = returncode
            
            result = MockResult(return_code)
            
            # Parse test results if available
            test_results = None
            results_file = Path(env.get('TEST_RESULTS_DIR', '/tmp/test-results')) / 'results.json'
            if results_file.exists():
                try:
                    with open(results_file, 'r') as f:
                        test_results = json.load(f)
                        self.logger.info("📊 Test results parsed successfully")
                except json.JSONDecodeError as e:
                    self.logger.warning(f"Could not parse test results: {e}")
            
            # Always create a summary file with metadata, regardless of test success/failure
            if env.get('TEST_RESULTS_DIR'):
                artifact_dir = Path(env['TEST_RESULTS_DIR'])
                self.create_test_summary(artifact_dir, test_results)
                self.collect_kargo_artifacts(artifact_dir)
            
            # Always log test summary if available, regardless of success/failure
            if test_results:
                stats = test_results.get('stats', {})
                if stats:
                    expected = stats.get('expected', 0)
                    unexpected = stats.get('unexpected', 0)
                    skipped = stats.get('skipped', 0)
                    total_tests = expected + unexpected + skipped
                    
                    self.logger.info(
                        f"📈 Test Summary: "
                        f"Total: {total_tests}, "
                        f"Passed: {expected}, "
                        f"Failed: {unexpected}, "
                        f"Skipped: {skipped}"
                    )
                else:
                    # Fallback: count tests from suites
                    total_tests = 0
                    for suite in test_results.get('suites', []):
                        for nested_suite in suite.get('suites', []):
                            total_tests += len(nested_suite.get('specs', []))
                    self.logger.info(f"📈 Test Summary: {total_tests} tests executed")
            else:
                self.logger.warning("⚠️  No test results available for summary")
            
            if result.returncode == 0:
                self.logger.info("✅ E2E tests completed successfully")
                return True, test_results
            else:
                self.logger.error("❌ E2E tests failed")
                self.logger.error(f"Exit code: {result.returncode}")
                
                # Still return test results even on failure for debugging
                return False, test_results
                
        except subprocess.TimeoutExpired:
            self.logger.error("❌ E2E tests timed out")
            return False, None
        except Exception as e:
            self.logger.error(f"❌ Unexpected error during test execution: {e}")
            return False, None

    def collect_kargo_artifacts(self, artifact_dir: Path) -> None:
        """
        Collect comprehensive execution metadata for traceability.
        """
        try:
            kargo_dir = artifact_dir / 'execution-metadata'
            kargo_dir.mkdir(exist_ok=True)
            
            self.logger.info("📋 Collecting execution metadata...")
            
            # Save environment variables and execution context
            env_file = kargo_dir / 'environment.json'
            env_data = {
                # Kargo-specific metadata
                'kargo_promotion_id': os.environ.get('KARGO_PROMOTION_ID', 'unknown'),
                'kargo_freight_id': os.environ.get('KARGO_FREIGHT_ID', 'unknown'),
                
                # Deployment metadata
                'backstage_url': os.environ.get('BACKSTAGE_URL', 'unknown'),
                'playwright_base_url': os.environ.get('PLAYWRIGHT_BASE_URL', 'unknown'),
                'deployment_url': self.deployment_url,
                
                # Execution environment
                'playwright_browsers_path': os.environ.get('PLAYWRIGHT_BROWSERS_PATH', 'unknown'),
                'test_results_dir': os.environ.get('TEST_RESULTS_DIR', 'unknown'),
                'execution_time': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
                'working_directory': str(Path.cwd()),
                'hostname': os.environ.get('HOSTNAME', 'unknown'),
                
                # Test configuration
                'ci_environment': os.environ.get('CI', 'false'),
                'max_wait_time': self.max_wait_time,
                'health_check_interval': self.health_check_interval
            }
            
            with open(env_file, 'w') as f:
                json.dump(env_data, f, indent=2)
            
            # Create a traceability manifest
            manifest_file = kargo_dir / 'traceability-manifest.json'
            manifest_data = {
                'test_execution_id': f"{os.environ.get('KARGO_PROMOTION_ID', 'local')}-{time.strftime('%Y%m%d-%H%M%S')}",
                'kargo_promotion_id': os.environ.get('KARGO_PROMOTION_ID', 'unknown'),
                'kargo_freight_id': os.environ.get('KARGO_FREIGHT_ID', 'unknown'),
                'deployment_target': self.deployment_url,
                'test_discovery_patterns': [
                    'plugins/eda/*.spec.ts'  # Currently focused on EDA tests for speed
                    # Future patterns:
                    # 'tests/acceptance/**/*.spec.ts',
                    # 'tests/acceptance/**/*.test.ts',
                    # 'plugins/*/tests/acceptance/**/*.spec.ts',
                    # 'plugins/*/tests/acceptance/**/*.test.ts'
                ],
                'centralized_environment_variables': {
                    'PLAYWRIGHT_ARTIFACTS_DIR': env_data.get('test_results_dir', 'unknown'),
                    'PLAYWRIGHT_SCREENSHOTS_DIR': os.environ.get('PLAYWRIGHT_SCREENSHOTS_DIR', 'unknown'),
                    'PLAYWRIGHT_VIDEOS_DIR': os.environ.get('PLAYWRIGHT_VIDEOS_DIR', 'unknown'),
                    'PLAYWRIGHT_TRACES_DIR': os.environ.get('PLAYWRIGHT_TRACES_DIR', 'unknown'),
                    'PLAYWRIGHT_HTML_REPORT_DIR': os.environ.get('PLAYWRIGHT_HTML_REPORT_DIR', 'unknown'),
                    'TEST_RUN_ID': os.environ.get('TEST_RUN_ID', 'unknown')
                },
                'artifact_locations': {
                    'html_report': 'reports/html/index.html',
                    'junit_xml': 'results.xml',
                    'json_results': 'results.json',
                    'execution_metadata': 'execution-metadata/',
                    'test_artifacts': 'artifacts/'
                }
            }
            
            with open(manifest_file, 'w') as f:
                json.dump(manifest_data, f, indent=2)
            
            self.logger.info("✅ Collected comprehensive execution metadata and traceability manifest")
                
        except Exception as e:
            self.logger.error(f"❌ Error collecting execution metadata: {e}")

    def create_test_summary(self, artifact_dir: Path, test_results: Optional[Dict]) -> None:
        """
        Create a comprehensive test summary file with traceability metadata.
        """
        try:
            timestamp = time.strftime('%Y%m%d-%H%M%S')
            deployment_id = os.environ.get('KARGO_PROMOTION_ID', 'unknown')
            freight_id = os.environ.get('KARGO_FREIGHT_ID', 'unknown')
            
            # Extract test statistics for traceability
            test_stats = {}
            if test_results and 'stats' in test_results:
                stats = test_results['stats']
                test_stats = {
                    'total_tests': stats.get('expected', 0) + stats.get('unexpected', 0) + stats.get('skipped', 0),
                    'passed': stats.get('expected', 0),
                    'failed': stats.get('unexpected', 0),
                    'skipped': stats.get('skipped', 0),
                    'flaky': stats.get('flaky', 0)
                }
            
            # Collect test file information for traceability
            test_files_info = []
            if test_results and 'suites' in test_results:
                for suite in test_results['suites']:
                    if 'file' in suite:
                        test_files_info.append({
                            'file': suite['file'],
                            'title': suite.get('title', 'Unknown'),
                            'tests': len(suite.get('specs', []))
                        })
            
            summary_file = artifact_dir / 'test-summary.json'
            summary_data = {
                # Execution metadata
                'execution_metadata': {
                    'timestamp': timestamp,
                    'deployment_id': deployment_id,
                    'freight_id': freight_id,
                    'deployment_url': self.deployment_url,
                    'test_execution_time': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
                    'hostname': os.environ.get('HOSTNAME', 'unknown'),
                    'working_directory': str(Path.cwd())
                },
                
                # Test execution summary
                'test_summary': test_stats,
                
                # Test file traceability
                'test_files': test_files_info,
                
                # Artifact locations
                'artifacts': {
                    'html_report': 'reports/html/index.html',
                    'junit_xml': 'results.xml',
                    'json_results': 'results.json',
                    'screenshots': 'artifacts/',
                    'videos': 'artifacts/',
                    'traces': 'artifacts/'
                },
                
                # Full test results for debugging
                'detailed_results': test_results
            }
            
            with open(summary_file, 'w') as f:
                json.dump(summary_data, f, indent=2)
            
            self.logger.info(f"✅ Created test summary at {summary_file}")
            self.logger.info(f"🎯 All test artifacts written directly to: {artifact_dir}")
            
            # Log the contents for verification
            try:
                result = subprocess.run(['find', str(artifact_dir), '-type', 'f'], 
                                      capture_output=True, text=True, check=True)
                files = result.stdout.strip().split('\n') if result.stdout.strip() else []
                file_count = len(files)
                self.logger.info(f"📊 Generated {file_count} artifact files")
                self.logger.debug(files)
            except subprocess.CalledProcessError:
                self.logger.warning("Could not count artifact files")
                
        except Exception as e:
            self.logger.error(f"❌ Error creating test summary: {e}")

    def validate_test_results(self, test_results: Optional[Dict]) -> bool:
        """
        Validate that test results meet our requirements.
        For debugging purposes, we're more lenient - we just need tests to run.
        
        Args:
            test_results: Parsed test results from Playwright
            
        Returns:
            bool: True if validation passes (tests ran, regardless of pass/fail)
        """
        if not test_results:
            self.logger.warning("⚠️  No test results to validate")
            return False
        
        try:
            stats = test_results.get('stats', {})
            
            # Playwright uses different field names than expected
            # expected = passed tests, unexpected = failed tests, skipped = skipped tests
            expected = stats.get('expected', 0)  # passed tests
            unexpected = stats.get('unexpected', 0)  # failed tests  
            skipped = stats.get('skipped', 0)  # skipped tests
            flaky = stats.get('flaky', 0)  # flaky tests
            
            total_tests = expected + unexpected + skipped
            
            # Check that tests actually ran
            if total_tests == 0:
                self.logger.error("❌ No tests were executed")
                return False
            
            # For debugging purposes, we consider it successful if tests ran
            # (even if some failed) - the important thing is the unified system works
            if unexpected > 0:
                self.logger.warning(f"⚠️  {unexpected} test(s) failed, but unified test system is working")
            
            if expected > 0:
                self.logger.info(f"✅ {expected} test(s) passed")
            
            self.logger.info(f"✅ Test execution validation passed: {total_tests} tests ran ({expected} passed, {unexpected} failed, {skipped} skipped)")
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
    parser.add_argument(
        '--filter', '-f',
        help='Filter tests to run (e.g., "image-factory", "eda", "enrollment", "navigation")'
    )
    parser.add_argument(
        '--grep',
        help='Run tests matching this pattern (passed to Playwright --grep)'
    )
    
    # Parse known args and capture any additional arguments for Playwright
    args, extra_args = parser.parse_known_args()
    
    # Setup logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Load configuration
    config = load_config(args.config)
    
    # Override with command line arguments
    config.update({
        'deployment_url': args.url,
        'max_wait_time': args.max_wait_time,
        'health_check_interval': args.health_interval,
        'test_filter': args.filter,
        'grep_pattern': args.grep,
        'extra_playwright_args': extra_args
    })
    
    # Run the E2E automation
    automation = PostDeploymentE2E(config)
    success = automation.run()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()