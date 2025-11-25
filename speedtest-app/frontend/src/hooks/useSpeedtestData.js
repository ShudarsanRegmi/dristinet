import { useState, useEffect, useMemo } from 'react'
import { speedtestAPI } from '../services/api'

// Function to get current filter params from localStorage
const getCurrentFilters = () => {
  const networkFilter = localStorage.getItem('globalNetworkFilter') || 'all'
  const interfaceFilter = localStorage.getItem('globalInterfaceFilter') || 'all'
  return { networkFilter, interfaceFilter }
}

export const useSpeedtestData = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use the updated API
      const result = await speedtestAPI.getAllData()
      
      // Transform the data to match the expected format
      const transformedData = result.map(item => ({
        timestamp: item.timestamp,
        downloadSpeed: item.download_mbps,
        uploadSpeed: item.upload_mbps,
        latency: item.ping_ms,
        jitter: item.jitter_ms,
        serverName: item.server_name,
        serverLocation: item.server_location,
        isp: item.isp,
        hasError: false
      }))

      setData(transformedData)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching speedtest data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Listen for custom filter change events
    const handleFilterChange = () => {
      fetchData()
    }

    window.addEventListener('globalFiltersChanged', handleFilterChange)
    return () => {
      window.removeEventListener('globalFiltersChanged', handleFilterChange)
    }
  }, [])

  return { data, loading, error, refetch: fetchData }
}

export const useSpeedtestStats = () => {
  const { data, loading, error } = useSpeedtestData()

  const stats = useMemo(() => {
    if (!data || data.length === 0) return {}

    const validTests = data.filter(item => !item.hasError && item.downloadSpeed != null && item.downloadSpeed > 0)
    const failedTests = data.filter(item => item.hasError)
    
    if (validTests.length === 0) {
      return {
        totalTests: data.length,
        validTests: 0,
        failedTests: failedTests.length,
        successRate: 0,
        avgDownload: 0,
        avgUpload: 0,
        avgLatency: 0
      }
    }

    const downloadSpeeds = validTests.map(t => t.downloadSpeed).filter(speed => speed != null && speed > 0)
    const uploadSpeeds = validTests.map(t => t.uploadSpeed).filter(speed => speed != null && speed > 0)
    const latencies = validTests.map(t => t.latency).filter(latency => latency != null && latency > 0)

    console.log('Stats Debug:', {
      totalTests: data.length,
      validTests: validTests.length,
      downloadSpeeds: downloadSpeeds.length,
      uploadSpeeds: uploadSpeeds.length,
      latencies: latencies.length,
      sampleDownload: downloadSpeeds[0],
      sampleUpload: uploadSpeeds[0],
      sampleLatency: latencies[0]
    })

    return {
      totalTests: data.length,
      validTests: validTests.length,
      failedTests: failedTests.length,
      successRate: (validTests.length / data.length) * 100,
      avgDownload: downloadSpeeds.length > 0 ? downloadSpeeds.reduce((a, b) => a + b, 0) / downloadSpeeds.length : 0,
      avgUpload: uploadSpeeds.length > 0 ? uploadSpeeds.reduce((a, b) => a + b, 0) / uploadSpeeds.length : 0,
      avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      maxDownload: downloadSpeeds.length > 0 ? Math.max(...downloadSpeeds) : 0,
      minDownload: downloadSpeeds.length > 0 ? Math.min(...downloadSpeeds) : 0,
      maxUpload: uploadSpeeds.length > 0 ? Math.max(...uploadSpeeds) : 0,
      minUpload: uploadSpeeds.length > 0 ? Math.min(...uploadSpeeds) : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
    }
  }, [data])

  return { stats, loading, error }
}

export const useDailyStats = () => {
  const [dailyData, setDailyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDailyStats = async () => {
    try {
      setLoading(true)
      const result = await speedtestAPI.getStats()
      setDailyData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching daily stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDailyStats()
  }, [])

  return { dailyData, loading, error, refetch: fetchDailyStats }
}

// Utility functions for global filters
export const setGlobalNetworkFilter = (network) => {
  localStorage.setItem('globalNetworkFilter', network)
  window.dispatchEvent(new Event('globalFiltersChanged'))
}

export const setGlobalInterfaceFilter = (interfaceValue) => {
  localStorage.setItem('globalInterfaceFilter', interfaceValue)
  window.dispatchEvent(new Event('globalFiltersChanged'))
}

export const resetGlobalFilters = () => {
  localStorage.setItem('globalNetworkFilter', 'all')
  localStorage.setItem('globalInterfaceFilter', 'all')
  window.dispatchEvent(new Event('globalFiltersChanged'))
}

export const getGlobalFilters = () => {
  return {
    network: localStorage.getItem('globalNetworkFilter') || 'all',
    interface: localStorage.getItem('globalInterfaceFilter') || 'all'
  }
}
