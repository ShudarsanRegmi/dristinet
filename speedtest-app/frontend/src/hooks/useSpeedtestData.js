import { useState, useEffect } from 'react'
import { speedtestAPI } from '../services/api'

// Function to get current filter params from localStorage
const getCurrentFilters = () => {
  const networkFilter = localStorage.getItem('globalNetworkFilter') || 'all'
  const interfaceFilter = localStorage.getItem('globalInterfaceFilter') || 'all'
  return { networkFilter, interfaceFilter }
}

const matchesFilter = (value, filter) => {
  if (!filter || filter === 'all') return true
  return String(value || 'Unknown').trim() === String(filter).trim()
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
      const currentFilters = getCurrentFilters()

      // API returns transformed items with frontend-friendly keys (downloadSpeed, uploadSpeed, latency)
      const transformedData = payload
        .map(item => ({
          timestamp: item.timestamp,
          downloadSpeed: item.downloadSpeed ?? item.download_mbps ?? 0,
          uploadSpeed: item.uploadSpeed ?? item.upload_mbps ?? 0,
          latency: item.latency ?? item.ping_ms ?? 0,
          jitter: item.jitter ?? item.jitter_ms ?? 0,
          serverName: item.serverName ?? item.server_name,
          serverLocation: item.serverLocation ?? item.server_location,
          isp: item.isp,
          network: item.network ?? item.wifi_name ?? item.wifiName ?? 'Unknown',
          interface: item.interface ?? item.interface_type ?? 'Unknown',
          hasError: item.hasError ?? false,
          raw: item
        }))
        .filter(item =>
          matchesFilter(item.network, currentFilters.networkFilter) &&
          matchesFilter(item.interface, currentFilters.interfaceFilter)
        )

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
      const currentFilters = getCurrentFilters()
      const allData = await speedtestAPI.getSpeedtestData({ limit: 2000, days: 365 })
      const filtered = allData.filter(item =>
        matchesFilter(item.network, currentFilters.networkFilter) &&
        matchesFilter(item.interface, currentFilters.interfaceFilter)
      )

      const validTests = filtered.filter(item => !item.hasError && item.downloadSpeed != null)
      const failedTests = filtered.filter(item => item.hasError || item.downloadSpeed == null)
      const downloadSpeeds = validTests.map(t => Number(t.downloadSpeed) || 0)
      const uploadSpeeds = validTests.map(t => Number(t.uploadSpeed) || 0)
      const latencies = validTests.map(t => Number(t.latency) || 0)

      const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
        hour: String(hour).padStart(2, '0'),
        samples: 0,
        avg_download: 0,
        avg_upload: 0,
        avg_ping: 0,
        avgDownload: 0,
        avgUpload: 0,
        avgLatency: 0,
      }))

      const sums = Array.from({ length: 24 }, () => ({ download: 0, upload: 0, latency: 0, samples: 0 }))

      validTests.forEach(test => {
        const hour = new Date(test.timestamp).getHours()
        if (Number.isNaN(hour)) return
        sums[hour].download += Number(test.downloadSpeed) || 0
        sums[hour].upload += Number(test.uploadSpeed) || 0
        sums[hour].latency += Number(test.latency) || 0
        sums[hour].samples += 1
      })

      sums.forEach((bucket, hour) => {
        if (bucket.samples > 0) {
          hourlyBuckets[hour] = {
            ...hourlyBuckets[hour],
            samples: bucket.samples,
            avg_download: bucket.download / bucket.samples,
            avg_upload: bucket.upload / bucket.samples,
            avg_ping: bucket.latency / bucket.samples,
            avgDownload: bucket.download / bucket.samples,
            avgUpload: bucket.upload / bucket.samples,
            avgLatency: bucket.latency / bucket.samples,
          }
        }
      })

      const mapped = {
        totalTests: filtered.length,
        avgDownload: downloadSpeeds.length ? downloadSpeeds.reduce((a, b) => a + b, 0) / downloadSpeeds.length : 0,
        avgUpload: uploadSpeeds.length ? uploadSpeeds.reduce((a, b) => a + b, 0) / uploadSpeeds.length : 0,
        avgLatency: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
        maxDownload: downloadSpeeds.length ? Math.max(...downloadSpeeds) : 0,
        minDownload: downloadSpeeds.length ? Math.min(...downloadSpeeds) : 0,
        maxUpload: uploadSpeeds.length ? Math.max(...uploadSpeeds) : 0,
        minUpload: uploadSpeeds.length ? Math.min(...uploadSpeeds) : 0,
        minLatency: latencies.length ? Math.min(...latencies) : 0,
        maxLatency: latencies.length ? Math.max(...latencies) : 0,
        failedTests: failedTests.length,
        successRate: filtered.length ? ((filtered.length - failedTests.length) / filtered.length) * 100 : 0,
        hourly: hourlyBuckets
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

    const handleFilterChange = () => {
      fetchStats()
    }

    window.addEventListener('globalFiltersChanged', handleFilterChange)
    return () => {
      window.removeEventListener('globalFiltersChanged', handleFilterChange)
    }
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
      const currentFilters = getCurrentFilters()
      const allData = await speedtestAPI.getSpeedtestData({ limit: 2000, days: 365 })
      const filtered = allData.filter(item =>
        matchesFilter(item.network, currentFilters.networkFilter) &&
        matchesFilter(item.interface, currentFilters.interfaceFilter)
      )

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)

      const byDay = new Map()

      filtered.forEach(item => {
        const date = new Date(item.timestamp)
        if (Number.isNaN(date.getTime()) || date < cutoff) return

        const dayKey = date.toISOString().slice(0, 10)
        if (!byDay.has(dayKey)) {
          byDay.set(dayKey, { day: dayKey, samples: 0, downloadSum: 0, uploadSum: 0, pingSum: 0 })
        }

        const bucket = byDay.get(dayKey)
        bucket.samples += 1
        bucket.downloadSum += Number(item.downloadSpeed) || 0
        bucket.uploadSum += Number(item.uploadSpeed) || 0
        bucket.pingSum += Number(item.latency) || 0
      })

      const result = [...byDay.values()]
        .map(bucket => ({
          day: bucket.day,
          samples: bucket.samples,
          avg_download: bucket.samples ? bucket.downloadSum / bucket.samples : 0,
          avg_upload: bucket.samples ? bucket.uploadSum / bucket.samples : 0,
          avg_ping: bucket.samples ? bucket.pingSum / bucket.samples : 0,
        }))
        .sort((a, b) => new Date(a.day) - new Date(b.day))

      setData(result)
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

    const handleFilterChange = () => {
      fetch()
    }

    window.addEventListener('globalFiltersChanged', handleFilterChange)
    return () => {
      window.removeEventListener('globalFiltersChanged', handleFilterChange)
    }
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
