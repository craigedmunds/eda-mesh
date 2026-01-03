#!/usr/bin/env python3
"""
Code Server Workspace Manager

This script manages projects and workspaces for code-server based on a YAML configuration.
It clones repositories, creates VS Code workspace files, and maintains the directory structure.
"""

import os
import sys
import yaml
import json
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WorkspaceManager:
    def __init__(self, config_path: str, base_path: str = "/home/coder"):
        self.config_path = config_path
        self.base_path = Path(base_path)
        self.projects_path = self.base_path / "projects"
        self.workspaces_path = self.base_path / "workspaces"
        self.cache_path = self.base_path / "cache"
        
        # Ensure directories exist
        self.projects_path.mkdir(exist_ok=True)
        self.workspaces_path.mkdir(exist_ok=True)
        self.cache_path.mkdir(exist_ok=True)
        
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load the workspace configuration from YAML file."""
        try:
            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
            logger.info(f"Loaded configuration from {self.config_path}")
            return config
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            sys.exit(1)
    
    def _run_command(self, cmd: List[str], cwd: Path = None) -> bool:
        """Run a shell command and return success status."""
        try:
            result = subprocess.run(
                cmd, 
                cwd=cwd, 
                capture_output=True, 
                text=True, 
                check=True
            )
            logger.debug(f"Command succeeded: {' '.join(cmd)}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed: {' '.join(cmd)}")
            logger.error(f"Error: {e.stderr}")
            return False
    
    def _clone_or_update_project(self, project: Dict[str, Any]) -> bool:
        """Clone a new project or update an existing one."""
        project_name = project['name']
        repo_url = project['repo']
        project_path = self.projects_path / project_name
        
        if project.get('desired_state') == 'absent':
            if project_path.exists():
                logger.info(f"Removing project: {project_name}")
                subprocess.run(['rm', '-rf', str(project_path)])
            return True
        
        if project_path.exists():
            logger.info(f"Updating project: {project_name}")
            # Fetch latest changes
            if not self._run_command(['git', 'fetch', '--all'], cwd=project_path):
                return False
            
            # Check if we need to switch branches
            if 'checkout' in project and 'branch' in project['checkout']:
                target_branch = project['checkout']['branch']
                if not self._run_command(['git', 'checkout', target_branch], cwd=project_path):
                    return False
                if not self._run_command(['git', 'pull', 'origin', target_branch], cwd=project_path):
                    return False
            else:
                # Pull default branch
                default_branch = project.get('default_branch', 'main')
                if not self._run_command(['git', 'checkout', default_branch], cwd=project_path):
                    return False
                if not self._run_command(['git', 'pull', 'origin', default_branch], cwd=project_path):
                    return False
        else:
            logger.info(f"Cloning project: {project_name}")
            clone_cmd = ['git', 'clone', repo_url, str(project_path)]
            if not self._run_command(clone_cmd):
                return False
            
            # Checkout specific branch if specified
            if 'checkout' in project and 'branch' in project['checkout']:
                target_branch = project['checkout']['branch']
                if not self._run_command(['git', 'checkout', target_branch], cwd=project_path):
                    return False
        
        return True
    
    def _generate_workspace_file(self, workspace: Dict[str, Any]) -> bool:
        """Generate a VS Code workspace file."""
        workspace_name = workspace['name']
        workspace_file = self.workspaces_path / f"{workspace_name}.code-workspace"
        
        # Build workspace configuration
        workspace_config = {
            "folders": [],
            "settings": {
                "git.autofetch": True,
                "git.enableSmartCommit": True,
                "files.watcherExclude": {
                    "**/node_modules/**": True,
                    "**/.git/objects/**": True,
                    "**/.git/subtree-cache/**": True,
                    "**/cache/**": True
                }
            },
            "extensions": {
                "recommendations": [
                    "ms-python.python",
                    "ms-vscode.vscode-yaml",
                    "redhat.vscode-kubernetes-tools",
                    "ms-kubernetes-tools.vscode-kubernetes-tools",
                    "golang.go"
                ]
            }
        }
        
        # Add project folders
        for project_name in workspace['projects']:
            project_path = f"../projects/{project_name}"
            workspace_config["folders"].append({
                "name": project_name,
                "path": project_path
            })
        
        # Write workspace file
        try:
            with open(workspace_file, 'w') as f:
                json.dump(workspace_config, f, indent=2)
            logger.info(f"Generated workspace file: {workspace_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to generate workspace file {workspace_file}: {e}")
            return False
    
    def sync_projects(self) -> bool:
        """Sync all projects defined in the configuration."""
        logger.info("Starting project synchronization...")
        success = True
        
        for project in self.config.get('projects', []):
            if not self._clone_or_update_project(project):
                success = False
                logger.error(f"Failed to sync project: {project['name']}")
        
        return success
    
    def generate_workspaces(self) -> bool:
        """Generate all workspace files."""
        logger.info("Generating workspace files...")
        success = True
        
        for workspace in self.config.get('workspaces', []):
            if not self._generate_workspace_file(workspace):
                success = False
                logger.error(f"Failed to generate workspace: {workspace['name']}")
        
        return success
    
    def run(self) -> bool:
        """Run the complete workspace management process."""
        logger.info("Starting workspace management...")
        
        success = True
        if not self.sync_projects():
            success = False
        
        if not self.generate_workspaces():
            success = False
        
        if success:
            logger.info("Workspace management completed successfully!")
        else:
            logger.error("Workspace management completed with errors!")
        
        return success

def main():
    """Main entry point."""
    config_path = os.getenv('WORKSPACE_CONFIG', '/etc/workspaces/workspaces.yaml')
    base_path = os.getenv('WORKSPACE_BASE', '/home/coder')
    
    manager = WorkspaceManager(config_path, base_path)
    success = manager.run()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()