// Electron App Installer - Service Setup
// This runs when the Electron app is first launched to set up background services

const { app, dialog, shell } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');

class SpeedtestInstaller {
    constructor() {
        this.platform = os.platform();
        this.isFirstRun = !this.isServiceInstalled();
        this.appDataPath = this.getAppDataPath();
        this.servicePath = path.join(this.appDataPath, 'services');
        this.databasePath = path.join(this.appDataPath, 'data');
    }

    getAppDataPath() {
        const appName = 'SpeedtestMonitor';
        
        switch (this.platform) {
            case 'win32':
                return path.join(os.homedir(), 'AppData', 'Local', appName);
            case 'darwin':
                return path.join(os.homedir(), 'Library', 'Application Support', appName);
            default: // linux
                return path.join(os.homedir(), '.local', 'share', appName);
        }
    }

    isServiceInstalled() {
        return fs.existsSync(path.join(this.getAppDataPath(), '.installed'));
    }

    async showWelcomeDialog() {
        const result = await dialog.showMessageBox({
            type: 'info',
            title: 'Welcome to Speedtest Monitor',
            message: 'First-time setup required',
            detail: 'This app needs to set up background services to collect speedtest data. This is a one-time setup process.',
            buttons: ['Install Services', 'Skip Setup', 'Learn More'],
            defaultId: 0,
            cancelId: 1
        });

        switch (result.response) {
            case 0: // Install
                return await this.performInstallation();
            case 1: // Skip
                return false;
            case 2: // Learn More
                await this.showDetailsDialog();
                return await this.showWelcomeDialog(); // Show again
        }
    }

    async showDetailsDialog() {
        await dialog.showMessageBox({
            type: 'info',
            title: 'Setup Details',
            message: 'What will be installed:',
            detail: `• Background service to collect speedtest data
• SQLite database for data storage  
• Configuration files
• Desktop shortcuts (optional)

Installation Location: ${this.appDataPath}

No system-wide changes are made. Everything is installed for your user account only.`,
            buttons: ['OK']
        });
    }

    async performInstallation() {
        try {
            // Show progress dialog
            const progressDialog = dialog.showMessageBox({
                type: 'info',
                title: 'Installing...',
                message: 'Setting up Speedtest Monitor services...',
                detail: 'Please wait while we install the required components.',
                buttons: []
            });

            // Create directories
            await fs.ensureDir(this.appDataPath);
            await fs.ensureDir(this.servicePath);
            await fs.ensureDir(this.databasePath);

            // Copy service files
            await this.copyServiceFiles();

            // Install dependencies FIRST
            await this.installDependencies();

            // Setup database AFTER dependencies are installed
            await this.setupDatabase();

            // Setup platform-specific services
            await this.setupPlatformServices();

            // Create installed marker
            await fs.writeFile(path.join(this.appDataPath, '.installed'), new Date().toISOString());

            // Close progress dialog
            // progressDialog is handled automatically

            await dialog.showMessageBox({
                type: 'info',
                title: 'Installation Complete',
                message: 'Speedtest Monitor is ready!',
                detail: 'The background service is now running and will collect speedtest data automatically.',
                buttons: ['OK']
            });

            return true;

        } catch (error) {
            console.error('Installation failed:', error);
            
            await dialog.showMessageBox({
                type: 'error',
                title: 'Installation Failed',
                message: 'Failed to set up services',
                detail: `Error: ${error.message}\n\nYou can try again or run in view-only mode.`,
                buttons: ['OK']
            });

            return false;
        }
    }

    async copyServiceFiles() {
        // In packaged app, resources are in process.resourcesPath
        const resourcesPath = process.resourcesPath || path.join(__dirname, 'resources');
        
        // Check if resources exist
        const servicesResourcePath = path.join(resourcesPath, 'resources', 'services');
        const databaseResourcePath = path.join(resourcesPath, 'resources', 'database');
        
        console.log('Looking for resources at:', resourcesPath);
        console.log('Services path:', servicesResourcePath);
        console.log('Database path:', databaseResourcePath);
        
        if (!await fs.pathExists(servicesResourcePath)) {
            // Try alternative path for development
            const devServicesPath = path.join(__dirname, 'resources', 'services');
            const devDatabasePath = path.join(__dirname, 'resources', 'database');
            
            if (await fs.pathExists(devServicesPath)) {
                console.log('Using development resources');
                await fs.copy(devServicesPath, this.servicePath);
                await fs.copy(devDatabasePath, path.join(this.appDataPath, 'database'));
            } else {
                throw new Error(`Services resources not found at ${servicesResourcePath} or ${devServicesPath}`);
            }
        } else {
            console.log('Using packaged resources');
            await fs.copy(servicesResourcePath, this.servicePath);
            await fs.copy(databaseResourcePath, path.join(this.appDataPath, 'database'));
        }

        // Copy configuration
        const configPath = path.join(this.appDataPath, 'config.json');
        if (!await fs.pathExists(configPath)) {
            await fs.writeJson(configPath, {
                speedtest: {
                    interval: 30, // minutes
                    enabled: true,
                    servers: [] // auto-select
                },
                database: {
                    path: path.join(this.databasePath, 'speedtest.db')
                },
                api: {
                    port: 3001,
                    host: 'localhost'
                }
            }, { spaces: 2 });
        }
    }

    async setupDatabase() {
        const dbPath = path.join(this.databasePath, 'speedtest.db');
        
        // Look for schema in the copied database directory
        const schemaPath = path.join(this.appDataPath, 'database', 'schema.sql');
        
        try {
            // Ensure database directory exists
            await fs.ensureDir(this.databasePath);
            
            // Check if schema file exists
            if (!await fs.pathExists(schemaPath)) {
                throw new Error(`Schema file not found at ${schemaPath}. Make sure copyServiceFiles() ran successfully.`);
            }
            
            console.log('Setting up database at:', dbPath);
            console.log('Using schema from:', schemaPath);
            
            // Create database setup script in the services directory (where node_modules is)
            const setupScript = `
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = '${dbPath.replace(/\\/g, '\\\\')}';
const schemaPath = '${schemaPath.replace(/\\/g, '\\\\')}';

console.log('Setting up database at:', dbPath);
console.log('Using schema from:', schemaPath);

try {
    // Create database
    const db = new Database(dbPath);
    console.log('Database created successfully');

    // Read and execute schema
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    console.log('Schema applied successfully');

    db.close();
    console.log('Database setup complete');
} catch (error) {
    console.error('Database setup error:', error);
    process.exit(1);
}
            `;
            
            // Put the setup script in the services directory where node_modules is
            const setupScriptPath = path.join(this.servicePath, 'setup-db.js');
            await fs.writeFile(setupScriptPath, setupScript);

            // Run database setup FROM the services directory
            return new Promise((resolve, reject) => {
                const child = spawn('node', ['setup-db.js'], {
                    cwd: this.servicePath,  // Run from services directory where node_modules is
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let output = '';
                let errorOutput = '';

                child.stdout.on('data', (data) => {
                    output += data.toString();
                    console.log('DB Setup:', data.toString().trim());
                });

                child.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    console.error('DB Setup Error:', data.toString().trim());
                });

                child.on('close', (code) => {
                    // Clean up setup script
                    fs.remove(setupScriptPath).catch(() => {});
                    
                    if (code === 0) {
                        console.log('Database setup completed successfully');
                        resolve();
                    } else {
                        console.error('Database setup failed with code:', code);
                        console.error('Error output:', errorOutput);
                        reject(new Error(`Database setup failed with code ${code}. Error: ${errorOutput}`));
                    }
                });

                child.on('error', (error) => {
                    fs.remove(setupScriptPath).catch(() => {});
                    reject(new Error(`Failed to run database setup: ${error.message}`));
                });
            });
        } catch (error) {
            throw new Error(`Database setup failed: ${error.message}`);
        }
    }

    async installDependencies() {
        const packageJsonPath = path.join(this.servicePath, 'package.json');
        
        // Check if package.json already exists (copied from resources)
        if (await fs.pathExists(packageJsonPath)) {
            console.log('Using existing package.json from resources');
        } else {
            // Create package.json for services
            await fs.writeJson(packageJsonPath, {
                name: 'speedtest-monitor-services',
                version: '1.0.0',
                description: 'Background services for Speedtest Monitor',
                main: 'speedtest-collector.js',
                dependencies: {
                    'better-sqlite3': '^11.3.0',
                    'node-cron': '^3.0.3',
                    'express': '^4.21.1',
                    'cors': '^2.8.5'
                }
            }, { spaces: 2 });
        }

        // Install dependencies
        return new Promise((resolve, reject) => {
            const child = spawn('npm', ['install', '--production'], {
                cwd: this.servicePath,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
                console.log('NPM:', data.toString().trim());
            });

            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
                console.error('NPM Error:', data.toString().trim());
            });

            child.on('close', (code) => {
                if (code === 0) {
                    console.log('Dependencies installed successfully');
                    resolve();
                } else {
                    console.error('npm install failed with code:', code);
                    console.error('Error output:', errorOutput);
                    reject(new Error(`npm install failed with code ${code}. Error: ${errorOutput}`));
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to run npm install: ${error.message}`));
            });
        });
    }

    async setupPlatformServices() {
        switch (this.platform) {
            case 'win32':
                return await this.setupWindowsService();
            case 'darwin':
                return await this.setupMacOSService();
            default:
                return await this.setupLinuxService();
        }
    }

    async setupLinuxService() {
        const servicePath = path.join(os.homedir(), '.config', 'systemd', 'user');
        await fs.ensureDir(servicePath);

        // Create speedtest collector service
        const collectorServiceContent = `[Unit]
Description=Speedtest Monitor Collector
After=network.target

[Service]
Type=simple
ExecStart=node ${path.join(this.servicePath, 'speedtest-collector.js')}
WorkingDirectory=${this.servicePath}
Restart=always
RestartSec=10
Environment=HOME=${os.homedir()}
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
`;

        await fs.writeFile(
            path.join(servicePath, 'speedtest-monitor-collector.service'),
            collectorServiceContent
        );

        // Create API server service
        const apiServiceContent = `[Unit]
Description=Speedtest Monitor API Server
After=network.target

[Service]
Type=simple
ExecStart=node ${path.join(this.servicePath, 'api-server.js')}
WorkingDirectory=${this.servicePath}
Restart=always
RestartSec=10
Environment=HOME=${os.homedir()}
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
`;

        await fs.writeFile(
            path.join(servicePath, 'speedtest-monitor-api.service'),
            apiServiceContent
        );

        // Enable and start both services
        return new Promise((resolve, reject) => {
            exec('systemctl --user daemon-reload && systemctl --user enable speedtest-monitor-collector.service && systemctl --user enable speedtest-monitor-api.service && systemctl --user start speedtest-monitor-collector.service && systemctl --user start speedtest-monitor-api.service', 
                (error, stdout, stderr) => {
                    if (error) {
                        console.warn('Failed to setup systemd service:', error.message);
                        // Fallback to manual start
                        this.startServiceManually();
                        resolve();
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    async setupWindowsService() {
        // Create Windows service using node-windows or similar
        // For now, start manually
        this.startServiceManually();
    }

    async setupMacOSService() {
        // Create LaunchAgent for macOS
        const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.speedtest.monitor.plist');
        
        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.speedtest.monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>node</string>
        <string>${path.join(this.servicePath, 'speedtest-collector.js')}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${this.servicePath}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
`;

        await fs.writeFile(plistPath, plistContent);
        
        // Load the service
        return new Promise((resolve, reject) => {
            exec(`launchctl load ${plistPath}`, (error) => {
                if (error) {
                    console.warn('Failed to load launchd service:', error.message);
                    this.startServiceManually();
                }
                resolve();
            });
        });
    }

    startServiceManually() {
        // Start the speedtest collector service
        const collectorScript = path.join(this.servicePath, 'speedtest-collector.js');
        
        const collectorChild = spawn('node', [collectorScript], {
            cwd: this.servicePath,
            detached: true,
            stdio: 'ignore'
        });

        collectorChild.unref();
        console.log('Started speedtest collector service');

        // Start the API server
        const apiScript = path.join(this.servicePath, 'api-server.js');
        
        const apiChild = spawn('node', [apiScript], {
            cwd: this.servicePath,
            detached: true,
            stdio: 'ignore'
        });

        apiChild.unref();
        console.log('Started API server on port 3001');
    }

    async checkServiceStatus() {
        // Check if service is running by trying to connect to API
        return new Promise((resolve) => {
            const http = require('http');
            const req = http.request({
                hostname: 'localhost',
                port: 3001,
                path: '/api/status',
                timeout: 5000
            }, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });

            req.end();
        });
    }

    async uninstall() {
        const result = await dialog.showMessageBox({
            type: 'question',
            title: 'Uninstall Services',
            message: 'Remove all Speedtest Monitor data and services?',
            detail: 'This will delete all collected speedtest data and stop background services.',
            buttons: ['Remove Everything', 'Keep Data', 'Cancel'],
            defaultId: 2,
            cancelId: 2
        });

        if (result.response === 2) return; // Cancel

        try {
            // Stop services
            if (this.platform === 'linux') {
                exec('systemctl --user stop speedtest-monitor.service');
                exec('systemctl --user disable speedtest-monitor.service');
            } else if (this.platform === 'darwin') {
                const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.speedtest.monitor.plist');
                exec(`launchctl unload ${plistPath}`);
                fs.remove(plistPath);
            }

            if (result.response === 0) {
                // Remove everything
                await fs.remove(this.appDataPath);
            } else {
                // Keep data, just remove services
                await fs.remove(this.servicePath);
                await fs.remove(path.join(this.appDataPath, '.installed'));
            }

            await dialog.showMessageBox({
                type: 'info',
                title: 'Uninstall Complete',
                message: 'Services have been removed successfully.',
                buttons: ['OK']
            });

        } catch (error) {
            await dialog.showMessageBox({
                type: 'error',
                title: 'Uninstall Error',
                message: 'Some components could not be removed.',
                detail: error.message,
                buttons: ['OK']
            });
        }
    }
}

module.exports = SpeedtestInstaller;
