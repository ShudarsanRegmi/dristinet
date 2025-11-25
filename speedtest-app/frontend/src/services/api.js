import axios from 'axios'

class SpeedtestAPI {
  constructor() {
    this.baseURL = 'http://localhost:3001/api' // Default fallback
    this.client = null
    this.isElectron = window.electronAPI !== undefined
    
    this.initializeAPI()
  }

  async initializeAPI() {
    if (this.isElectron) {
      try {
        // Get dynamic API configuration from Electron
        const config = await window.electronAPI.getApiConfig()
        if (config && config.available) {
          this.baseURL = config.baseUrl
          console.log('Using dynamic API URL:', this.baseURL)
        } else {
          console.warn('Backend services not available, using fallback URL')
        }
        
        // Listen for API config updates
        window.electronAPI.onApiConfig((event, newConfig) => {
          if (newConfig && newConfig.baseUrl) {
            console.log('API configuration updated:', newConfig.baseUrl)
            this.baseURL = newConfig.baseUrl
            this.createClient() // Recreate client with new base URL
          }
        })
      } catch (error) {
        console.warn('Failed to get Electron API config, using fallback:', error)
      }
    }
    
    this.createClient()
  }

  createClient() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error)
        if (error.code === 'ECONNREFUSED' && this.isElectron) {
          // Try to restart services if in Electron
          this.handleConnectionError()
        }
        throw error
      }
    )
  }

  async handleConnectionError() {
    console.log('Connection refused, attempting to restart services...')
    try {
      const result = await window.electronAPI.restartServices()
      if (result && result.success) {
        console.log('Services restarted successfully')
        // Client will be updated via the onApiConfig listener
      } else {
        console.error('Failed to restart services:', result?.error)
      }
    } catch (error) {
      console.error('Error restarting services:', error)
    }
  }

  // Transform database format to frontend format
  transformSpeedtestData(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.transformSingleItem(item))
    }
    return this.transformSingleItem(data)
  }

  transformSingleItem(item) {
    return {
      id: item.id,
      timestamp: item.timestamp,
      downloadSpeed: item.download_mbps || 0,
      uploadSpeed: item.upload_mbps || 0,
      latency: item.ping_ms || 0,
      jitter: item.jitter_ms,
      serverId: item.server_id,
      serverName: item.server_name || 'Unknown',
      serverLocation: item.server_location || 'Unknown',
      isp: item.isp || 'Unknown',
      externalIp: item.external_ip,
      internalIp: item.internal_ip,
      interface: item.interface || 'Unknown',
      packetLoss: item.packet_loss_percent,
      testType: item.test_type || 'auto',
      hasError: item.error_message !== null,
      errorMessage: item.error_message
    }
  }

  // Get all speedtest results
  async getAllData() {
    const response = await this.client.get('/speedtest/results')
    return this.transformSpeedtestData(response.data)
  }

  // Get speedtest results for data hooks
  async getSpeedtestData() {
    return this.getAllData()
  }

  // Get statistical overview
  async getStats() {
    const response = await this.client.get('/speedtest/stats')
    return response.data
  }

  // Get speedtest results with limit
  async getResults(limit = 100) {
    const response = await this.client.get(`/speedtest/results?limit=${limit}`)
    return this.transformSpeedtestData(response.data)
  }

  // Get recent tests
  async getRecentTests(limit = 10) {
    return this.getResults(limit)
  }

  // Run manual speedtest
  async runSpeedtest() {
    const response = await this.client.post('/speedtest/run')
    return response.data
  }

  // Get service status
  async getStatus() {
    const response = await this.client.get('/status')
    return response.data
  }

  // Get health check
  async getHealth() {
    const response = await this.client.get('/health')
    return response.data
  }
}

// Create singleton instance
const apiInstance = new SpeedtestAPI()

export const speedtestAPI = apiInstance
export default apiInstance.client
