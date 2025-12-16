#!/usr/bin/env python3
"""
Tests for the post-deployment E2E script.
"""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the scripts directory to the path so we can import our module
sys.path.insert(0, str(Path(__file__).parent))

from post_deployment_e2e import PostDeploymentE2E, load_config


class TestPostDeploymentE2E(unittest.TestCase):
    """Test cases for PostDeploymentE2E class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.config = {
            'deployment_url': 'https://test.example.com',
            'max_wait_time': 60,
            'health_check_interval': 5
        }
        self.e2e = PostDeploymentE2E(self.config)
    
    def test_init(self):
        """Test initialization of PostDeploymentE2E."""
        self.assertEqual(self.e2e.deployment_url, 'https://test.example.com')
        self.assertEqual(self.e2e.max_wait_time, 60)
        self.assertEqual(self.e2e.health_check_interval, 5)
    
    @patch('urllib.request.urlopen')
    def test_check_deployment_readiness_success(self, mock_urlopen):
        """Test successful deployment readiness check."""
        # Mock successful HTTP response with Backstage content
        mock_response = Mock()
        mock_response.status = 200
        mock_response.read.return_value = b'<html><title>EDA Backstage App</title></html>'
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = self.e2e.check_deployment_readiness()
        self.assertTrue(result)
    
    @patch('urllib.request.urlopen')
    def test_check_deployment_readiness_no_backstage_content(self, mock_urlopen):
        """Test deployment readiness check with no Backstage content."""
        # Mock HTTP response without Backstage content
        mock_response = Mock()
        mock_response.status = 200
        mock_response.read.return_value = b'<html><title>Other App</title></html>'
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        # Should retry and eventually fail
        self.e2e.max_wait_time = 10  # Short timeout for test
        self.e2e.health_check_interval = 2
        
        result = self.e2e.check_deployment_readiness()
        self.assertFalse(result)
    
    @patch('urllib.request.urlopen')
    @patch('time.sleep')  # Mock sleep to speed up test
    def test_check_deployment_readiness_connection_error(self, mock_sleep, mock_urlopen):
        """Test deployment readiness check with connection error."""
        # Mock connection error
        from urllib.error import URLError
        mock_urlopen.side_effect = URLError("Connection refused")
        
        self.e2e.max_wait_time = 10  # Short timeout for test
        self.e2e.health_check_interval = 2
        
        result = self.e2e.check_deployment_readiness()
        self.assertFalse(result)
    
    def test_validate_test_results_success(self):
        """Test successful test result validation."""
        test_results = {
            'stats': {
                'tests': 5,
                'passes': 5,
                'failures': 0,
                'duration': 30000
            }
        }
        
        result = self.e2e.validate_test_results(test_results)
        self.assertTrue(result)
    
    def test_validate_test_results_with_failures(self):
        """Test test result validation with failures."""
        test_results = {
            'stats': {
                'tests': 5,
                'passes': 3,
                'failures': 2,
                'duration': 30000
            }
        }
        
        result = self.e2e.validate_test_results(test_results)
        self.assertFalse(result)
    
    def test_validate_test_results_no_tests(self):
        """Test test result validation with no tests."""
        test_results = {
            'stats': {
                'tests': 0,
                'passes': 0,
                'failures': 0,
                'duration': 0
            }
        }
        
        result = self.e2e.validate_test_results(test_results)
        self.assertFalse(result)
    
    def test_validate_test_results_none(self):
        """Test test result validation with None results."""
        result = self.e2e.validate_test_results(None)
        self.assertFalse(result)
    
    @patch('subprocess.run')
    @patch('os.chdir')
    def test_run_e2e_tests_success(self, mock_chdir, mock_subprocess):
        """Test successful E2E test execution."""
        # Mock successful subprocess run
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "Tests passed"
        mock_result.stderr = ""
        mock_subprocess.return_value = mock_result
        
        # Create a temporary results file
        with tempfile.TemporaryDirectory() as temp_dir:
            results_dir = Path(temp_dir) / 'test-results'
            results_dir.mkdir()
            results_file = results_dir / 'results.json'
            
            test_results = {
                'stats': {
                    'tests': 3,
                    'passes': 3,
                    'failures': 0,
                    'duration': 15000
                }
            }
            
            with open(results_file, 'w') as f:
                json.dump(test_results, f)
            
            # Mock the backstage_dir to point to our temp directory
            self.e2e.backstage_dir = Path(temp_dir)
            
            success, results = self.e2e.run_e2e_tests()
            
            self.assertTrue(success)
            self.assertIsNotNone(results)
            self.assertEqual(results['stats']['tests'], 3)
    
    @patch('subprocess.run')
    @patch('os.chdir')
    def test_run_e2e_tests_failure(self, mock_chdir, mock_subprocess):
        """Test failed E2E test execution."""
        # Mock failed subprocess run
        mock_result = Mock()
        mock_result.returncode = 1
        mock_result.stdout = "Tests failed"
        mock_result.stderr = "Error details"
        mock_subprocess.return_value = mock_result
        
        success, results = self.e2e.run_e2e_tests()
        
        self.assertFalse(success)


class TestLoadConfig(unittest.TestCase):
    """Test cases for load_config function."""
    
    def test_load_config_defaults(self):
        """Test loading default configuration."""
        config = load_config()
        
        self.assertEqual(config['deployment_url'], 'https://backstage.127.0.0.1.nip.io')
        self.assertEqual(config['max_wait_time'], 300)
        self.assertEqual(config['health_check_interval'], 10)
    
    def test_load_config_from_file(self):
        """Test loading configuration from file."""
        test_config = {
            'deployment_url': 'https://custom.example.com',
            'max_wait_time': 600,
            'custom_setting': 'test_value'
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(test_config, f)
            config_file = f.name
        
        try:
            config = load_config(config_file)
            
            # Should merge with defaults
            self.assertEqual(config['deployment_url'], 'https://custom.example.com')
            self.assertEqual(config['max_wait_time'], 600)
            self.assertEqual(config['health_check_interval'], 10)  # Default
            self.assertEqual(config['custom_setting'], 'test_value')
        finally:
            os.unlink(config_file)
    
    def test_load_config_nonexistent_file(self):
        """Test loading configuration from nonexistent file."""
        config = load_config('/nonexistent/file.json')
        
        # Should return defaults
        self.assertEqual(config['deployment_url'], 'https://backstage.127.0.0.1.nip.io')


class TestE2EExecutionProperty(unittest.TestCase):
    """
    Property-based test for E2E test execution.
    **Feature: backstage, Property 4: E2E test execution**
    **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
    """
    
    def test_e2e_execution_property(self):
        """
        Property: For any completed deployment, E2E tests should execute successfully 
        and report detailed results with pass/fail status.
        
        This property tests that our E2E automation system behaves correctly
        across different deployment scenarios and configurations.
        """
        # Test multiple deployment scenarios (property-based approach)
        test_scenarios = [
            # Scenario 1: Standard deployment
            {
                'deployment_url': 'http://backstage.backstage.svc.cluster.local:7007',
                'max_wait_time': 300,
                'health_check_interval': 10,
                'expected_deployment_ready': True,
                'expected_content': 'Backstage'
            },
            # Scenario 2: Different URL format
            {
                'deployment_url': 'https://backstage.127.0.0.1.nip.io',
                'max_wait_time': 60,
                'health_check_interval': 5,
                'expected_deployment_ready': True,
                'expected_content': 'Backstage'
            },
            # Scenario 3: Custom configuration
            {
                'deployment_url': 'http://localhost:7007',
                'max_wait_time': 120,
                'health_check_interval': 15,
                'expected_deployment_ready': True,
                'expected_content': 'EDA Backstage App'
            }
        ]
        
        for i, scenario in enumerate(test_scenarios):
            with self.subTest(scenario=i):
                self._test_e2e_execution_scenario(scenario)
    
    @patch('urllib.request.urlopen')
    @patch('subprocess.run')
    @patch('os.chdir')
    def _test_e2e_execution_scenario(self, scenario, mock_chdir, mock_subprocess, mock_urlopen):
        """Test E2E execution for a specific scenario."""
        # Setup E2E automation with scenario configuration
        config = {
            'deployment_url': scenario['deployment_url'],
            'max_wait_time': scenario['max_wait_time'],
            'health_check_interval': scenario['health_check_interval']
        }
        e2e = PostDeploymentE2E(config)
        
        # Mock deployment readiness check
        mock_response = Mock()
        mock_response.status = 200
        mock_response.read.return_value = f'<html><title>{scenario["expected_content"]}</title></html>'.encode()
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        # Mock successful test execution
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "Tests completed successfully"
        mock_result.stderr = ""
        mock_subprocess.return_value = mock_result
        
        # Create mock test results
        with tempfile.TemporaryDirectory() as temp_dir:
            results_dir = Path(temp_dir) / 'test-results'
            results_dir.mkdir()
            results_file = results_dir / 'results.json'
            
            test_results = {
                'stats': {
                    'tests': 3,
                    'passes': 3,
                    'failures': 0,
                    'duration': 15000
                }
            }
            
            with open(results_file, 'w') as f:
                json.dump(test_results, f)
            
            e2e.backstage_dir = Path(temp_dir)
            
            # Property: E2E execution should always succeed for valid deployments
            success = e2e.run()
            
            # Verify the property holds
            self.assertTrue(success, f"E2E execution failed for scenario: {scenario}")
            
            # Verify deployment readiness was checked
            mock_urlopen.assert_called()
            
            # Verify tests were executed
            mock_subprocess.assert_called()
            
            # Verify proper configuration was used
            self.assertEqual(e2e.deployment_url, scenario['deployment_url'])
            self.assertEqual(e2e.max_wait_time, scenario['max_wait_time'])
            self.assertEqual(e2e.health_check_interval, scenario['health_check_interval'])


if __name__ == '__main__':
    unittest.main()


# Property-Based Testing
try:
    from hypothesis import given, strategies as st, assume
    HYPOTHESIS_AVAILABLE = True
except ImportError:
    HYPOTHESIS_AVAILABLE = False


if HYPOTHESIS_AVAILABLE:
    class TestPostDeploymentE2EProperties(unittest.TestCase):
        """Property-based tests for E2E test execution.
        
        **Feature: backstage, Property 4: E2E test execution**
        **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
        """
    
        def setUp(self):
            """Set up test fixtures."""
            pass
    
        @given(
            deployment_url=st.text(min_size=10, max_size=100).filter(lambda x: x.startswith('http')),
            max_wait_time=st.integers(min_value=30, max_value=600),
            health_check_interval=st.integers(min_value=1, max_value=30)
        )
        def test_property_e2e_configuration_validity(self, deployment_url, max_wait_time, health_check_interval):
            """
            Property: For any valid configuration parameters, the E2E automation should initialize correctly
            and maintain configuration consistency.
            
            This tests that the E2E system properly handles various configuration inputs and maintains
            internal consistency regardless of the specific values provided.
            """
            assume(max_wait_time > health_check_interval)  # Logical constraint
            assume('://' in deployment_url)  # Must be a valid URL format
            
            config = {
                'deployment_url': deployment_url,
                'max_wait_time': max_wait_time,
                'health_check_interval': health_check_interval
            }
            
            # Initialize E2E automation with generated config
            e2e = PostDeploymentE2E(config)
            
            # Property: Configuration should be preserved exactly
            self.assertEqual(e2e.deployment_url, deployment_url)
            self.assertEqual(e2e.max_wait_time, max_wait_time)
            self.assertEqual(e2e.health_check_interval, health_check_interval)
            
            # Property: Max attempts calculation should be consistent
            expected_max_attempts = max_wait_time // health_check_interval
            actual_max_attempts = e2e.max_wait_time // e2e.health_check_interval
            self.assertEqual(actual_max_attempts, expected_max_attempts)
            
            # Property: All configuration values should be positive
            self.assertGreater(e2e.max_wait_time, 0)
            self.assertGreater(e2e.health_check_interval, 0)
    
        @given(
            test_count=st.integers(min_value=0, max_value=100),
            pass_count=st.integers(min_value=0, max_value=100),
            fail_count=st.integers(min_value=0, max_value=100)
        )
        def test_property_test_result_validation_consistency(self, test_count, pass_count, fail_count):
            """
            Property: For any test result statistics, validation should be consistent with the
            logical rules: tests pass validation if and only if there are no failures and at least one test ran.
            
            This ensures that test result validation behaves predictably across all possible
            test outcome scenarios.
            """
            assume(pass_count + fail_count == test_count)  # Logical constraint: passes + failures = total
            
            config = {'deployment_url': 'http://test.example.com'}
            e2e = PostDeploymentE2E(config)
            
            test_results = {
                'stats': {
                    'tests': test_count,
                    'passes': pass_count,
                    'failures': fail_count,
                    'duration': 30000
                }
            }
            
            result = e2e.validate_test_results(test_results)
            
            # Property: Validation should pass if and only if there are no failures AND at least one test
            expected_result = (fail_count == 0) and (test_count > 0)
            self.assertEqual(result, expected_result, 
                            f"Validation mismatch for tests={test_count}, passes={pass_count}, failures={fail_count}")
    
        @given(
            response_content=st.text(min_size=0, max_size=1000),
            contains_backstage=st.booleans()
        )
        def test_property_deployment_readiness_content_detection(self, response_content, contains_backstage):
            """
            Property: For any HTTP response content, Backstage content detection should be consistent:
            content is considered valid if and only if it contains 'Backstage' or 'EDA Backstage App'.
            
            This ensures that deployment readiness detection works reliably across different
            response content variations.
            """
            # Modify content based on the boolean flag
            if contains_backstage and 'Backstage' not in response_content and 'EDA Backstage App' not in response_content:
                response_content = response_content + ' Backstage '
            elif not contains_backstage:
                # Ensure content doesn't contain Backstage keywords
                response_content = response_content.replace('Backstage', 'Other').replace('EDA Backstage App', 'Other App')
            
            config = {'deployment_url': 'http://test.example.com', 'max_wait_time': 10, 'health_check_interval': 5}
            e2e = PostDeploymentE2E(config)
            
            # Mock the HTTP response
            with patch('urllib.request.urlopen') as mock_urlopen:
                mock_response = Mock()
                mock_response.status = 200
                mock_response.read.return_value = response_content.encode('utf-8')
                mock_urlopen.return_value.__enter__.return_value = mock_response
                
                # Property: Detection should match the presence of Backstage keywords
                expected_detection = ('Backstage' in response_content or 'EDA Backstage App' in response_content)
                
                if expected_detection:
                    # Should succeed on first attempt
                    result = e2e.check_deployment_readiness()
                    self.assertTrue(result, f"Should detect Backstage in content: {response_content[:100]}...")
                else:
                    # Should fail after retries (we set short timeout)
                    result = e2e.check_deployment_readiness()
                    self.assertFalse(result, f"Should not detect Backstage in content: {response_content[:100]}...")


if __name__ == '__main__':
    # Run both unit tests and property tests
    unittest.main()
else:
    # Create a placeholder class when Hypothesis is not available
    class TestPostDeploymentE2EProperties(unittest.TestCase):
        """Property-based tests for E2E test execution - requires Hypothesis.
        
        **Feature: backstage, Property 4: E2E test execution**
        **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
        """
        
        def test_hypothesis_not_available(self):
            """Skip all property tests when Hypothesis is not available."""
            self.skipTest("Hypothesis not available - install with: pip install hypothesis>=6.0.0")