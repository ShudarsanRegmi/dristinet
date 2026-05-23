#!/bin/bash

# Ultra-fast rebuild (assumes dependencies are already installed)
set -e

echo "⚡ Ultra-Fast Rebuild"
echo "==================="

cd electron

# Copy latest frontend
rm -rf dist
cp -r ../frontend/dist .

# Update resources
cp ../services/speedtest-collector-electron.js resources/services/speedtest-collector.js
cp ../services/api-server-electron.js resources/services/api-server.js

# Build AppImage only
echo "🔨 Building..."
npx electron-builder --linux AppImage --publish never

echo "✅ Done! Output: /home/aparichit/utilities/speedtest/speedtest-app/electron/build/Speedtest Monitor-1.0.0.AppImage"
