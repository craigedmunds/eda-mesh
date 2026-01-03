#!/bin/bash
set -e

echo "Starting workspace sync..."

# Ensure directories exist
mkdir -p /home/coder/projects /home/coder/workspaces /home/coder/cache

# Try to find workspaces config (prefer ConfigMap mount, fallback to copied files)
WORKSPACES_CONFIG=""
if [ -f "/etc/workspaces/workspaces.yaml" ]; then
  WORKSPACES_CONFIG="/etc/workspaces/workspaces.yaml"
  echo "Using workspaces config from ConfigMap: $WORKSPACES_CONFIG"
elif [ -f "/home/coder/.code-server-config/workspaces.yaml" ]; then
  WORKSPACES_CONFIG="/home/coder/.code-server-config/workspaces.yaml"
  echo "Using workspaces config from copied files: $WORKSPACES_CONFIG"
else
  echo "Error: Workspaces config not found in expected locations"
  echo "Checked: /etc/workspaces/workspaces.yaml and /home/coder/.code-server-config/workspaces.yaml"
  exit 1
fi

echo "Reading workspaces configuration..."

# Process projects from config
echo "=== Syncing Projects ==="
yq eval '.projects[] | select(.desired_state == "present")' "$WORKSPACES_CONFIG" | while read -r project_yaml; do
  if [ -z "$project_yaml" ]; then continue; fi
  
  # Parse project details
  project_name=$(echo "$project_yaml" | yq eval '.name' -)
  project_repo=$(echo "$project_yaml" | yq eval '.repo' -)
  default_branch=$(echo "$project_yaml" | yq eval '.default_branch // "main"' -)
  checkout_branch=$(echo "$project_yaml" | yq eval '.checkout.branch // ""' -)
  
  echo "Processing project: $project_name"
  
  project_path="/home/coder/projects/$project_name"
  
  if [ -d "$project_path" ]; then
    echo "  Updating existing project..."
    cd "$project_path"
    git fetch --all
    
    # Checkout the desired branch
    target_branch="${checkout_branch:-$default_branch}"
    echo "  Checking out branch: $target_branch"
    git checkout "$target_branch"
    git pull origin "$target_branch"
  else
    echo "  Cloning new project..."
    git clone "$project_repo" "$project_path"
    cd "$project_path"
    
    # Checkout the desired branch if different from default
    if [ -n "$checkout_branch" ] && [ "$checkout_branch" != "$default_branch" ]; then
      echo "  Checking out branch: $checkout_branch"
      git checkout "$checkout_branch"
    fi
  fi
done

# Process workspaces from config
echo "=== Generating VS Code Workspaces ==="
yq eval '.workspaces[]' "$WORKSPACES_CONFIG" | while read -r workspace_yaml; do
  if [ -z "$workspace_yaml" ]; then continue; fi
  
  # Parse workspace details
  workspace_name=$(echo "$workspace_yaml" | yq eval '.name' -)
  echo "Generating workspace: $workspace_name"
  
  # Get the first project for terminal cwd
  first_project=$(echo "$workspace_yaml" | yq eval '.projects[0]' -)
  
  # Generate workspace file using yq to build the JSON structure
  workspace_file="/home/coder/workspaces/${workspace_name}.code-workspace"
  
  # Create base workspace structure
  echo '{}' | yq eval '.folders = []' - > "$workspace_file"
  
  # Add folders for each project
  echo "$workspace_yaml" | yq eval '.projects[]' - | while read -r project_name; do
    if [ -z "$project_name" ]; then continue; fi
    yq eval ".folders += [{\"name\": \"$project_name\", \"path\": \"../projects/$project_name\"}]" -i "$workspace_file"
  done
  
  # Add settings
  yq eval '.settings = {
    "git.autofetch": true,
    "git.enableSmartCommit": true,
    "files.watcherExclude": {
      "**/node_modules/**": true,
      "**/.git/objects/**": true,
      "**/.git/subtree-cache/**": true,
      "**/cache/**": true
    },
    "terminal.integrated.defaultProfile.linux": "bash",
    "terminal.integrated.cwd": "/home/coder/projects/" + "'"$first_project"'"
  }' -i "$workspace_file"
  
  # Add extensions
  extensions_json=$(echo "$workspace_yaml" | yq eval '.extensions' - -o json)
  yq eval ".extensions.recommendations = $extensions_json" -i "$workspace_file"
  
  echo "  Generated: $workspace_file"
done

echo "Workspace sync completed!"