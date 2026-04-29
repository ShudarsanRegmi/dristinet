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

  // Fetch recent tests using the backend paginated endpoint.
  // Default to a reasonably large limit for admin UIs; components can fetch differently later.
  const fetchData = async ({ limit = 2000, days = 90 } = {}) => {
    try {
      setLoading(true)
      setError(null)

      const result = await speedtestAPI.getResults(limit, null, days)
      const payload = result?.data || []

      // API returns transformed items with frontend-friendly keys (downloadSpeed, uploadSpeed, latency)
      const transformedData = payload.map(item => ({
        timestamp: item.timestamp,
        downloadSpeed: item.downloadSpeed ?? item.download_mbps ?? 0,
        uploadSpeed: item.uploadSpeed ?? item.upload_mbps ?? 0,
        latency: item.latency ?? item.ping_ms ?? 0,
        jitter: item.jitter ?? item.jitter_ms ?? 0,
        serverName: item.serverName ?? item.server_name,
        serverLocation: item.serverLocation ?? item.server_location,
        isp: item.isp,
        hasError: item.hasError ?? false,
        raw: item
      }))

      setData(transformedData)
    } catch (err) {
      setError(err.message || String(err))
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
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const result = await speedtestAPI.getStats()
      const s = result?.summary || result || {}
      const mapped = {
        totalTests: s.total_tests ?? s.totalTests ?? 0,
        avgDownload: s.avg_download ?? s.avgDownload ?? 0,
        avgUpload: s.avg_upload ?? s.avgUpload ?? 0,
        avgLatency: s.avg_ping ?? s.avgLatency ?? 0,
        maxDownload: s.max_download ?? s.maxDownload ?? 0,
        minDownload: s.min_download ?? s.minDownload ?? 0,
        maxUpload: s.max_upload ?? s.maxUpload ?? 0,
        minUpload: s.min_upload ?? s.minUpload ?? 0,
        minLatency: s.min_ping ?? s.minLatency ?? 0,
        maxLatency: s.max_ping ?? s.maxLatency ?? 0,
        failedTests: s.failed_tests ?? 0,
        successRate: s.success_rate ?? (s.total_tests ? ((s.total_tests - (s.failed_tests||0)) / s.total_tests) * 100 : 0),
        hourly: result.hourly || []
      }

      setStats(mapped)
      setError(null)
    } catch (err) {
      setError(err.message || String(err))
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return { stats: stats || {}, loading, error, refetch: fetchStats }
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

export const useDailyRollup = (days = 90) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = async () => {
    try {
      setLoading(true)
      const result = await speedtestAPI.getDailyRollup(days)
      // result is expected to be an array of { day, samples, avg_download, avg_upload, avg_ping, ... }
      setData(result || [])
      setError(null)
    } catch (err) {
      setError(err.message || String(err))
      console.error('Error fetching daily rollup:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [days])

  return { data, loading, error, refetch: fetch }
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
