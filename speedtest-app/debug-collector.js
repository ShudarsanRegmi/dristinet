#!/usr/bin/env node
// Debug script to monitor speedtest collector status and logs

const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

class CollectorDebugger {
    constructor() {
        this.appDataPath = path.join(os.homedir(), '.local', 'share', 'SpeedtestMonitor');
        this.dbPath = path.join(this.appDataPath, 'data', 'speedtest.db');
        this.configPath = path.join(this.appDataPath, 'config.json');
    }

    checkFileSystem() {
        console.log('🔍 Checking SpeedtestMonitor file system...\n');
        
        console.log('📂 App Data Path:', this.appDataPath);
        console.log('   Exists:', fs.existsSync(this.appDataPath));
        
        console.log('📂 Database Path:', this.dbPath);
        console.log('   Exists:', fs.existsSync(this.dbPath));
        
        if (fs.existsSync(this.dbPath)) {
            const stats = fs.statSync(this.dbPath);
            console.log('   Size:', stats.size, 'bytes');
            console.log('   Modified:', stats.mtime);
        }
        
        console.log('📂 Config Path:', this.configPath);
        console.log('   Exists:', fs.existsSync(this.configPath));
        
        if (fs.existsSync(this.configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                console.log('   Config:', JSON.stringify(config, null, 2));
            } catch (err) {
                console.log('   Config Error:', err.message);
            }
        }
        console.log();
    }

    checkDatabase() {
        console.log('🗄️  Checking database contents...\n');
        
        if (!fs.existsSync(this.dbPath)) {
            console.log('❌ Database file does not exist!');
            return;
        }

        try {
            const db = new Database(this.dbPath, { readonly: true });
            
            // Check table structure
            const schema = db.prepare("PRAGMA table_info(speedtest_results)").all();
            console.log('📋 Table Schema:');
            schema.forEach(col => {
                console.log(`   ${col.cid}: ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULLABLE'}`);
            });
            console.log();
            
            // Check record count
            const count = db.prepare("SELECT COUNT(*) as total FROM speedtest_results").get();
            console.log('📊 Total Records:', count.total);
            
            if (count.total > 0) {
                // Check recent records
                const recent = db.prepare(`
                    SELECT id, timestamp, download_mbps, upload_mbps, ping_ms, error_message,
                           CASE 
                               WHEN error_message IS NOT NULL THEN 'FAILED'
                               WHEN download_mbps IS NULL THEN 'INCOMPLETE' 
                               ELSE 'SUCCESS' 
                           END as status
                    FROM speedtest_results 
                    ORDER BY timestamp DESC 
                    LIMIT 10
                `).all();
                
                console.log('\n📋 Recent Records:');
                console.log('ID | Timestamp           | Down↓  | Up↑   | Ping | Status');
                console.log('---|---------------------|--------|-------|------|--------');
                
                recent.forEach(row => {
                    const down = row.download_mbps ? row.download_mbps.toFixed(1) : 'null';
                    const up = row.upload_mbps ? row.upload_mbps.toFixed(1) : 'null';
                    const ping = row.ping_ms ? row.ping_ms.toFixed(1) : 'null';
                    const status = row.status + (row.error_message ? ` (${row.error_message.substring(0, 30)}...)` : '');
                    
                    console.log(`${row.id.toString().padStart(2)} | ${row.timestamp} | ${down.padStart(6)} | ${up.padStart(5)} | ${ping.padStart(4)} | ${status}`);
                });
                
                // Check for errors
                const errorCount = db.prepare("SELECT COUNT(*) as errors FROM speedtest_results WHERE error_message IS NOT NULL").get();
                console.log(`\n⚠️  Error Records: ${errorCount.errors}`);
                
                if (errorCount.errors > 0) {
                    const errors = db.prepare("SELECT timestamp, error_message FROM speedtest_results WHERE error_message IS NOT NULL ORDER BY timestamp DESC LIMIT 5").all();
                    console.log('\n🚨 Recent Errors:');
                    errors.forEach(err => {
                        console.log(`   ${err.timestamp}: ${err.error_message}`);
                    });
                }
            }
            
            db.close();
        } catch (err) {
            console.log('❌ Database Error:', err.message);
        }
        console.log();
    }

    checkProcesses() {
        console.log('🔄 Checking running processes...\n');
        
        const { exec } = require('child_process');
        
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
            console.log();
        });

        exec('ps aux | grep api-server | grep -v grep', (error, stdout, stderr) => {
            if (stdout.trim()) {
                console.log('✅ API Server Process(es):');
                stdout.trim().split('\n').forEach(line => {
                    const parts = line.split(/\s+/);
                    console.log(`   PID: ${parts[1]} | CPU: ${parts[2]}% | Memory: ${parts[3]}% | Start: ${parts[8]}`);
                    console.log(`   Command: ${parts.slice(10).join(' ')}`);
                });
            } else {
                console.log('❌ No api-server processes found');
            }
            console.log();
        });
    }

    testSpeedtestCLI() {
        console.log('🚀 Testing speedtest CLI availability...\n');
        
        const { exec } = require('child_process');
        
        exec('which speedtest', (error, stdout, stderr) => {
            if (error) {
                console.log('❌ Speedtest CLI not found in PATH');
                console.log('   Try installing: sudo apt install speedtest-cli');
            } else {
                console.log('✅ Speedtest CLI found at:', stdout.trim());
                
                // Test a quick speedtest
                console.log('🔍 Testing speedtest command...');
                exec('timeout 30 speedtest --version', (error, stdout, stderr) => {
                    if (error) {
                        console.log('❌ Speedtest version check failed:', error.message);
                    } else {
                        console.log('✅ Speedtest version:', stdout.trim());
                    }
                });
            }
        });
    }

    run() {
        console.log('🔧 SpeedTest Collector Debug Tool\n');
        console.log('='.repeat(50));
        
        this.checkFileSystem();
        this.checkDatabase();
        this.checkProcesses();
        this.testSpeedtestCLI();
        
        console.log('='.repeat(50));
        console.log('✅ Debug complete! Check above for any issues.\n');
    }
}

// Run the debugger
const debug = new CollectorDebugger();
debug.run();
