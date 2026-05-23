#!/bin/bash

# Speedtest Monitor - Linux Installation Script
# Supports: Ubuntu, Debian, CentOS, RHEL, Fedora, Arch Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="speedtest-monitor"
INSTALL_DIR="/opt/speedtest-monitor"
SERVICE_USER="speedtest"
NODE_MIN_VERSION="18"
CURRENT_USER=$(whoami)

# Helper functions
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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Detect Linux distribution
detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    else
        log_error "Cannot detect Linux distribution"
        exit 1
    fi
    
    log_info "Detected: $PRETTY_NAME"
}

# Install Node.js
install_nodejs() {
    log_info "Checking Node.js installation..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $NODE_VERSION -ge $NODE_MIN_VERSION ]]; then
            log_success "Node.js v$(node --version) is already installed"
            return
        else
            log_warning "Node.js version is too old ($(node --version)), upgrading..."
        fi
    fi
    
    log_info "Installing Node.js $NODE_MIN_VERSION..."
    
    case $DISTRO in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_${NODE_MIN_VERSION}.x | sudo -E bash -
            apt-get install -y nodejs
            ;;
        centos|rhel|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_MIN_VERSION}.x | sudo bash -
            if [[ $DISTRO == "fedora" ]]; then
                dnf install -y nodejs
            else
                yum install -y nodejs
            fi
            ;;
        arch)
            pacman -S --noconfirm nodejs
            ;;
        *)
            log_error "Unsupported distribution for automatic Node.js installation"
            log_info "Please install Node.js $NODE_MIN_VERSION+ manually from: https://nodejs.org/"
            exit 1
            ;;
    esac
    
    log_success "Node.js $(node --version) installed successfully"
}

# Install Speedtest CLI
install_speedtest_cli() {
    log_info "Checking Speedtest CLI installation..."
    
    if command -v speedtest &> /dev/null; then
        log_success "Speedtest CLI is already installed"
        return
    fi
    
    log_info "Installing Speedtest CLI..."
    
    case $DISTRO in
        ubuntu|debian)
            # Add Speedtest repository
            curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash
            apt-get install -y speedtest
            ;;
        centos|rhel|fedora)
            # Add Speedtest repository
            curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.rpm.sh | bash
            if [[ $DISTRO == "fedora" ]]; then
                dnf install -y speedtest
            else
                yum install -y speedtest
            fi
            ;;
        arch)
            # Install from AUR or use snap
            if command -v yay &> /dev/null; then
                yay -S --noconfirm speedtest-cli-ookla
            elif command -v snap &> /dev/null; then
                snap install speedtest-cli
            else
                log_error "Please install speedtest-cli manually on Arch Linux"
                exit 1
            fi
            ;;
        *)
            log_error "Unsupported distribution for automatic Speedtest CLI installation"
            log_info "Please install Speedtest CLI manually from: https://www.speedtest.net/apps/cli"
            exit 1
            ;;
    esac
    
    # Accept license
    speedtest --accept-license --accept-gdpr > /dev/null 2>&1 || true
    
    log_success "Speedtest CLI installed successfully"
}

# Create service user
create_service_user() {
    log_info "Creating service user: $SERVICE_USER"
    
    if id "$SERVICE_USER" &>/dev/null; then
        log_warning "User $SERVICE_USER already exists"
    else
        useradd --system --no-create-home --shell /bin/false $SERVICE_USER
        log_success "Service user created: $SERVICE_USER"
    fi
}

# Install application
install_application() {
    log_info "Installing application to $INSTALL_DIR..."
    
    # Create installation directory
    mkdir -p $INSTALL_DIR
    
    # Copy application files
    if [[ -d "$(pwd)/speedtest-app" ]]; then
        cp -r $(pwd)/speedtest-app/* $INSTALL_DIR/
    else
        cp -r $(pwd)/* $INSTALL_DIR/
    fi
    
    # Set permissions
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    chmod +x $INSTALL_DIR/services/*.js
    chmod +x $INSTALL_DIR/scripts/*.js
    
    # Install Node.js dependencies
    log_info "Installing Node.js dependencies..."
    cd $INSTALL_DIR
    sudo -u $SERVICE_USER npm install --production
    
    log_success "Application installed successfully"
}

# Initialize database
setup_database() {
    log_info "Setting up database..."
    
    cd $INSTALL_DIR
    sudo -u $SERVICE_USER node scripts/setup-database.js init
    
    log_success "Database initialized successfully"
}

# Install systemd services
install_systemd_services() {
    log_info "Installing systemd services..."
    
    # Copy service files
    cp $INSTALL_DIR/systemd/*.service /etc/systemd/system/
    
    # Reload systemd
    systemctl daemon-reload
    
    # Enable services
    systemctl enable speedtest-collector@$SERVICE_USER.service
    systemctl enable speedtest-dashboard@$SERVICE_USER.service
    
    log_success "Systemd services installed and enabled"
}

# Start services
start_services() {
    log_info "Starting services..."
    
    systemctl start speedtest-collector@$SERVICE_USER.service
    systemctl start speedtest-dashboard@$SERVICE_USER.service
    
    # Wait a moment for services to start
    sleep 3
    
    # Check service status
    if systemctl is-active --quiet speedtest-collector@$SERVICE_USER.service; then
        log_success "Speedtest collector service is running"
    else
        log_error "Failed to start speedtest collector service"
        systemctl status speedtest-collector@$SERVICE_USER.service --no-pager
    fi
    
    if systemctl is-active --quiet speedtest-dashboard@$SERVICE_USER.service; then
        log_success "Web dashboard service is running"
    else
        log_error "Failed to start web dashboard service"
        systemctl status speedtest-dashboard@$SERVICE_USER.service --no-pager
    fi
}

# Configure firewall
setup_firewall() {
    log_info "Configuring firewall..."
    
    if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
        ufw allow 3000/tcp comment "Speedtest Monitor Dashboard"
        log_success "UFW firewall configured"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=3000/tcp
        firewall-cmd --reload
        log_success "Firewalld configured"
    else
        log_warning "No active firewall detected. Make sure port 3000 is accessible."
    fi
}

# Main installation function
main() {
    echo "=================================="
    echo "  Speedtest Monitor Installer"
    echo "=================================="
    echo
    
    check_root
    detect_distro
    
    log_info "Starting installation..."
    
    install_nodejs
    install_speedtest_cli
    create_service_user
    install_application
    setup_database
    install_systemd_services
    start_services
    setup_firewall
    
    echo
    log_success "Installation completed successfully!"
    echo
    echo "🌐 Web Dashboard: http://localhost:3000"
    echo "📊 Service Status:"
    echo "   systemctl status speedtest-collector@$SERVICE_USER.service"
    echo "   systemctl status speedtest-dashboard@$SERVICE_USER.service"
    echo
    echo "📋 Useful Commands:"
    echo "   sudo systemctl restart speedtest-collector@$SERVICE_USER.service"
    echo "   sudo systemctl restart speedtest-dashboard@$SERVICE_USER.service"
    echo "   sudo journalctl -u speedtest-collector@$SERVICE_USER.service -f"
    echo
    echo "🔧 Configuration: Edit files in $INSTALL_DIR"
    echo "📁 Data Location: $INSTALL_DIR/data/"
    echo
}

# Uninstall function
uninstall() {
    log_info "Uninstalling Speedtest Monitor..."
    
    # Stop services
    systemctl stop speedtest-collector@$SERVICE_USER.service 2>/dev/null || true
    systemctl stop speedtest-dashboard@$SERVICE_USER.service 2>/dev/null || true
    
    # Disable services
    systemctl disable speedtest-collector@$SERVICE_USER.service 2>/dev/null || true
    systemctl disable speedtest-dashboard@$SERVICE_USER.service 2>/dev/null || true
    
    # Remove service files
    rm -f /etc/systemd/system/speedtest-collector@.service
    rm -f /etc/systemd/system/speedtest-dashboard@.service
    systemctl daemon-reload
    
    # Remove application directory
    rm -rf $INSTALL_DIR
    
    # Remove service user
    userdel $SERVICE_USER 2>/dev/null || true
    
    log_success "Uninstallation completed"
}

# Command line argument handling
case ${1:-install} in
    install)
        main
        ;;
    uninstall)
        check_root
        uninstall
        ;;
    *)
        echo "Usage: $0 [install|uninstall]"
        exit 1
        ;;
esac
