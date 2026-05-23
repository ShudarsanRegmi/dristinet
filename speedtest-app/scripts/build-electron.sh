#!/bin/bash

# Speedtest Monitor - Electron Build Script
set -e

echo "🚀 Building Speedtest Monitor Electron App"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "electron/package.json" ]; then
    log_error "Please run this script from the speedtest-app root directory"
    exit 1
fi

# Step 1: Build React frontend
log_info "Building React frontend..."
cd frontend
if [ ! -f "package.json" ]; then
    log_error "Frontend package.json not found"
    exit 1
fi

npm install
npm run build
log_success "Frontend built successfully"

# Step 2: Copy frontend build to electron directory
log_info "Copying frontend to electron directory..."
cd ../
rm -rf electron/dist
cp -r frontend/dist electron/
log_success "Frontend copied to electron directory"

# Step 3: Install electron dependencies
log_info "Installing Electron dependencies..."
cd electron
npm install
log_success "Electron dependencies installed"

# Step 4: Copy service files to resources
log_info "Preparing service resources..."
mkdir -p resources/services
mkdir -p resources/database

# Copy the electron-specific service files
cp ../services/speedtest-collector-electron.js resources/services/speedtest-collector.js
cp ../services/api-server-electron.js resources/services/api-server.js
cp ../database/schema.sql resources/database/

# Create a simple package.json for the services
cat > resources/services/package.json << 'EOF'
{
  "name": "speedtest-monitor-services",
  "version": "1.0.0",
  "description": "Background services for Speedtest Monitor",
  "main": "speedtest-collector.js",
  "dependencies": {
    "better-sqlite3": "^11.3.0",
    "node-cron": "^3.0.3",
    "express": "^4.21.1",
    "cors": "^2.8.5"
  }
}
EOF

log_success "Service resources prepared"

# Step 5: Build Electron app
log_info "Building Electron application..."

# Build for current platform
case "$(uname -s)" in
    Linux*)     
        npm run dist:linux
        BUILT_FOR="Linux"
        ;;
    Darwin*)    
        npm run dist:mac
        BUILT_FOR="macOS"
        ;;
    CYGWIN*|MINGW*|MSYS*) 
        npm run dist:windows
        BUILT_FOR="Windows"
        ;;
    *)          
        log_warning "Unknown platform, building for Linux"
        npm run dist:linux
        BUILT_FOR="Linux"
        ;;
esac

log_success "Electron app built for $BUILT_FOR"

# Step 6: Show build results
echo
echo "🎉 Build completed successfully!"
echo "================================"
echo
echo "Built for: $BUILT_FOR"
echo "Output directory: $(pwd)/dist"
echo
echo "Installation files:"
ls -la dist/ 2>/dev/null || echo "No dist files found"

echo
echo "📦 What was packaged:"
echo "  ✅ React frontend (Material-UI dashboard)"
echo "  ✅ Electron main process with installer"
echo "  ✅ Background speedtest collector service"
echo "  ✅ REST API server"
echo "  ✅ SQLite database schema"
echo "  ✅ Cross-platform service management"

echo
echo "🚀 Ready to distribute:"
echo "  • The installer will set up background services automatically"
echo "  • No system-wide installation required"
echo "  • All data stored in user directories"
echo "  • Services run as user processes"

echo
log_info "To test locally, run: npm start"
