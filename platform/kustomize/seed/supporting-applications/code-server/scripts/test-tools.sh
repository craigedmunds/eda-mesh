#!/bin/bash

echo "Testing installed tools..."
echo "=== System Tools ==="
git --version
jq --version
yq --version
echo "=== Kubernetes Tools ==="
kubectl version --client
kustomize version
helm version
k9s version
echo "=== Python Tools ==="
python3 --version
uv --version || echo "uv not found"
pipx --version || echo "pipx not found"
echo "=== Node.js Tools ==="
node --version
npm --version
yarn --version
echo "=== Go Tools ==="
go version || echo "go not found"
echo "=== Task Runner ==="
task --version || echo "task not found"