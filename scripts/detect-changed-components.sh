#!/bin/bash
# scripts/detect-changed-components.sh
# Detects which components have changes compared to main branch

set -euo pipefail

# Get changed files compared to main branch
CHANGED_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD~1...HEAD)

# Define component mappings
declare -A COMPONENT_PATHS=(
  ["backstage/app"]="backstage-app"
  ["image-factory/app"]="image-factory-app"
  ["image-factory/cdk8s"]="image-factory-cdk8s"
  ["eda"]="eda"
  ["platform/ingress"]="platform-ingress"
  ["platform/kustomize/_common/components/argocd-branch-targetrevision"]="branch-targeting"
  ["apps/uv"]="uv-app"
  ["apps/e2e-test-runner"]="e2e-runner"
)

CHANGED_COMPONENTS=()

for path in "${!COMPONENT_PATHS[@]}"; do
  if echo "$CHANGED_FILES" | grep -q "^$path/"; then
    CHANGED_COMPONENTS+=("${COMPONENT_PATHS[$path]}")
  fi
done

# Output format depends on first argument
case "${1:-list}" in
  "json")
    # Output as JSON array for GitHub Actions
    printf '%s\n' "${CHANGED_COMPONENTS[@]}" | jq -R . | jq -s .
    ;;
  "paths")
    # Output component paths for task execution
    for component in "${CHANGED_COMPONENTS[@]}"; do
      for path in "${!COMPONENT_PATHS[@]}"; do
        if [[ "${COMPONENT_PATHS[$path]}" == "$component" ]]; then
          echo "$path"
          break
        fi
      done
    done
    ;;
  "list"|*)
    # Output component names (default)
    printf '%s\n' "${CHANGED_COMPONENTS[@]}"
    ;;
esac