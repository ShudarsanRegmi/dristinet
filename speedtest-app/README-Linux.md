# Speedtest Monitor - Linux Implementation

A cross-platform network speedtest monitoring solution with SQLite database and systemd service integration.

## 🚀 Features

- **Background Data Collection**: Runs as systemd service, independent of web dashboard
- **SQLite Database**: Scalable, reliable data storage
- **Cross-Platform**: Linux support with Windows/macOS coming soon
- **Web Dashboard**: React-based frontend for data visualization
- **Service Management**: Easy start/stop/restart via systemctl
- **Automatic Installation**: One-command setup script
- **Resource Monitoring**: Performance thresholds and alerts

## 📋 Requirements

- **Linux Distribution**: Ubuntu 18+, Debian 10+, CentOS 7+, Fedora 30+, Arch Linux
- **Node.js**: Version 18+ (auto-installed by script)
- **Speedtest CLI**: Ookla's official CLI (auto-installed by script)
- **Root Access**: Required for installation only

## ⚡ Quick Installation

1. **Download and run the installer**:
   ```bash
   sudo ./scripts/install-linux.sh
   ```

2. **Access the dashboard**:
   Open http://localhost:3000 in your browser

That's it! The installer will:
- Install Node.js and Speedtest CLI
- Create systemd services
- Setup SQLite database
- Configure automatic startup
- Start background data collection

## 🔧 Manual Installation

If you prefer manual setup:

### 1. Install Dependencies
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Speedtest CLI
curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | sudo bash
sudo apt-get install -y speedtest
```

### 2. Setup Application
```bash
# Create installation directory
sudo mkdir -p /opt/speedtest-monitor
sudo chown $USER:$USER /opt/speedtest-monitor
cp -r * /opt/speedtest-monitor/

# Install dependencies
cd /opt/speedtest-monitor/backend
npm install
```

### 3. Initialize Database
```bash
node ../scripts/setup-database.js init
```

### 4. Install Services
```bash
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable speedtest-collector@$USER.service
sudo systemctl enable speedtest-dashboard@$USER.service
sudo systemctl start speedtest-collector@$USER.service
sudo systemctl start speedtest-dashboard@$USER.service
```

## 🎛️ Service Management

### Service Status
```bash
# Check service status
systemctl status speedtest-collector@speedtest.service
systemctl status speedtest-dashboard@speedtest.service

# View logs
journalctl -u speedtest-collector@speedtest.service -f
journalctl -u speedtest-dashboard@speedtest.service -f
```

### Service Control
```bash
# Restart services
sudo systemctl restart speedtest-collector@speedtest.service
sudo systemctl restart speedtest-dashboard@speedtest.service

# Stop services
sudo systemctl stop speedtest-collector@speedtest.service
sudo systemctl stop speedtest-dashboard@speedtest.service

# Disable auto-start
sudo systemctl disable speedtest-collector@speedtest.service
sudo systemctl disable speedtest-dashboard@speedtest.service
```

## 🗄️ Database Management

### Database Operations
```bash
cd /opt/speedtest-monitor

# Check database status
node scripts/setup-database.js stats

# Test database connection
node scripts/setup-database.js test

# Reinitialize database
node scripts/setup-database.js init
```

### Manual Speedtest
```bash
# Run speedtest collector manually
node services/speedtest-collector.js

# Check collected data
sqlite3 data/speedtest.db "SELECT COUNT(*) FROM speedtest_results;"
```

## 📊 Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│  Speedtest Service  │    │   Web Dashboard     │
│  (Background)       │    │   (On-demand)       │
│                     │    │                     │
│  • Scheduled tests  │    │  • Data visualization│
│  • Data collection  │    │  • Configuration    │
│  • System service   │    │  • Manual testing   │
└──────────┬──────────┘    └──────────┬──────────┘
           │                          │
           └──────────┬─────────────────┘
                      │
           ┌──────────▼──────────┐
           │   SQLite Database   │
           │   (speedtest.db)    │
           │                     │
           │  • Test results     │
           │  • Configuration    │
           │  • Service status   │
           └─────────────────────┘
```

## ⚙️ Configuration

Configuration is stored in the SQLite database and can be modified via:

1. **Web Dashboard**: Settings page
2. **Direct Database**: 
   ```sql
   UPDATE speedtest_config SET value = '15' WHERE key = 'test_interval_minutes';
   ```

### Available Settings
- `test_interval_minutes`: How often to run tests (default: 30)
- `auto_test_enabled`: Enable/disable automatic testing
- `max_records_keep`: Maximum database records to keep
- `preferred_server_id`: Specific speedtest server ID
- `min_download_threshold`: Alert threshold for download speed
- `min_upload_threshold`: Alert threshold for upload speed
- `max_latency_threshold`: Alert threshold for latency

## 🚫 Uninstallation

```bash
sudo ./scripts/install-linux.sh uninstall
```

This will:
- Stop and disable services
- Remove application files
- Remove systemd service files
- Remove service user
- Keep database files (backup manually if needed)

## 📁 File Locations

- **Application**: `/opt/speedtest-monitor/`
- **Database**: `/opt/speedtest-monitor/data/speedtest.db`
- **Logs**: `journalctl -u speedtest-collector@speedtest.service`
- **Services**: `/etc/systemd/system/speedtest-*.service`

## 🔍 Troubleshooting

### Service Won't Start
```bash
# Check service status and logs
systemctl status speedtest-collector@speedtest.service
journalctl -u speedtest-collector@speedtest.service --no-pager

# Common fixes:
sudo systemctl daemon-reload
sudo systemctl reset-failed
```

### Database Issues
```bash
# Test database
node scripts/setup-database.js test

# Reinitialize if corrupted
node scripts/setup-database.js init
```

### Speedtest CLI Issues
```bash
# Test speedtest CLI
speedtest --accept-license --accept-gdpr

# Reinstall if needed
sudo apt-get reinstall speedtest
```

## 📝 Development

### Development Setup
```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Run collector in foreground
npm run collector
```

### Logs and Debugging
```bash
# Service logs
npm run service-logs

# Database stats
npm run db-stats

# Service status
npm run service-status
```

## 🔄 Migration from Text Files

If you have existing speedtest data in text files:

```bash
# Create migration script and run
node scripts/migrate-from-text.js
```

## 🛡️ Security

The services run with minimal privileges:
- Dedicated service user (`speedtest`)
- Restricted file system access
- Resource limits (256MB memory for collector)
- No network privileges beyond speedtest execution

## 🚀 Next Steps

- **Windows Support**: Coming in v2.1
- **macOS Support**: Coming in v2.1
- **Desktop App**: Electron-based GUI
- **Alerts**: Email/Slack notifications
- **Export**: CSV/JSON data export
- **API**: REST API for integration

## 📞 Support

- **Issues**: Create GitHub issue
- **Logs**: Use `journalctl` commands above
- **Config**: Check `/opt/speedtest-monitor/data/speedtest.db`
