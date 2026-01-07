#!/bin/bash
set -e

echo "🔍 Testing PAT permissions..."
echo ""

if [ -z "$ARGOCD_INC_SUBMODULES" ]; then
  echo "❌ ERROR: ARGOCD_INC_SUBMODULES environment variable is not set"
  echo ""
  echo "Please set it first:"
  echo "  export ARGOCD_INC_SUBMODULES='your-pat-here'"
  exit 1
fi

echo "✅ PAT environment variable is set"
echo ""

# Test 1: Check parent repo access
echo "📦 Testing access to argocd-eda..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token $ARGOCD_INC_SUBMODULES" \
  https://api.github.com/repos/craigedmunds/argocd-eda)

if [ "$RESPONSE" = "200" ]; then
  echo "✅ Can access argocd-eda (parent repo)"
else
  echo "❌ Cannot access argocd-eda (HTTP $RESPONSE)"
  echo "   Expected: 200, Got: $RESPONSE"
fi
echo ""

# Test 2: Check submodule repo access
echo "📦 Testing access to dev-common..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token $ARGOCD_INC_SUBMODULES" \
  https://api.github.com/repos/craigedmunds/dev-common)

if [ "$RESPONSE" = "200" ]; then
  echo "✅ Can access dev-common (submodule repo)"
else
  echo "❌ Cannot access dev-common (HTTP $RESPONSE)"
  echo "   Expected: 200, Got: $RESPONSE"
fi
echo ""

# Test 3: Check PAT scopes
echo "🔐 Checking PAT scopes..."
SCOPES=$(curl -s -I \
  -H "Authorization: token $ARGOCD_INC_SUBMODULES" \
  https://api.github.com/user | grep -i "x-oauth-scopes:" | cut -d: -f2 | xargs)

if [ -z "$SCOPES" ]; then
  echo "❌ Could not retrieve PAT scopes (authentication may have failed)"
else
  echo "✅ PAT scopes: $SCOPES"
  
  if echo "$SCOPES" | grep -q "repo"; then
    echo "✅ Has 'repo' scope (required for private repos)"
  else
    echo "❌ Missing 'repo' scope (required for private repos)"
    echo "   Current scopes: $SCOPES"
  fi
fi
echo ""

# Test 4: Check write permissions on parent repo
echo "✍️  Testing write permissions on argocd-eda..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token $ARGOCD_INC_SUBMODULES" \
  https://api.github.com/repos/craigedmunds/argocd-eda/collaborators)

if [ "$RESPONSE" = "200" ]; then
  echo "✅ Has write permissions on argocd-eda"
elif [ "$RESPONSE" = "403" ]; then
  echo "⚠️  May have read-only access (HTTP 403)"
  echo "   This is OK for submodule cloning, but version bumps need write access"
else
  echo "❌ Unexpected response (HTTP $RESPONSE)"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For GitHub Actions to work, you need:"
echo "  ✅ Access to argocd-eda (parent repo)"
echo "  ✅ Access to dev-common (submodule repo)"
echo "  ✅ 'repo' scope on the PAT"
echo "  ✅ Write permissions on argocd-eda (for version bumps)"
echo ""
echo "Next step: Add this PAT as a secret named 'SUBMODULE_PAT' in GitHub:"
echo "  https://github.com/craigedmunds/argocd-eda/settings/secrets/actions"
