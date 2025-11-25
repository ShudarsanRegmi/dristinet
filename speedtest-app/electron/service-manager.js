const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');
const { app } = require('electron');

class ServiceManager {
    constructor() {
        this.apiServerProcess = null;
        this.collectorProcess = null;
        this.apiPort = null;
        this.servicesPath = null;
        this.isShuttingDown = false;
        
        // Setup services path
        this.setupServicesPath();
    }

    setupServicesPath() {
        if (process.env.NODE_ENV === 'development') {
            // Development mode - use project services
            this.servicesPath = path.join(__dirname, '..', 'services');
        } else {
            // Production mode - use installed services
            const homeDir = require('os').homedir();
            this.servicesPath = path.join(homeDir, '.local', 'share', 'SpeedtestMonitor', 'services');
            
            // If not found, try Electron user data directory
            if (!fs.existsSync(this.servicesPath)) {
                try {
                    const userDataPath = app ? app.getPath('userData') : null;
                    if (userDataPath) {
                        const electronServicesPath = path.join(userDataPath, 'services');
                        if (fs.existsSync(electronServicesPath)) {
                            this.servicesPath = electronServicesPath;
                        }
                    }
                } catch (error) {
                    console.warn('Could not get Electron user data path');
                }
            }
        }
        
        console.log('Services path:', this.servicesPath);
    }

    async findAvailablePort(startPort = 3001, maxPort = 3010) {
        return new Promise((resolve, reject) => {
            const tryPort = (port) => {
                if (port > maxPort) {
                    reject(new Error(`No available ports found between ${startPort}-${maxPort}`));
                    return;
                }

                const server = net.createServer();
                
                server.listen(port, 'localhost', () => {
                    server.close(() => {
                        resolve(port);
                    });
                });
                
                server.on('error', () => {
                    tryPort(port + 1);
                });
            };
            
            tryPort(startPort);
        });
    }

    async startApiServer() {
        try {
            // Find an available port
            this.apiPort = await this.findAvailablePort();
            console.log(`Starting API server on port ${this.apiPort}`);

            const apiServerScript = path.join(this.servicesPath, 'api-server.js');
            
            // Check if file exists
            if (!fs.existsSync(apiServerScript)) {
                throw new Error(`API server script not found: ${apiServerScript}`);
            }

            this.apiServerProcess = spawn('node', [apiServerScript], {
                cwd: this.servicesPath,
                env: {
                    ...process.env,
                    PORT: this.apiPort,
                    NODE_ENV: 'production'
                },
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Handle output
            this.apiServerProcess.stdout.on('data', (data) => {
                console.log(`API Server: ${data.toString().trim()}`);
            });

            this.apiServerProcess.stderr.on('data', (data) => {
                console.error(`API Server Error: ${data.toString().trim()}`);
            });

            this.apiServerProcess.on('exit', (code) => {
                console.log(`API Server exited with code ${code}`);
                if (!this.isShuttingDown && code !== 0) {
                    // Restart after 5 seconds if crashed
                    setTimeout(() => this.startApiServer(), 5000);
                }
            });

            // Wait for server to start
            await this.waitForServerReady(this.apiPort);
            console.log(`API server started successfully on port ${this.apiPort}`);
            
            return this.apiPort;
        } catch (error) {
            console.error('Failed to start API server:', error);
            throw error;
        }
    }

    async startCollector() {
        try {
            console.log('Starting speedtest collector service');
            
            const collectorScript = path.join(this.servicesPath, 'speedtest-collector.js');
            
            // Check if file exists
            if (!fs.existsSync(collectorScript)) {
                throw new Error(`Collector script not found: ${collectorScript}`);
            }

            this.collectorProcess = spawn('node', [collectorScript], {
                cwd: this.servicesPath,
                env: {
                    ...process.env,
                    NODE_ENV: 'production'
                },
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Handle output
            this.collectorProcess.stdout.on('data', (data) => {
                console.log(`Collector: ${data.toString().trim()}`);
            });

            this.collectorProcess.stderr.on('data', (data) => {
                console.error(`Collector Error: ${data.toString().trim()}`);
            });

            this.collectorProcess.on('exit', (code) => {
                console.log(`Collector exited with code ${code}`);
                if (!this.isShuttingDown && code !== 0) {
                    // Restart after 10 seconds if crashed
                    setTimeout(() => this.startCollector(), 10000);
                }
            });

            console.log('Speedtest collector started successfully');
        } catch (error) {
            console.error('Failed to start collector:', error);
            // Don't throw error for collector - app can work without it
        }
    }

    async waitForServerReady(port, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkServer = () => {
                const socket = new net.Socket();
                
                socket.connect(port, 'localhost', () => {
                    socket.end();
                    resolve();
                });
                
                socket.on('error', () => {
                    if (Date.now() - startTime > timeout) {
                        reject(new Error(`Server not ready after ${timeout}ms`));
                    } else {
                        setTimeout(checkServer, 500);
                    }
                });
            };
            
            checkServer();
        });
    }

    async startAllServices() {
        try {
            console.log('Starting backend services...');
            
            // Start API server first (frontend needs this)
            await this.startApiServer();
            
            // Start collector in parallel (can run independently)
            this.startCollector().catch(err => {
                console.warn('Collector failed to start, continuing without it:', err.message);
            });
            
            return {
                apiPort: this.apiPort,
                success: true
            };
        } catch (error) {
            console.error('Failed to start services:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    stopAllServices() {
        this.isShuttingDown = true;
        console.log('Stopping backend services...');
        
        if (this.apiServerProcess) {
            console.log('Stopping API server...');
            this.apiServerProcess.kill('SIGTERM');
            this.apiServerProcess = null;
        }
        
        if (this.collectorProcess) {
            console.log('Stopping collector...');
            this.collectorProcess.kill('SIGTERM');
            this.collectorProcess = null;
        }
        
        this.apiPort = null;
    }

    getApiPort() {
        return this.apiPort;
    }

    isRunning() {
        return this.apiServerProcess && !this.apiServerProcess.killed;
    }

    getStatus() {
        return {
            apiServer: {
                running: this.apiServerProcess && !this.apiServerProcess.killed,
                port: this.apiPort,
                pid: this.apiServerProcess?.pid
            },
            collector: {
                running: this.collectorProcess && !this.collectorProcess.killed,
                pid: this.collectorProcess?.pid
            }
        };
    }
}

module.exports = ServiceManager;
