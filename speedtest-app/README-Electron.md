# Speedtest Monitor - Desktop App

A cross-platform desktop application for monitoring internet speed over time, built with Electron and React.

## 🚀 Features

- **Real-time Speed Monitoring**: Automated speedtest collection in the background
- **Beautiful Dashboard**: Material-UI React interface with dark/light themes
- **Cross-platform**: Works on Linux, Windows, and macOS
- **Local Data Storage**: SQLite database, no cloud dependencies
- **User-friendly Installation**: One-click setup of background services
- **No System Changes**: Everything runs in user space

## 📦 Installation

### Download & Install

1. Download the installer for your platform from the [Releases](https://github.com/yourusername/speedtest-monitor/releases) page:
   - **Linux**: `.AppImage`, `.deb`, or `.rpm`
   - **Windows**: `.exe` installer
   - **macOS**: `.dmg` file

2. Run the installer and follow the setup wizard

3. On first launch, the app will prompt you to install background services

### What Gets Installed

During the first-time setup, the app will install:

- **Background Service**: Collects speedtest data automatically
- **SQLite Database**: Local data storage in your user directory
- **API Server**: Local REST API for the dashboard
- **Configuration Files**: Settings and preferences

**Installation Locations:**
- **Linux**: `~/.local/share/SpeedtestMonitor/`
- **Windows**: `%LOCALAPPDATA%\SpeedtestMonitor\`
- **macOS**: `~/Library/Application Support/SpeedtestMonitor/`

## 🛠️ How It Works

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Electron App  │    │Background Service│    │   SQLite DB     │
│  (React UI)     │◄──►│ (Node.js)        │◄──►│ (Local Storage) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         └─────────────►│  Speedtest CLI  │
                        │    (ookla)      │
                        └─────────────────┘
```

### Service Management

- **Linux**: Uses systemd user services
- **Windows**: Windows Services or background processes
- **macOS**: LaunchAgents

### Data Collection

1. Background service runs speedtests at configurable intervals (default: 30 minutes)
2. Results stored in local SQLite database
3. Web dashboard displays real-time data via REST API

## ⚙️ Configuration

### App Settings

Access settings through the app menu or navigate to Settings page:

- **Test Interval**: How often to run speedtests (15-120 minutes)
- **Speedtest Servers**: Auto-select or choose specific servers
- **Data Retention**: How long to keep historical data
- **Theme**: Light/Dark mode preference

### Advanced Configuration

Configuration file location:
- **Linux**: `~/.local/share/SpeedtestMonitor/config.json`
- **Windows**: `%LOCALAPPDATA%\SpeedtestMonitor\config.json`
- **macOS**: `~/Library/Application Support/SpeedtestMonitor/config.json`

Example config:
```json
{
  "speedtest": {
    "interval": 30,
    "enabled": true,
    "servers": []
  },
  "database": {
    "path": "data/speedtest.db"
  },
  "api": {
    "port": 3001,
    "host": "localhost"
  }
}
```

## 🔧 Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Speedtest CLI (ookla)
- Git

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/speedtest-monitor.git
   cd speedtest-monitor/speedtest-app
   ```

2. **Install dependencies:**
   ```bash
   # Frontend dependencies
   cd frontend
   npm install
   
   # Electron dependencies
   cd ../electron
   npm install
   ```

3. **Development mode:**
   ```bash
   # Start React dev server (terminal 1)
   cd frontend
   npm run dev
   
   # Start Electron (terminal 2)
   cd electron
   npm run dev
   ```

### Building

Build for all platforms:
```bash
./build-electron.sh
```

Build for specific platform:
```bash
cd electron
npm run dist:linux    # Linux (AppImage, deb, rpm)
npm run dist:windows  # Windows (NSIS installer)
npm run dist:mac      # macOS (DMG)
```

### Project Structure

```
speedtest-app/
├── electron/                 # Electron main process
│   ├── main.js              # App entry point
│   ├── installer.js         # Service installer
│   ├── preload.js           # Secure communication
│   └── package.json         # Electron config
├── frontend/                 # React dashboard
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # App pages
│   │   ├── context/         # React contexts
│   │   └── services/        # API client
│   └── package.json
├── services/                 # Background services
│   ├── speedtest-collector-electron.js
│   └── api-server-electron.js
├── database/                 # Database schema
│   └── schema.sql
└── build-electron.sh        # Build script
```

## 🐛 Troubleshooting

### Service Issues

**Service not starting:**
1. Check if speedtest CLI is installed: `speedtest --version`
2. Verify Node.js version: `node --version` (needs 18+)
3. Check service status from app menu: Help → Check Service Status

**Data not collecting:**
1. Check configuration in Settings
2. Verify speedtest interval is reasonable (>= 15 minutes)
3. Check database file exists in data directory

### Performance

**High CPU usage:**
- Reduce speedtest frequency in settings
- Check for multiple service instances

**Disk space:**
- Configure data retention in settings
- Clean old data: Settings → Data Management

### Platform-specific Issues

**Linux:**
```bash
# Check systemd user service
systemctl --user status speedtest-monitor

# View service logs
journalctl --user -u speedtest-monitor -f
```

**Windows:**
- Run as Administrator if permission issues
- Check Windows Defender/antivirus exclusions

**macOS:**
- Allow app in Security & Privacy settings
- Check LaunchAgent status

## 📊 Data Export

Export your data:
1. Open Settings → Data Management
2. Click "Export Data"
3. Choose format (CSV, JSON)
4. Select date range

## 🔒 Privacy & Security

- **No telemetry**: All data stays on your device
- **Local storage**: No cloud services or external databases
- **User permissions**: Services run with user privileges only
- **Open source**: Full source code available for audit

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ookla Speedtest CLI](https://www.speedtest.net/apps/cli) for speed testing
- [Electron](https://www.electronjs.org/) for cross-platform desktop framework
- [React](https://reactjs.org/) and [Material-UI](https://mui.com/) for the UI
- [Chart.js](https://www.chartjs.org/) for data visualization

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/speedtest-monitor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/speedtest-monitor/discussions)
- **Email**: support@yourproject.com
