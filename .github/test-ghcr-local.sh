#!/bin/bash
set -e

echo "=== Testing GHCR Push Permissions ==="
echo ""

# Check if logged in
if ! docker info | grep -q "Username"; then
    echo "❌ Not logged into Docker"
    echo "Please run: docker login ghcr.io"
    exit 1
fi

echo "✓ Logged into Docker"
echo ""

# Create minimal test image
echo "Creating test image..."
cat > /tmp/Dockerfile.test << 'EOF'
FROM alpine:latest
RUN echo 'GHCR permission test'
EOF

TEST_TAG="ghcr.io/craigedmunds/backstage:permission-test-$(date +%s)"

echo "Building: $TEST_TAG"
docker build -f /tmp/Dockerfile.test -t "$TEST_TAG" /tmp

echo ""
echo "Pushing to GHCR..."
if docker push "$TEST_TAG"; then
    echo ""
    echo "=========================================="
    echo "✅ SUCCESS!"
    echo "=========================================="
    echo "You can push to ghcr.io/craigedmunds/backstage"
    echo ""
    echo "The GitHub Actions workflow should work with"
    echo "the same credentials."
    echo "=========================================="
    
    # Cleanup
    docker rmi "$TEST_TAG" 2>/dev/null || true
    rm /tmp/Dockerfile.test
    exit 0
else
    echo ""
    echo "=========================================="
    echo "❌ FAILED!"
    echo "=========================================="
    echo "Cannot push to ghcr.io/craigedmunds/backstage"
    echo ""
    echo "This means GitHub Actions will also fail."
    echo "Check your GHCR token permissions."
    echo "=========================================="
    
    # Cleanup
    docker rmi "$TEST_TAG" 2>/dev/null || true
    rm /tmp/Dockerfile.test
    exit 1
fi
