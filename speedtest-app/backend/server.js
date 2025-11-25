#!/usr/bin/env node

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import path from 'path'
import { fileURLToPath } from 'url'
import DatabaseManager from '../scripts/setup-database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class SpeedtestAPI {
  constructor() {
    this.app = express()
    this.port = process.env.PORT || 3000
    this.dbManager = new DatabaseManager()
    this.db = null
  }

  async initialize() {
    console.log('🚀 Initializing Speedtest Monitor API Server...')
    
    try {
      // Initialize database
      this.db = await this.dbManager.getConnection()
      
      // Setup middleware
      this.setupMiddleware()
      
      // Setup routes
      this.setupRoutes()
      
      // Update service status
      await this.updateServiceStatus('running')
      
      console.log('✅ API Server initialized successfully')
      
    } catch (error) {
      console.error('❌ API Server initialization failed:', error.message)
      await this.updateServiceStatus('error', error.message)
      throw error
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Allow inline styles for development
    }))
    
    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true
    }))
    
    // Compression
    this.app.use(compression())
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true }))
    
    // Static files (serve frontend build)
    const frontendPath = path.join(__dirname, '..', 'frontend', 'dist')
    this.app.use(express.static(frontendPath))
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
      next()
    })
  }

  setupRoutes() {
    // API Routes
    this.app.get('/api/health', this.healthCheck.bind(this))
    this.app.get('/api/speedtest-data', this.getSpeedtestData.bind(this))
    this.app.get('/api/speedtest-stats', this.getSpeedtestStats.bind(this))
    this.app.get('/api/filters/networks', this.getNetworkFilters.bind(this))
    this.app.get('/api/filters/interfaces', this.getInterfaceFilters.bind(this))
    this.app.post('/api/run-speedtest', this.runManualSpeedtest.bind(this))
    this.app.get('/api/config', this.getConfig.bind(this))
    this.app.put('/api/config', this.updateConfig.bind(this))
    this.app.get('/api/service-status', this.getServiceStatus.bind(this))
    
    // Database management
    this.app.get('/api/database/stats', this.getDatabaseStats.bind(this))
    this.app.post('/api/database/cleanup', this.cleanupDatabase.bind(this))
    
    // Serve frontend for all other routes
    this.app.get('*', (req, res) => {
      const frontendPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
      res.sendFile(frontendPath)
    })
  }

  async healthCheck(req, res) {
    try {
      const dbTest = await this.db.get('SELECT 1 as test')
      const uptime = process.uptime()
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 60)} minutes`,
        database: dbTest ? 'connected' : 'disconnected',
        version: '2.0.0'
      })
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      })
    }
  }

  async getSpeedtestData(req, res) {
    try {
      const { network, interface: interfaceType, limit = 1000, offset = 0 } = req.query
      
      let query = 'SELECT * FROM speedtest_results WHERE test_status = "completed"'
      const params = []

      if (network && network !== 'all') {
        query += ' AND wifi_name = ?'
        params.push(network)
      }

      if (interfaceType && interfaceType !== 'all') {
        query += ' AND interface_type = ?'
        params.push(interfaceType)
      }

      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))

      const data = await this.db.all(query, params)
      
      res.json({
        success: true,
        data: data,
        count: data.length
      })
    } catch (error) {
      console.error('Error fetching speedtest data:', error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async getSpeedtestStats(req, res) {
    try {
      const stats = await this.db.get(`
        SELECT 
          COUNT(*) as totalTests,
          AVG(download_speed) as avgDownload,
          AVG(upload_speed) as avgUpload,
          AVG(ping_latency) as avgLatency,
          MIN(timestamp) as firstTest,
          MAX(timestamp) as lastTest,
          COUNT(CASE WHEN test_status = 'failed' THEN 1 END) as failedTests
        FROM speedtest_results
      `)
      
      res.json({
        success: true,
        stats: {
          totalTests: stats.totalTests || 0,
          avgDownload: stats.avgDownload || 0,
          avgUpload: stats.avgUpload || 0,
          avgLatency: stats.avgLatency || 0,
          firstTest: stats.firstTest,
          lastTest: stats.lastTest,
          failedTests: stats.failedTests || 0,
          successRate: stats.totalTests ? ((stats.totalTests - stats.failedTests) / stats.totalTests * 100) : 100
        }
      })
    } catch (error) {
      console.error('Error fetching speedtest stats:', error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async getNetworkFilters(req, res) {
    try {
      const networks = await this.db.all(`
        SELECT DISTINCT wifi_name 
        FROM speedtest_results 
        WHERE wifi_name IS NOT NULL 
        ORDER BY wifi_name
      `)
      
      res.json({
        success: true,
        networks: networks.map(n => n.wifi_name)
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async getInterfaceFilters(req, res) {
    try {
      const interfaces = await this.db.all(`
        SELECT DISTINCT interface_type 
        FROM speedtest_results 
        WHERE interface_type IS NOT NULL 
        ORDER BY interface_type
      `)
      
      res.json({
        success: true,
        interfaces: interfaces.map(i => i.interface_type)
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async runManualSpeedtest(req, res) {
    try {
      // This would trigger a manual speedtest
      // For now, return a placeholder response
      res.json({
        success: true,
        message: 'Manual speedtest triggered',
        note: 'This feature will be implemented to communicate with the collector service'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async getConfig(req, res) {
    try {
      const configs = await this.db.all('SELECT key, value, description FROM speedtest_config')
      const configObj = configs.reduce((acc, config) => {
        acc[config.key] = {
          value: config.value,
          description: config.description
        }
        return acc
      }, {})
      
      res.json({
        success: true,
        config: configObj
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async updateConfig(req, res) {
    try {
      const updates = req.body
      
      for (const [key, value] of Object.entries(updates)) {
        await this.db.run(`
          UPDATE speedtest_config 
          SET value = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE key = ?
        `, [value, key])
      }
      
      res.json({
        success: true,
        message: 'Configuration updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async getServiceStatus(req, res) {
    try {
      const services = await this.db.all(`
        SELECT service_name, status, pid, last_heartbeat, start_time, error_message
        FROM service_status
      `)
      
      res.json({
        success: true,
        services: services
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async getDatabaseStats(req, res) {
    try {
      const stats = await this.dbManager.getStats()
      res.json({
        success: true,
        stats: stats
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async cleanupDatabase(req, res) {
    try {
      const { maxRecords = 10000 } = req.body
      
      const result = await this.db.run(`
        DELETE FROM speedtest_results 
        WHERE id NOT IN (
          SELECT id FROM speedtest_results 
          ORDER BY timestamp DESC 
          LIMIT ?
        )
      `, [maxRecords])
      
      res.json({
        success: true,
        message: `Cleanup completed. ${result.changes} records removed.`
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async updateServiceStatus(status, errorMessage = null) {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO service_status 
        (service_name, status, pid, last_heartbeat, start_time, error_message) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'web-dashboard',
        status,
        process.pid,
        new Date().toISOString(),
        status === 'running' ? new Date().toISOString() : null,
        errorMessage
      ])
    } catch (error) {
      console.error('Failed to update service status:', error.message)
    }
  }

  async start() {
    const server = this.app.listen(this.port, () => {
      console.log(`🌐 Speedtest Monitor Dashboard running on http://localhost:${this.port}`)
      console.log(`📊 API endpoints available at http://localhost:${this.port}/api/`)
    })

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`)
      
      server.close(async () => {
        await this.updateServiceStatus('stopped')
        await this.dbManager.close()
        console.log('✅ Server shut down successfully')
        process.exit(0)
      })
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    return server
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const api = new SpeedtestAPI()
  
  try {
    await api.initialize()
    await api.start()
  } catch (error) {
    console.error('💥 Failed to start server:', error.message)
    process.exit(1)
  }
}

export default SpeedtestAPI
