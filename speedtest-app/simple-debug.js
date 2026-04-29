#!/usr/bin/env node
// Simple debug script to monitor speedtest collector status

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

class SimpleCollectorDebugger {
    constructor() {
        this.appDataPath = path.join(os.homedir(), '.local', 'share', 'SpeedtestMonitor');
        this.dbPath = path.join(this.appDataPath, 'data', 'speedtest.db');
        this.configPath = path.join(this.appDataPath, 'config.json');
    }

    checkFileSystem() {
        console.log('🔍 Checking SpeedtestMonitor file system...\n');
        
        console.log('📂 App Data Path:', this.appDataPath);
        console.log('   Exists:', fs.existsSync(this.appDataPath) ? '✅' : '❌');
        
        console.log('📂 Database Path:', this.dbPath);
        console.log('   Exists:', fs.existsSync(this.dbPath) ? '✅' : '❌');
        
        if (fs.existsSync(this.dbPath)) {
            const stats = fs.statSync(this.dbPath);
            console.log('   Size:', stats.size, 'bytes');
            console.log('   Modified:', stats.mtime.toLocaleString());
        }
        
        console.log('📂 Config Path:', this.configPath);
        console.log('   Exists:', fs.existsSync(this.configPath) ? '✅' : '❌');
        
        if (fs.existsSync(this.configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                console.log('   Config:');
                console.log('     Interval:', config.speedtest?.interval, 'minutes');
                console.log('     Enabled:', config.speedtest?.enabled ? '✅' : '❌');
                console.log('     API Port:', config.api?.port);
            } catch (err) {
                console.log('   Config Error:', err.message);
            }
        }
        console.log();
    }

    checkProcesses() {
        console.log('🔄 Checking running processes...\n');
        
        return new Promise((resolve) => {
            exec('ps aux | grep speedtest-collector | grep -v grep', (error, stdout, stderr) => {
                if (stdout.trim()) {
                    console.log('✅ Speedtest Collector Process(es):');
                    stdout.trim().split('\n').forEach(line => {
                        const parts = line.split(/\s+/);
                        console.log(`   PID: ${parts[1]} | CPU: ${parts[2]}% | Memory: ${parts[3]}% | Start: ${parts[8]}`);
                        console.log(`   Command: ${parts.slice(10).join(' ')}`);
                    });
                } else {
                    console.log('❌ No speedtest-collector processes found');
                }
                
                exec('ps aux | grep api-server | grep -v grep', (error2, stdout2, stderr2) => {
                    if (stdout2.trim()) {
                        console.log('\n✅ API Server Process(es):');
                        stdout2.trim().split('\n').forEach(line => {
                            const parts = line.split(/\s+/);
                            console.log(`   PID: ${parts[1]} | CPU: ${parts[2]}% | Memory: ${parts[3]}% | Start: ${parts[8]}`);
                            console.log(`   Command: ${parts.slice(10).join(' ')}`);
                        });
                    } else {
                        console.log('\n❌ No api-server processes found');
                    }
                    console.log();
                    resolve();
                });
            });
        });
    }

    checkDatabase() {
        console.log('🗄️  Checking database with SQLite3...\n');
        
        if (!fs.existsSync(this.dbPath)) {
            console.log('❌ Database file does not exist!');
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            // Check record count
            exec(`sqlite3 "${this.dbPath}" "SELECT COUNT(*) FROM speedtest_results;"`, (error, stdout, stderr) => {
                if (error) {
                    console.log('❌ Database query error:', error.message);
                    resolve();
                    return;
                }
                
                const count = stdout.trim();
                console.log('📊 Total Records:', count);
                
                if (parseInt(count) > 0) {
                    // Check recent records
                    const query = `
                        SELECT id, timestamp, download_mbps, upload_mbps, ping_ms, 
                               CASE WHEN error_message IS NOT NULL THEN error_message ELSE 'OK' END as status
                        FROM speedtest_results 
                        ORDER BY timestamp DESC 
                        LIMIT 5
                    `;
                    
                    exec(`sqlite3 "${this.dbPath}" "${query}"`, (error2, stdout2, stderr2) => {
                        if (error2) {
                            console.log('❌ Recent records query error:', error2.message);
                        } else {
                            console.log('\n📋 Recent Records:');
                            console.log('ID | Timestamp           | Down↓  | Up↑   | Ping | Status');
                            console.log('---|---------------------|--------|-------|------|--------');
                            
                            stdout2.trim().split('\n').forEach(line => {
                                const parts = line.split('|');
                                if (parts.length >= 6) {
                                    const id = parts[0] || 'N/A';
                                    const timestamp = parts[1] || 'N/A';
                                    const down = parts[2] ? parseFloat(parts[2]).toFixed(1) : 'null';
                                    const up = parts[3] ? parseFloat(parts[3]).toFixed(1) : 'null';
                                    const ping = parts[4] ? parseFloat(parts[4]).toFixed(1) : 'null';
                                    const status = parts[5] || 'Unknown';
                                    
                                    console.log(`${id.padStart(2)} | ${timestamp} | ${down.padStart(6)} | ${up.padStart(5)} | ${ping.padStart(4)} | ${status}`);
                                }
                            });
                        }
                        
                        // Check for errors
                        exec(`sqlite3 "${this.dbPath}" "SELECT COUNT(*) FROM speedtest_results WHERE error_message IS NOT NULL;"`, (error3, stdout3, stderr3) => {
                            if (!error3) {
                                const errorCount = stdout3.trim();
                                console.log(`\n⚠️  Error Records: ${errorCount}`);
                                
                                if (parseInt(errorCount) > 0) {
                                    exec(`sqlite3 "${this.dbPath}" "SELECT timestamp, error_message FROM speedtest_results WHERE error_message IS NOT NULL ORDER BY timestamp DESC LIMIT 3;"`, (error4, stdout4, stderr4) => {
                                        if (!error4 && stdout4.trim()) {
                                            console.log('\n🚨 Recent Errors:');
                                            stdout4.trim().split('\n').forEach(line => {
                                                const parts = line.split('|');
                                                if (parts.length >= 2) {
                                                    console.log(`   ${parts[0]}: ${parts[1]}`);
                                                }
                                            });
                                        }
                                        console.log();
                                        resolve();
                                    });
                                } else {
                                    console.log();
                                    resolve();
                                }
                            } else {
                                console.log();
                                resolve();
                            }
                        });
                    });
                } else {
                    console.log();
                    resolve();
                }
            });
        });
    }

    checkSpeedtestCLI() {
        console.log('🚀 Testing speedtest CLI availability...\n');
        
        return new Promise((resolve) => {
            exec('which speedtest', (error, stdout, stderr) => {
                if (error) {
                    console.log('❌ Speedtest CLI not found in PATH');
                    console.log('   Try installing: sudo apt install speedtest-cli');
                    resolve();
                } else {
                    console.log('✅ Speedtest CLI found at:', stdout.trim());
                    
                    // Test speedtest version
                    exec('timeout 10 speedtest --version 2>/dev/null || timeout 10 speedtest-cli --version', (error, stdout, stderr) => {
                        if (error) {
                            console.log('⚠️  Could not get speedtest version (may be normal)');
                        } else {
                            console.log('✅ Speedtest version:', stdout.trim());
                        }
                        console.log();
                        resolve();
                    });
                }
            });
        });
    }

    async run() {
        console.log('🔧 SpeedTest Collector Debug Tool\n');
        console.log('='.repeat(50));
        
        this.checkFileSystem();
        await this.checkProcesses();
        await this.checkDatabase();
        await this.checkSpeedtestCLI();
        
        console.log('='.repeat(50));
        console.log('✅ Debug complete! Check above for any issues.\n');
    }
}

// Run the debugger
const debug = new SimpleCollectorDebugger();
debug.run().catch(err => console.error('Debug error:', err));
