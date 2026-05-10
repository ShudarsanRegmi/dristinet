#!/usr/bin/env node
// Simple API server for Speedtest Monitor Electron app
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');
const { spawn } = require('child_process');

class SpeedtestAPI {
    constructor() {
        this.app = express();
        this.platform = os.platform();
        this.appDataPath = this.getAppDataPath();
        this.dbPath = path.join(this.appDataPath, 'data', 'speedtest.db');
        this.port = process.env.PORT || 3001;
        
        this.setupMiddleware();
        this.setupRoutes();
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

    initializeDatabase() {
        try {
            this.db = new Database(this.dbPath);
            console.log('Connected to database');
        } catch (error) {
            console.error('Database connection failed:', error);
        }
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // Logging middleware
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                database: this.db ? 'connected' : 'disconnected'
            });
        });

        // Service status
        this.app.get('/api/status', (req, res) => {
            try {
                const status = this.db.prepare('SELECT * FROM service_status WHERE id = 1').get();
                const recentResults = this.db.prepare(`
                    SELECT COUNT(*) as count 
                    FROM speedtest_results 
                    WHERE timestamp > datetime('now', '-24 hours')
                `).get();

                res.json({
                    service: status || { status: 'unknown' },
                    database: { connected: true },
                    recent_tests: recentResults.count,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    error: error.message,
                    database: { connected: false }
                });
            }
        });

        // Get speedtest results
        this.app.get('/api/speedtest/results', (req, res) => {
            try {
                const { limit = 100, days = 30, cursor = null } = req.query;
                const maxLimit = Math.min(parseInt(limit, 10) || 100, 2000);

                let query = `
                    SELECT * FROM speedtest_results
                    WHERE timestamp > datetime('now', '-${days} days')
                `;
                const params = [];

                if (cursor) {
                    query += ' AND timestamp < ?';
                    params.push(cursor);
                }

                query += ' ORDER BY timestamp DESC LIMIT ?';
                params.push(maxLimit);

                const results = this.db.prepare(query).all(...params);
                const nextCursor = results.length ? results[results.length - 1].timestamp : null;

                res.json({
                    data: results,
                    pagination: {
                        limit: maxLimit,
                        nextCursor,
                        hasMore: results.length === maxLimit
                    }
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get daily rollups for long-term trend charts
        this.app.get('/api/speedtest/rollup/daily', (req, res) => {
            try {
                const { days = 365 } = req.query;

                const rows = this.db.prepare(`
                    SELECT
                        date(timestamp) AS day,
                        COUNT(*) AS samples,
                        AVG(download_mbps) AS avg_download,
                        AVG(upload_mbps) AS avg_upload,
                        AVG(ping_ms) AS avg_ping,
                        MIN(download_mbps) AS min_download,
                        MAX(download_mbps) AS max_download,
                        MIN(upload_mbps) AS min_upload,
                        MAX(upload_mbps) AS max_upload,
                        MIN(ping_ms) AS min_ping,
                        MAX(ping_ms) AS max_ping
                    FROM speedtest_results
                    WHERE timestamp > datetime('now', '-${days} days')
                    GROUP BY date(timestamp)
                    ORDER BY day DESC
                `).all();

                res.json({ data: rows });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get statistics
        this.app.get('/api/speedtest/stats', (req, res) => {
            try {
                const { days = 30 } = req.query;
                
                const stats = this.db.prepare(`
                    SELECT 
                        COUNT(*) as total_tests,
                        AVG(download_mbps) as avg_download,
                        AVG(upload_mbps) as avg_upload,
                        AVG(ping_ms) as avg_ping,
                        MAX(download_mbps) as max_download,
                        MAX(upload_mbps) as max_upload,
                        MIN(ping_ms) as min_ping,
                        MAX(ping_ms) as max_ping
                    FROM speedtest_results 
                    WHERE timestamp > datetime('now', '-${days} days')
                `).get();

                // Get hourly averages
                const hourlyStats = this.db.prepare(`
                    SELECT 
                        strftime('%H', timestamp) as hour,
                        AVG(download_mbps) as avg_download,
                        AVG(upload_mbps) as avg_upload,
                        AVG(ping_ms) as avg_ping
                    FROM speedtest_results 
                    WHERE timestamp > datetime('now', '-${days} days')
                    GROUP BY hour
                    ORDER BY hour
                `).all();

                res.json({
                    summary: stats,
                    hourly: hourlyStats
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Run manual speedtest
        this.app.post('/api/speedtest/run', async (req, res) => {
            try {
                const result = await this.runManualSpeedtest();
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get configuration
        this.app.get('/api/config', (req, res) => {
            try {
                const configPath = path.join(this.appDataPath, 'config.json');
                const config = require(configPath);
                res.json(config);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Update configuration
        this.app.put('/api/config', (req, res) => {
            try {
                const configPath = path.join(this.appDataPath, 'config.json');
                const fs = require('fs');
                
                fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Delete results
        this.app.delete('/api/speedtest/results', (req, res) => {
            try {
                const { days } = req.query;
                
                if (days) {
                    const result = this.db.prepare(`
                        DELETE FROM speedtest_results 
                        WHERE timestamp < datetime('now', '-${days} days')
                    `).run();
                    
                    res.json({ deleted: result.changes });
                } else {
                    res.status(400).json({ error: 'Days parameter required' });
                }
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Error handling
        this.app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ error: 'Internal server error' });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
    }

    async runManualSpeedtest() {
        return new Promise((resolve, reject) => {
            console.log('Running manual speedtest...');
            
            let rawOutput = '';
            let errorOutput = '';
            
            // Try full path first, then fallback to 'speedtest' in PATH
            const speedtestPaths = ['/snap/bin/speedtest', 'speedtest', '/usr/bin/speedtest', '/usr/local/bin/speedtest'];
            let speedtestCmd = null;
            
            for (const path of speedtestPaths) {
                try {
                    const fs = require('fs');
                    if (fs.existsSync(path) || path === 'speedtest') {
                        speedtestCmd = path;
                        break;
                    }
                } catch (e) {
                    // Continue to next path
                }
            }
            
            if (!speedtestCmd) {
                speedtestCmd = 'speedtest'; // Default fallback
            }
            
            console.log(`Using speedtest command: ${speedtestCmd}`);
            
            const speedtest = spawn(speedtestCmd, [
                '--accept-license',
                '--accept-gdpr',
                '--format=json'
            ], {
                timeout: 300000, // 5 minute timeout
                shell: true // Use shell to properly resolve PATH
            });

            speedtest.stdout.on('data', (data) => {
                rawOutput += data.toString();
            });

            speedtest.stderr.on('data', (data) => {
                errorOutput += data.toString();
                console.error('Speedtest stderr:', data.toString());
            });

            speedtest.on('error', (error) => {
                console.error('Speedtest spawn error:', error);
                reject(new Error(`Failed to spawn speedtest: ${error.message}`));
            });

            speedtest.on('close', (code) => {
                console.log(`Speedtest exited with code: ${code}`);
                
                if (code === 0) {
                    try {
                        const result = JSON.parse(rawOutput);
                        const processedResult = {
                            timestamp: new Date().toISOString(),
                            download_mbps: (result.download.bandwidth * 8 / 1000000).toFixed(2),
                            upload_mbps: (result.upload.bandwidth * 8 / 1000000).toFixed(2),
                            ping_ms: result.ping.latency.toFixed(2),
                            jitter_ms: result.ping.jitter?.toFixed(2) || null,
                            server_name: result.server?.name || null,
                            server_location: result.server?.location || null,
                            isp: result.isp || null
                        };
                        resolve(processedResult);
                    } catch (error) {
                        reject(new Error(`Failed to parse speedtest result: ${error.message}`));
                    }
                } else {
                    reject(new Error(`Speedtest failed with code ${code}: ${errorOutput}`));
                }
            });
        });
    }

    start() {
        this.server = this.app.listen(this.port, 'localhost', () => {
            console.log(`Speedtest API server running on http://localhost:${this.port}`);
        });

        return this.server;
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
        if (this.db) {
            this.db.close();
        }
    }
}

// Start server if run directly
if (require.main === module) {
    const api = new SpeedtestAPI();
    api.start();

    // Handle shutdown
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down gracefully');
        api.stop();
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down gracefully');
        api.stop();
        process.exit(0);
    });
}

module.exports = SpeedtestAPI;
