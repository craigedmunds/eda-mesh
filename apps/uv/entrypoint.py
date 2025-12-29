#!/usr/bin/env python3
"""
Python entrypoint script to replace run.sh for distroless compatibility.
"""
import os
import sys
import shutil
import subprocess
from pathlib import Path

def main():
    # Configuration
    project_dir = Path("/app")
    src_dir = Path("/integration")
    
    # Ensure project directory exists
    project_dir.mkdir(exist_ok=True)
    os.chdir(project_dir)
    
    if len(sys.argv) > 1:
        # Script execution mode
        script_name = sys.argv[1]
        script_args = sys.argv[2:]
        
        # Copy the script
        src_script = src_dir / script_name
        if not src_script.exists():
            print(f"Error: Script {script_name} not found in {src_dir}")
            sys.exit(1)
        
        shutil.copy2(src_script, project_dir / script_name)
        
        # Copy pyproject.toml if present
        src_pyproject = src_dir / "pyproject.toml"
        if src_pyproject.exists():
            shutil.copy2(src_pyproject, project_dir / "pyproject.toml")
        
        # Install dependencies if pyproject.toml exists
        if (project_dir / "pyproject.toml").exists():
            subprocess.run(["uv", "sync"], check=True)
        
        # Run the script
        cmd = ["uv", "run", "python", str(project_dir / script_name)] + script_args
        os.execvp("uv", cmd)
    
    else:
        # Default behavior: run uvicorn server
        src_app = src_dir / "app.py"
        shutil.copy2(src_app, project_dir / "app.py")
        
        src_pyproject = src_dir / "pyproject.toml"
        if src_pyproject.exists():
            shutil.copy2(src_pyproject, project_dir / "pyproject.toml")
        
        if not (project_dir / "pyproject.toml").exists():
            print("No pyproject.toml found — installing deps inline")
            subprocess.run([
                "uv", "pip", "install", 
                "fastapi", "uvicorn", "kubernetes", "pyyaml"
            ], check=True)
        
        # Run uvicorn
        cmd = [
            "uv", "run", "uvicorn",
            "--app-dir", str(src_dir),
            "app:app",
            "--host", "0.0.0.0",
            "--port", "8080"
        ]
        os.execvp("uv", cmd)

if __name__ == "__main__":
    main()