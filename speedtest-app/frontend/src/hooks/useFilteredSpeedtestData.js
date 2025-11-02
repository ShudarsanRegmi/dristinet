import { useState, useEffect, useMemo } from 'react'

// Simple hook for fetching speedtest data with URL-based filters
export const useSpeedtestDataWithFilters = (networkFilter = 'all', interfaceFilter = 'all') => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch filtered speedtest data
  const fetchFilteredData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (networkFilter !== 'all') {
        params.append('network', networkFilter)
      }
      if (interfaceFilter !== 'all') {
        params.append('interface', interfaceFilter)
      }

      const response = await fetch(`/api/speedtest-data-filtered?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError(err.message)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch data when filters change
  useEffect(() => {
    fetchFilteredData()
  }, [networkFilter, interfaceFilter])

  return { data, loading, error, refetch: fetchFilteredData }
}

// Legacy hook - keep for backward compatibility but use global filtering
export const useFilteredSpeedtestData = () => {
  const [data, setData] = useState([])
  const [networks, setNetworks] = useState([])
  const [interfaces, setInterfaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    network: 'all',
    interface: 'all'
  })

  // Fetch available networks and interfaces
  const fetchFilters = async () => {
    try {
      const [networksRes, interfacesRes] = await Promise.all([
        fetch('/api/filters/networks'),
        fetch('/api/filters/interfaces')
      ])

      const networksData = await networksRes.json()
      const interfacesData = await interfacesRes.json()

      if (networksData.success) {
        setNetworks(networksData.networks)
      }

      if (interfacesData.success) {
        setInterfaces(interfacesData.interfaces)
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err)
    }
  }

  // Fetch filtered speedtest data
  const fetchFilteredData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.network !== 'all') {
        params.append('network', filters.network)
      }
      if (filters.interface !== 'all') {
        params.append('interface', filters.interface)
      }

      const response = await fetch(`/api/speedtest-data-filtered?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError(err.message)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchFilters()
    fetchFilteredData()
  }, [])

  // Refetch data when filters change
  useEffect(() => {
    if (!loading) {  // Avoid refetch during initial load
      fetchFilteredData()
    }
  }, [filters.network, filters.interface])

  // Update specific filter
  const updateFilter = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      network: 'all',
      interface: 'all'
    })
  }

  // Get filter summary for display
  const getFilterSummary = () => {
    const activeFilters = []
    
    if (filters.network !== 'all') {
      activeFilters.push(`Network: ${filters.network}`)
    }
    
    if (filters.interface !== 'all') {
      activeFilters.push(`Interface: ${filters.interface}`)
    }

    if (activeFilters.length === 0) {
      return 'All data'
    }

    return activeFilters.join(', ')
  }

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.network !== 'all' || filters.interface !== 'all'
  }, [filters])

  // Calculate filtered statistics
  const filteredStats = useMemo(() => {
    if (!data || data.length === 0) return null

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

  return {
    // Data
    data,
    networks,
    interfaces,
    filteredStats,
    
    // State
    loading,
    error,
    filters,
    hasActiveFilters,
    
    // Actions
    updateFilter,
    resetFilters,
    refreshData: fetchFilteredData,
    
    // Helpers
    getFilterSummary
  }
}

// Legacy hook for backward compatibility - now uses filtered data with all filters
export const useSpeedtestData = () => {
  const { data, loading, error } = useFilteredSpeedtestData()
  return { data, loading, error }
}

// Legacy hook for stats - now uses filtered stats
export const useSpeedtestStats = () => {
  const { filteredStats: stats, loading, error } = useFilteredSpeedtestData()
  return { stats, loading, error }
}
