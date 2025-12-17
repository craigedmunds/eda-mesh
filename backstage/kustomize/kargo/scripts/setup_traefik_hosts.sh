#!/bin/bash
set -euo pipefail

echo "🚀 Starting Backstage acceptance verification..."

# Get Traefik service IP and add to /etc/hosts for Playwright DNS resolution
TRAEFIK_IP=$(kubectl get svc traefik -n kube-system -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "10.43.64.171")
echo "$TRAEFIK_IP backstage.127.0.0.1.nip.io" >> /etc/hosts
echo "📝 Added host alias: $TRAEFIK_IP backstage.127.0.0.1.nip.io"

# Verify the host alias works for Playwright
echo "🧪 Testing host alias..."
curl -k -I --connect-timeout 5 --max-time 10 https://backstage.127.0.0.1.nip.io/ || echo "Host alias test failed"

echo "✅ Traefik host setup complete"