#!/bin/bash

echo "🧹 Cleaning build artifacts..."
rm -rf dist node_modules/.vite .vite

echo "🔍 Checking if generatingQR is in source code..."
grep -n "generatingQR" src/views/QuickAdd.jsx

echo ""
echo "🔨 Building project..."
npm run build

echo ""
echo "✅ Checking if generatingQR made it into the build..."
if grep -r "generatingQR" dist/ > /dev/null 2>&1; then
    echo "✅ Found generatingQR in build output (minified)"
else
    echo "❌ WARNING: generatingQR NOT found in build output!"
    echo "This means the fix didn't make it into the bundle."
fi

echo ""
echo "📦 Build complete. Ready to deploy with: firebase deploy --only hosting"
