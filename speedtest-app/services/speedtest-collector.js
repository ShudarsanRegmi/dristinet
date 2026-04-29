#!/usr/bin/env node

import { spawn } from 'child_process'
import DatabaseManager from '../scripts/setup-database.js'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class SpeedtestCollector {
  constructor() {
    this.dbManager = new DatabaseManager()
    this.db = null
    this.isRunning = false
    this.intervalId = null
    this.config = {}
    this.processId = process.pid
  }

  async initialize() {
    console.log('🚀 Initializing Speedtest Collector Service...')
    
    try {
      // Initialize database
      this.db = await this.dbManager.getConnection()
      
      // Load configuration
      await this.loadConfig()
      
      // Update service status
      await this.updateServiceStatus('running', 'Service started successfully')
      
      console.log(`✅ Speedtest Collector Service initialized (PID: ${this.processId})`)
      console.log(`⏰ Test interval: ${this.config.test_interval_minutes} minutes`)
      console.log(`🔧 Auto testing: ${this.config.auto_test_enabled}`)
      
    } catch (error) {
      console.error('❌ Service initialization failed:', error.message)
      await this.updateServiceStatus('error', error.message)
      throw error
    }
  }

  async loadConfig() {
    try {
      const configRows = await this.db.all('SELECT key, value FROM speedtest_config')
      this.config = configRows.reduce((acc, row) => {
        acc[row.key] = row.value
        return acc
      }, {})
      
      console.log('📋 Configuration loaded successfully')
    } catch (error) {
      console.error('⚠️  Failed to load configuration, using defaults')
      this.config = {
        test_interval_minutes: '1',  // Changed from 30 to 1 minute
        auto_test_enabled: 'true',
        max_records_keep: '10000'
      }
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Service is already running')
      return
    }

    const autoTestEnabled = this.config.auto_test_enabled === 'true'
    if (!autoTestEnabled) {
      console.log('⏸️  Auto testing is disabled')
      return
    }

    const intervalMinutes = parseInt(this.config.test_interval_minutes) || 1  // Changed default from 30 to 1
    const intervalMs = intervalMinutes * 60 * 1000

    console.log(`▶️  Starting scheduled speedtests every ${intervalMinutes} minutes`)

    // Run initial test immediately
    await this.runSpeedtest()

    // Schedule recurring tests
    this.intervalId = setInterval(async () => {
      await this.runSpeedtest()
    }, intervalMs)

    this.isRunning = true
    
    // Update heartbeat every minute
    setInterval(() => {
      this.updateServiceStatus('running', null, new Date())
    }, 60000)
  }

  async stop() {
    console.log('⏹️  Stopping speedtest collector service...')
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    
    this.isRunning = false
    await this.updateServiceStatus('stopped', 'Service stopped by request')
    
    if (this.db) {
      await this.dbManager.close()
    }
    
    console.log('✅ Service stopped successfully')
  }

  async runSpeedtest() {
    const testId = await this.createTestRecord('running')
    
    try {
      console.log(`🔄 Running speedtest (ID: ${testId})...`)
      
      const result = await this.executeSpeedtest()
      const enrichedResult = await this.enrichResultWithSystemInfo(result)
      
      await this.updateTestRecord(testId, enrichedResult, 'completed')
      
      console.log(`✅ Speedtest completed (ID: ${testId})`)
      console.log(`   Download: ${enrichedResult.download_speed.toFixed(2)} Mbps`)
      console.log(`   Upload: ${enrichedResult.upload_speed.toFixed(2)} Mbps`)
      console.log(`   Latency: ${enrichedResult.ping_latency.toFixed(2)} ms`)
      
      // Check for performance issues
      await this.checkPerformanceThresholds(enrichedResult)
      
      return { id: testId, ...enrichedResult }
      
    } catch (error) {
      console.error(`❌ Speedtest failed (ID: ${testId}):`, error.message)
      await this.updateTestRecord(testId, { error: error.message }, 'failed')
      throw error
    }
  }

  async executeSpeedtest() {
    return new Promise((resolve, reject) => {
      const args = ['--format=json', '--accept-license', '--accept-gdpr']
      
      if (this.config.preferred_server_id) {
        args.push(`--server-id=${this.config.preferred_server_id}`)
      }
      
      const speedtest = spawn('speedtest', args)
      let output = ''
      let errorOutput = ''

      speedtest.stdout.on('data', (data) => {
        output += data.toString()
      })

      speedtest.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      speedtest.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output)
            resolve(this.parseSpeedtestResult(result))
          } catch (err) {
            reject(new Error('Failed to parse speedtest output: ' + err.message))
          }
        } else {
          reject(new Error(`Speedtest failed (code ${code}): ${errorOutput}`))
        }
      })

      speedtest.on('error', (error) => {
        reject(new Error(`Speedtest execution error: ${error.message}`))
      })

      // Timeout after 3 minutes
      setTimeout(() => {
        speedtest.kill()
        reject(new Error('Speedtest timeout'))
      }, 180000)
    })
  }

  parseSpeedtestResult(result) {
    return {
      download_speed: result.download?.bandwidth ? (result.download.bandwidth / 125000) : 0, // Convert to Mbps
      upload_speed: result.upload?.bandwidth ? (result.upload.bandwidth / 125000) : 0,
      ping_latency: result.ping?.latency || 0,
      jitter: result.ping?.jitter || 0,
      server_name: result.server?.name || '',
      server_id: result.server?.id?.toString() || '',
      isp: result.isp || '',
      result_url: result.result?.url || '',
      packet_loss: result.packetLoss || 0
    }
  }

  async enrichResultWithSystemInfo(result) {
    const systemInfo = {
      hostname: os.hostname(),
      uptime: this.formatUptime(os.uptime()),
      user_name: os.userInfo().username,
      local_ip: this.getLocalIP(),
      interface_type: 'Unknown',
      wifi_name: null
    }

    // Try to get network interface info
    try {
      const networkInfo = await this.getNetworkInfo()
      Object.assign(systemInfo, networkInfo)
    } catch (error) {
      console.warn('⚠️  Could not get network info:', error.message)
    }

    return { ...result, ...systemInfo }
  }

  async getNetworkInfo() {
    return new Promise((resolve) => {
      // Try to get WiFi SSID using iwgetid
      const iwgetid = spawn('iwgetid', ['-r'])
      let ssid = ''

      iwgetid.stdout.on('data', (data) => {
        ssid = data.toString().trim()
      })

      iwgetid.on('close', () => {
        resolve({
          wifi_name: ssid || null,
          interface_type: ssid ? 'WiFi' : 'Ethernet'
        })
      })

      iwgetid.on('error', () => {
        resolve({
          wifi_name: null,
          interface_type: 'Unknown'
        })
      })

      // Timeout
      setTimeout(() => {
        iwgetid.kill()
        resolve({ wifi_name: null, interface_type: 'Unknown' })
      }, 5000)
    })
  }

  getLocalIP() {
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address
        }
      }
    }
    return 'unknown'
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `up ${days} days, ${hours} hours, ${minutes} minutes`
  }

  async createTestRecord(status) {
    const result = await this.db.run(
      'INSERT INTO speedtest_results (test_status) VALUES (?)',
      [status]
    )
    return result.lastID
  }

  async updateTestRecord(id, data, status) {
    const fields = []
    const values = []

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'error') {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    fields.push('test_status = ?', 'updated_at = CURRENT_TIMESTAMP')
    values.push(status)

    await this.db.run(
      `UPDATE speedtest_results SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    )
  }

  async updateServiceStatus(status, errorMessage = null, heartbeat = new Date()) {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO service_status 
        (service_name, status, pid, last_heartbeat, start_time, error_message) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'speedtest-collector',
        status,
        this.processId,
        heartbeat.toISOString(),
        status === 'running' ? new Date().toISOString() : null,
        errorMessage
      ])
    } catch (error) {
      console.error('Failed to update service status:', error.message)
    }
  }

  async checkPerformanceThresholds(result) {
    const minDownload = parseFloat(this.config.min_download_threshold) || 5.0
    const minUpload = parseFloat(this.config.min_upload_threshold) || 1.0
    const maxLatency = parseFloat(this.config.max_latency_threshold) || 100.0

    const issues = []

    if (result.download_speed < minDownload) {
      issues.push(`Low download speed: ${result.download_speed.toFixed(2)} Mbps (threshold: ${minDownload} Mbps)`)
    }

    if (result.upload_speed < minUpload) {
      issues.push(`Low upload speed: ${result.upload_speed.toFixed(2)} Mbps (threshold: ${minUpload} Mbps)`)
    }

    if (result.ping_latency > maxLatency) {
      issues.push(`High latency: ${result.ping_latency.toFixed(2)} ms (threshold: ${maxLatency} ms)`)
    }

    if (issues.length > 0) {
      console.log('⚠️  Performance issues detected:')
      issues.forEach(issue => console.log(`   - ${issue}`))
    }
  }
}

// Signal handlers for graceful shutdown
async function gracefulShutdown(collector) {
  console.log('\n🛑 Received shutdown signal')
  await collector.stop()
  process.exit(0)
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const collector = new SpeedtestCollector()

  // Handle shutdown signals
  process.on('SIGINT', () => gracefulShutdown(collector))
  process.on('SIGTERM', () => gracefulShutdown(collector))

  try {
    await collector.initialize()
    await collector.start()
    
    console.log('🎯 Speedtest Collector Service is running...')
    console.log('   Press Ctrl+C to stop')
    
  } catch (error) {
    console.error('💥 Service failed to start:', error.message)
    process.exit(1)
  }
}

export default SpeedtestCollector
