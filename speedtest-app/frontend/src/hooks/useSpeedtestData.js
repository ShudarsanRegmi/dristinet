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
      const { networkFilter, interfaceFilter } = getCurrentFilters()
      
      const params = new URLSearchParams()
      if (networkFilter !== 'all') {
        params.append('network', networkFilter)
      }
      if (interfaceFilter !== 'all') {
        params.append('interface', interfaceFilter)
      }

      const url = params.toString() ? `/api/speedtest-data-filtered?${params}` : '/api/speedtest-data'
      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
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

    const validTests = data.filter(item => !item.hasError && item.downloadSpeed)
    const failedTests = data.filter(item => item.hasError)
    
    if (validTests.length === 0) {
      return {
        totalTests: data.length,
        validTests: 0,
        failedTests: failedTests.length,
        successRate: 0
      }
    }

    const downloadSpeeds = validTests.map(t => t.downloadSpeed).filter(Boolean)
    const uploadSpeeds = validTests.map(t => t.uploadSpeed).filter(Boolean)
    const latencies = validTests.map(t => t.latency).filter(Boolean)

    return {
      totalTests: data.length,
      validTests: validTests.length,
      failedTests: failedTests.length,
      successRate: (validTests.length / data.length) * 100,
      avgDownload: downloadSpeeds.reduce((a, b) => a + b, 0) / downloadSpeeds.length,
      avgUpload: uploadSpeeds.reduce((a, b) => a + b, 0) / uploadSpeeds.length,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      maxDownload: Math.max(...downloadSpeeds),
      minDownload: Math.min(...downloadSpeeds),
      maxUpload: Math.max(...uploadSpeeds),
      minUpload: Math.min(...uploadSpeeds),
      maxLatency: Math.max(...latencies),
      minLatency: Math.min(...latencies),
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
      const result = await speedtestAPI.getDailyStats()
      if (result.success) {
        setDailyData(result.data)
        setError(null)
      }
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
