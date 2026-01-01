#!/bin/bash
# scripts/run-changed-tests.sh
# Runs tests for components that have changed compared to main branch

set -euo pipefail

TEST_TYPE="${1:-all}"

echo "🔍 Detecting changed components for ${TEST_TYPE} testing..."
CHANGED_PATHS=$(./scripts/detect-changed-components.sh paths)

if [ -z "$CHANGED_PATHS" ]; then
  echo "No component changes detected"
  exit 0
fi

echo "Changed components:"
echo "$CHANGED_PATHS"
echo ""

# Run tests for each changed component using existing task pattern
for component_path in $CHANGED_PATHS; do
  echo "🧪 Running ${TEST_TYPE} tests for $component_path"
  
  if [ ! -f "$component_path/Taskfile.yaml" ]; then
    echo "No Taskfile.yaml found in $component_path"
    echo ""
    continue
  fi
  
  case "$TEST_TYPE" in
    "all")
      (cd "$component_path" && task test:all)
      ;;
    "unit")
      if grep -q "test:unit" "$component_path/Taskfile.yaml"; then
        (cd "$component_path" && task test:unit)
      else
        echo "No unit tests found in $component_path"
      fi
      ;;
    "integration")
      if grep -q "test:integration" "$component_path/Taskfile.yaml"; then
        (cd "$component_path" && task test:integration)
      else
        echo "No integration tests found in $component_path"
      fi
      ;;
    "acceptance")
      if grep -q "test:acceptance" "$component_path/Taskfile.yaml"; then
        (cd "$component_path" && task test:acceptance)
      else
        echo "No acceptance tests found in $component_path"
      fi
      ;;
    *)
      echo "Unknown test type: $TEST_TYPE"
      echo "Valid types: all, unit, integration, acceptance"
      exit 1
      ;;
  esac
  
  echo ""
done

echo "✅ Completed ${TEST_TYPE} tests for all changed components"