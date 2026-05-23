#!/usr/bin/env node

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class DatabaseManager {
  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'speedtest.db')
    this.schemaPath = path.join(__dirname, '..', 'database', 'schema.sql')
    this.db = null
  }

  async initialize() {
    console.log('🔧 Initializing database...')
    
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
        console.log(`📁 Created data directory: ${dataDir}`)
      }

      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      })

      // Configure SQLite for better performance
      await this.db.exec('PRAGMA journal_mode = WAL')
      await this.db.exec('PRAGMA synchronous = NORMAL')
      await this.db.exec('PRAGMA cache_size = 1000')
      await this.db.exec('PRAGMA foreign_keys = ON')

      // Run schema
      await this.runSchema()

      console.log(`✅ Database initialized successfully at: ${this.dbPath}`)
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message)
      throw error
    }
  }

  async runSchema() {
    if (!fs.existsSync(this.schemaPath)) {
      throw new Error(`Schema file not found: ${this.schemaPath}`)
    }

    const schema = fs.readFileSync(this.schemaPath, 'utf8')
    
    // Split and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0)
    
    for (const statement of statements) {
      try {
        await this.db.exec(statement + ';')
      } catch (error) {
        console.warn(`Warning: Schema statement failed: ${error.message}`)
      }
    }

    console.log('📊 Database schema applied successfully')
  }

  async getConnection() {
    if (!this.db) {
      await this.initialize()
    }
    return this.db
  }

  async close() {
    if (this.db) {
      await this.db.close()
      this.db = null
    }
  }

  async testConnection() {
    try {
      const db = await this.getConnection()
      const result = await db.get('SELECT COUNT(*) as count FROM speedtest_config')
      console.log(`🔍 Database test successful - ${result.count} config entries`)
      return true
    } catch (error) {
      console.error('❌ Database test failed:', error.message)
      return false
    }
  }

  async getStats() {
    try {
      const db = await this.getConnection()
      
      const totalTests = await db.get('SELECT COUNT(*) as count FROM speedtest_results')
      const latestTest = await db.get('SELECT timestamp FROM speedtest_results ORDER BY timestamp DESC LIMIT 1')
      const dbSize = fs.statSync(this.dbPath).size
      
      return {
        totalTests: totalTests.count,
        latestTest: latestTest?.timestamp || 'None',
        dbSizeMB: (dbSize / 1024 / 1024).toFixed(2),
        dbPath: this.dbPath
      }
    } catch (error) {
      return { error: error.message }
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbManager = new DatabaseManager()
  
  const command = process.argv[2] || 'init'
  
  switch (command) {
    case 'init':
      await dbManager.initialize()
      break
      
    case 'test':
      const success = await dbManager.testConnection()
      process.exit(success ? 0 : 1)
      
    case 'stats':
      const stats = await dbManager.getStats()
      console.log('\n📈 Database Statistics:')
      console.log(`   Total Tests: ${stats.totalTests || stats.error}`)
      console.log(`   Latest Test: ${stats.latestTest || 'N/A'}`)
      console.log(`   DB Size: ${stats.dbSizeMB || 'N/A'} MB`)
      console.log(`   DB Path: ${stats.dbPath || 'N/A'}`)
      break
      
    default:
      console.log('Usage: node setup-database.js [init|test|stats]')
      process.exit(1)
  }
  
  await dbManager.close()
}

export default DatabaseManager
