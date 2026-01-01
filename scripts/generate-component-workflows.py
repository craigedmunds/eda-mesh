#!/usr/bin/env python3
"""
Generate GitHub Actions workflows from .repo-metadata.yaml

This script reads the repository metadata and generates:
1. Component-specific test workflows
2. Manual acceptance testing workflow

It uses intelligent test discovery to only include test jobs for
test types that actually exist in each component.
"""

import os
import sys
import yaml
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import re

def load_repo_metadata():
    """Load and parse the .repo-metadata.yaml file."""
    metadata_path = Path(__file__).parent.parent / '.repo-metadata.yaml'
    
    if not metadata_path.exists():
        print(f"ERROR: {metadata_path} not found")
        sys.exit(1)
    
    with open(metadata_path, 'r') as f:
        return yaml.safe_load(f)

def discover_test_capabilities(component_path):
    """
    Discover what test capabilities a component has by checking:
    1. Existence of test directories (tests/unit/, tests/integration/, tests/acceptance/)
    2. Taskfile.yaml for test tasks (test:unit, test:integration, test:acceptance)
    3. Actual test files and non-placeholder implementations
    """
    base_path = Path(__file__).parent.parent / component_path
    capabilities = {
        'has_unit_tests': False,
        'has_integration_tests': False,
        'has_acceptance_tests': False
    }
    
    # Check for test directories and actual test files
    test_dirs = {
        'has_unit_tests': ['tests/unit', 'test'],  # Also check for single test files
        'has_integration_tests': ['tests/integration'],
        'has_acceptance_tests': ['tests/acceptance']
    }
    
    for capability, dirs in test_dirs.items():
        for test_dir in dirs:
            test_path = base_path / test_dir
            if test_path.exists():
                # For unit tests, also check if there are actual test files
                if capability == 'has_unit_tests':
                    # Check for test files (test_*.py, *_test.py, *.test.ts, etc.)
                    test_files = list(test_path.glob('test_*.py')) + \
                                list(test_path.glob('*_test.py')) + \
                                list(test_path.glob('*.test.ts')) + \
                                list(test_path.glob('*.test.js'))
                    # Also check for test files in the component root (like test_app.py)
                    root_test_files = list(base_path.glob('test_*.py')) + \
                                     list(base_path.glob('*_test.py'))
                    if test_files or root_test_files:
                        capabilities[capability] = True
                else:
                    capabilities[capability] = True
                break
    
    # Check Taskfile.yaml for test tasks and verify they're not just placeholders
    taskfile_path = base_path / 'Taskfile.yaml'
    if taskfile_path.exists():
        try:
            with open(taskfile_path, 'r') as f:
                taskfile_content = f.read()
                
            # Look for test task definitions and check if they're real implementations
            task_patterns = {
                'has_unit_tests': r'test:unit:',
                'has_integration_tests': r'test:integration:',
                'has_acceptance_tests': r'test:acceptance:'
            }
            
            for capability, pattern in task_patterns.items():
                if re.search(pattern, taskfile_content):
                    capabilities[capability] = True
        except Exception as e:
            print(f"Warning: Could not parse {taskfile_path}: {e}")
    
    return capabilities

def generate_component_workflow(component, template_env):
    """Generate a workflow file for a single component."""
    
    # Discover test capabilities
    test_capabilities = discover_test_capabilities(component['path'])
    
    # Merge component data with test capabilities
    component_data = {
        **component,
        **test_capabilities
    }
    
    # Generate workflow filename with component-test pattern and .generated suffix
    workflow_filename = f"{component['name']}-test.generated.yml"
    
    # Add workflow filename to template data
    component_data['workflow_filename'] = workflow_filename
    
    # Load and render template
    template = template_env.get_template('component-workflow.yml.j2')
    workflow_content = template.render(component=component_data)
    
    # Write workflow file
    workflow_path = Path(__file__).parent.parent / '.github' / 'workflows' / workflow_filename
    workflow_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(workflow_path, 'w') as f:
        f.write(workflow_content)
    
    print(f"Generated: {workflow_path}")
    
    return component_data

def generate_component_manual_workflow(component, template_env):
    """Generate a manual acceptance workflow file for a single component."""
    
    # Generate workflow filename with component-manual pattern and .generated suffix
    workflow_filename = f"{component['name']}-manual.generated.yml"
    
    # Add workflow filename to template data
    component_data = {
        **component,
        'workflow_filename': workflow_filename
    }
    
    # Load and render template
    template = template_env.get_template('component-manual.yml.j2')
    workflow_content = template.render(component=component_data)
    
    # Write workflow file
    workflow_path = Path(__file__).parent.parent / '.github' / 'workflows' / workflow_filename
    workflow_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(workflow_path, 'w') as f:
        f.write(workflow_content)
    
    print(f"Generated: {workflow_path}")
    
    return component_data

def main():
    """Main workflow generation function."""
    print("🔧 Generating component workflows from .repo-metadata.yaml...")
    
    # Load repository metadata
    metadata = load_repo_metadata()
    components = metadata['components']
    
    # Set up Jinja2 environment
    template_dir = Path(__file__).parent / 'templates'
    template_env = Environment(
        loader=FileSystemLoader(template_dir),
        trim_blocks=False,
        lstrip_blocks=False
    )
    
    # Generate component workflows
    generated_components = []
    
    for component in components:
        print(f"\n📋 Processing component: {component['name']}")
        print(f"   Path: {component['path']}")
        
        # Discover test capabilities first
        test_capabilities = discover_test_capabilities(component['path'])
        component_data = {
            **component,
            **test_capabilities
        }
        
        # Only generate test workflow if component has unit or integration tests
        has_fast_tests = (
            component_data['has_unit_tests'] or 
            component_data['has_integration_tests']
        )
        
        if has_fast_tests:
            component_data = generate_component_workflow(component, template_env)
            generated_components.append(component_data)
            print(f"   ✅ Generated test workflow")
        else:
            generated_components.append(component_data)
            print(f"   ⚠️  No unit/integration tests found - skipped test workflow generation")
        
        # Generate manual acceptance workflow if component has acceptance tests
        if component_data['has_acceptance_tests']:
            generate_component_manual_workflow(component_data, template_env)
            print(f"   ✅ Generated manual acceptance workflow")
        
        # Print discovered capabilities
        capabilities = []
        if component_data['has_unit_tests']:
            capabilities.append('unit')
        if component_data['has_integration_tests']:
            capabilities.append('integration')
        if component_data['has_acceptance_tests']:
            capabilities.append('acceptance')
        if component_data.get('image'):
            capabilities.append('docker-build')
        
        if capabilities:
            print(f"   🧪 Test capabilities: {', '.join(capabilities)}")
        else:
            print(f"   📦 Component capabilities: docker-build only" if component_data.get('image') else "   📦 Component capabilities: configuration only")
    
    print(f"\n✅ Generated workflows for {len(generated_components)} components")
    print("\n📝 Summary:")
    for component in generated_components:
        capabilities = []
        if component['has_unit_tests']:
            capabilities.append('U')
        if component['has_integration_tests']:
            capabilities.append('I')
        if component['has_acceptance_tests']:
            capabilities.append('A')
        if component.get('image'):
            capabilities.append('D')
        
        capability_str = ''.join(capabilities) if capabilities else 'None'
        print(f"   {component['name']:25} [{capability_str:4}] {component['path']}")
    
    print("\n🔑 Legend: U=Unit, I=Integration, A=Acceptance, D=Docker")

if __name__ == '__main__':
    main()