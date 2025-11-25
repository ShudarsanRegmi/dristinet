#!/usr/bin/env node
// Simple cross-platform speedtest collector for Electron app
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const Database = require('better-sqlite3');

class SpeedtestCollector {
    constructor() {
        this.platform = os.platform();
        this.appDataPath = this.getAppDataPath();
        this.configPath = path.join(this.appDataPath, 'config.json');
        this.dbPath = path.join(this.appDataPath, 'data', 'speedtest.db');
        this.isRunning = false;
        this.intervalId = null;
        
        this.initializeConfig();
        this.initializeDatabase();
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

    initializeConfig() {
        // Ensure directories exist
        const dataDir = path.join(this.appDataPath, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Create default config if it doesn't exist
        if (!fs.existsSync(this.configPath)) {
            const defaultConfig = {
                speedtest: {
                    interval: 30, // minutes
                    enabled: true,
                    servers: [] // auto-select
                },
                database: {
                    path: this.dbPath
                },
                api: {
                    port: 3001,
                    host: 'localhost'
                },
                lastRun: null
            };
            
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
            this.config = defaultConfig;
        } else {
            this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        }
    }

    initializeDatabase() {
        try {
            this.db = new Database(this.dbPath);
            
            // Create tables if they don't exist
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS speedtest_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    download_mbps REAL NOT NULL,
                    upload_mbps REAL NOT NULL,
                    ping_ms REAL NOT NULL,
                    jitter_ms REAL,
                    server_id TEXT,
                    server_name TEXT,
                    server_location TEXT,
                    isp TEXT,
                    external_ip TEXT,
                    internal_ip TEXT,
                    packet_loss REAL DEFAULT 0,
                    result_url TEXT,
                    raw_data TEXT
                );

                CREATE TABLE IF NOT EXISTS speedtest_config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS service_status (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    last_run DATETIME,
                    next_run DATETIME,
                    status TEXT DEFAULT 'stopped',
                    error_count INTEGER DEFAULT 0,
                    last_error TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_timestamp ON speedtest_results(timestamp);
                CREATE INDEX IF NOT EXISTS idx_download ON speedtest_results(download_mbps);
                CREATE INDEX IF NOT EXISTS idx_upload ON speedtest_results(upload_mbps);
            `);

            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            process.exit(1);
        }
    }

    async runSpeedtest() {
        return new Promise((resolve, reject) => {
            console.log('Running speedtest...');
            
            const startTime = Date.now();
            let rawOutput = '';
            
            const speedtest = spawn('speedtest', [
                '--accept-license',
                '--accept-gdpr',
                '--format=json'
            ]);

            speedtest.stdout.on('data', (data) => {
                rawOutput += data.toString();
            });

            speedtest.stderr.on('data', (data) => {
                console.error('Speedtest stderr:', data.toString());
            });

            speedtest.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(rawOutput);
                        const processedResult = this.processSpeedtestResult(result);
                        resolve(processedResult);
                    } catch (error) {
                        reject(new Error(`Failed to parse speedtest result: ${error.message}`));
                    }
                } else {
                    reject(new Error(`Speedtest failed with code ${code}`));
                }
            });

            speedtest.on('error', (error) => {
                reject(new Error(`Failed to run speedtest: ${error.message}`));
            });
        });
    }

    processSpeedtestResult(result) {
        // Get network info
        const networkInfo = this.getNetworkInfo();
        
        return {
            timestamp: new Date().toISOString(),
            download_mbps: (result.download.bandwidth * 8 / 1000000).toFixed(2),
            upload_mbps: (result.upload.bandwidth * 8 / 1000000).toFixed(2),
            ping_ms: result.ping.latency.toFixed(2),
            jitter_ms: result.ping.jitter?.toFixed(2) || null,
            server_id: result.server?.id || null,
            server_name: result.server?.name || null,
            server_location: result.server?.location || null,
            isp: result.isp || null,
            external_ip: result.interface?.externalIp || null,
            internal_ip: networkInfo.internal_ip,
            packet_loss: result.packetLoss?.toFixed(2) || 0,
            result_url: result.result?.url || null,
            raw_data: JSON.stringify(result)
        };
    }

    getNetworkInfo() {
        const interfaces = os.networkInterfaces();
        let internal_ip = null;

        for (const [name, addrs] of Object.entries(interfaces)) {
            if (addrs) {
                for (const addr of addrs) {
                    if (addr.family === 'IPv4' && !addr.internal) {
                        internal_ip = addr.address;
                        break;
                    }
                }
            }
            if (internal_ip) break;
        }

        return { internal_ip };
    }

    saveResult(result) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO speedtest_results (
                    timestamp, download_mbps, upload_mbps, ping_ms, jitter_ms,
                    server_id, server_name, server_location, isp, external_ip,
                    internal_ip, packet_loss, result_url, raw_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                result.timestamp, result.download_mbps, result.upload_mbps,
                result.ping_ms, result.jitter_ms, result.server_id,
                result.server_name, result.server_location, result.isp,
                result.external_ip, result.internal_ip, result.packet_loss,
                result.result_url, result.raw_data
            );

            console.log(`Saved speedtest result: ${result.download_mbps} Mbps down, ${result.upload_mbps} Mbps up`);
        } catch (error) {
            console.error('Failed to save result:', error);
            throw error;
        }
    }

    updateStatus(status, error = null) {
        try {
            const now = new Date().toISOString();
            const nextRun = new Date(Date.now() + this.config.speedtest.interval * 60 * 1000).toISOString();

            this.db.prepare(`
                INSERT OR REPLACE INTO service_status (
                    id, last_run, next_run, status, 
                    error_count, last_error
                ) VALUES (
                    1, ?, ?, ?, 
                    COALESCE((SELECT error_count FROM service_status WHERE id = 1), 0) + ?,
                    ?
                )
            `).run(now, nextRun, status, error ? 1 : 0, error);

        } catch (err) {
            console.error('Failed to update status:', err);
        }
    }

    async performSpeedtest() {
        try {
            this.updateStatus('running');
            
            const result = await this.runSpeedtest();
            this.saveResult(result);
            
            this.updateStatus('idle');
            
            // Update config with last run time
            this.config.lastRun = new Date().toISOString();
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            
        } catch (error) {
            console.error('Speedtest failed:', error);
            this.updateStatus('error', error.message);
        }
    }

    start() {
        if (this.isRunning) {
            console.log('Collector is already running');
            return;
        }

        if (!this.config.speedtest.enabled) {
            console.log('Speedtest collection is disabled');
            return;
        }

        console.log(`Starting speedtest collector (interval: ${this.config.speedtest.interval} minutes)`);
        
        this.isRunning = true;
        this.updateStatus('starting');

        // Run initial test
        this.performSpeedtest();

        // Schedule recurring tests
        this.intervalId = setInterval(() => {
            this.performSpeedtest();
        }, this.config.speedtest.interval * 60 * 1000);

        console.log('Speedtest collector started');
    }

    stop() {
        if (!this.isRunning) {
            console.log('Collector is not running');
            return;
        }

        console.log('Stopping speedtest collector...');
        
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.updateStatus('stopped');
        
        if (this.db) {
            this.db.close();
        }

        console.log('Speedtest collector stopped');
    }

    getStatus() {
        try {
            const status = this.db.prepare('SELECT * FROM service_status WHERE id = 1').get();
            return {
                running: this.isRunning,
                config: this.config,
                status: status || { status: 'unknown' }
            };
        } catch (error) {
            return {
                running: this.isRunning,
                config: this.config,
                status: { status: 'error', last_error: error.message }
            };
        }
    }
}

// Handle process signals for graceful shutdown
let collector = null;

function shutdown() {
    console.log('Received shutdown signal');
    if (collector) {
        collector.stop();
    }
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGQUIT', shutdown);

// Start the collector
if (require.main === module) {
    collector = new SpeedtestCollector();
    collector.start();

    // Keep the process alive
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        if (collector) {
            collector.updateStatus('error', error.message);
        }
    });

    console.log('Speedtest collector service started. Press Ctrl+C to stop.');
}

module.exports = SpeedtestCollector;
