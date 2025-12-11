#!/bin/bash
# Setup script for E2E test environment
# This script prepares the container environment for running Backstage E2E tests

set -euo pipefail

echo "🔧 Setting up E2E test environment..."

# Install system dependencies
echo "📦 Installing system dependencies..."
apt-get update -qq && apt-get install -y -qq \
  curl \
  git \
  nodejs \
  npm \
  chromium \
  chromium-driver

# Install Node.js tools
echo "📦 Installing Node.js tools..."
npm install -g yarn

# Install Playwright browsers
echo "🎭 Installing Playwright..."
pip install playwright
playwright install chromium

# Clone repository and setup
echo "📥 Cloning repository..."
git clone --depth 1 --branch feature/backstage-events \
  https://github.com/craigedmunds/argocd-eda.git /workspace

# Change to backstage directory
cd /workspace/apps/backstage

# Install dependencies
echo "📦 Installing Backstage dependencies..."
yarn install --frozen-lockfile --silent

echo "✅ E2E environment setup complete"

# Execute the Python E2E script
echo "🐍 Executing E2E test runner..."
exec python3 /scripts/post_deployment_e2e.py "$@"