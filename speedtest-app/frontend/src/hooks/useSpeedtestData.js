import { useState, useEffect } from 'react'
import { speedtestAPI } from '../services/api'

export const useSpeedtestData = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const result = await speedtestAPI.getAllData()
      if (result.success) {
        setData(result.data)
        setError(null)
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
  }, [])

  return { data, loading, error, refetch: fetchData }
}

export const useSpeedtestStats = () => {
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const result = await speedtestAPI.getStats()
      if (result.success) {
        setStats(result.stats)
        setError(null)
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return { stats, loading, error, refetch: fetchStats }
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
