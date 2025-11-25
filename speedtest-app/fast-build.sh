#!/bin/bash

# Fast AppImage Builder for Speedtest Monitor
set -e

echo "⚡ Fast AppImage Build Pipeline"
echo "=============================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "electron/package.json" ]; then
    echo "❌ Please run this script from the speedtest-app root directory"
    exit 1
fi

# Step 1: Quick frontend build check
log_info "Checking frontend build..."
if [ ! -d "frontend/dist" ] || [ "frontend/src" -nt "frontend/dist" ]; then
    log_info "Building React frontend..."
    cd frontend
    npm run build --silent
    cd ../
    log_success "Frontend built"
else
    log_success "Frontend up to date"
fi

# Step 2: Copy frontend to electron (always do this to ensure latest)
log_info "Copying frontend..."
rm -rf electron/dist
cp -r frontend/dist electron/
log_success "Frontend copied"

# Step 3: Prepare resources quickly
log_info "Preparing resources..."
cd electron
mkdir -p resources/services resources/database

# Copy service files
cp ../services/speedtest-collector-electron.js resources/services/speedtest-collector.js
cp ../services/api-server-electron.js resources/services/api-server.js
cp ../database/schema.sql resources/database/

# Create services package.json
cat > resources/services/package.json << 'EOF'
{
  "name": "speedtest-monitor-services",
  "version": "1.0.0",
  "dependencies": {
    "better-sqlite3": "^11.3.0",
    "express": "^4.21.1",
    "cors": "^2.8.5"
  }
}
EOF

log_success "Resources prepared"

# Step 4: Quick dependency check
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    log_info "Installing dependencies..."
    npm install --silent
else
    log_success "Dependencies up to date"
fi

# Step 5: Build AppImage only
log_info "Building AppImage..."
npx electron-builder --linux AppImage

log_success "AppImage built successfully!"

# Show result
echo
echo "🎉 Build Complete!"
echo "=================="
echo
echo "📦 Output: $(pwd)/dist/Speedtest Monitor-1.0.0.AppImage"
echo "📊 Size: $(du -h "dist/Speedtest Monitor-1.0.0.AppImage" | cut -f1)"
echo
echo "🚀 Run with:"
echo "   ./dist/Speedtest\\ Monitor-1.0.0.AppImage"
echo
