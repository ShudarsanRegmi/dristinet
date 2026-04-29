import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Container,
  Paper,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  Speed as SpeedIcon,
  Upload as UploadIcon,
  AccessTime as LatencyIcon,
  Wifi as WifiIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import StatsCard from '../components/StatsCard'

const LiveSpeedtest = () => {
  const STORAGE_KEY = 'liveSpeedtestStateV1'
  const [testState, setTestState] = useState('idle') // idle, running, completed, error
  const [testId, setTestId] = useState(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [error, setError] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const pollIntervalRef = useRef(null)

  const clearPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  useEffect(() => {
    // Restore state when returning to this page after route/tab switch.
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setTestState(parsed.testState || 'idle')
        setTestId(parsed.testId || null)
        setProgress(parsed.progress || 0)
        setResult(parsed.result || null)
        setComparison(parsed.comparison || null)
        setError(parsed.error || null)
      }
    } catch (err) {
      console.error('Failed to restore live speedtest state:', err)
    } finally {
      setHydrated(true)
    }

    return () => {
      clearPolling()
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          testState,
          testId,
          progress,
          result,
          comparison,
          error,
          updatedAt: new Date().toISOString(),
        })
      )
    } catch (err) {
      console.error('Failed to persist live speedtest state:', err)
    }
  }, [hydrated, testState, testId, progress, result, comparison, error])

  const startSpeedtest = async () => {
    try {
      clearPolling()
      setTestState('running')
      setTestId(null)
      setProgress(0)
      setResult(null)
      setComparison(null)
      setError(null)

      const response = await fetch('/api/speedtest-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Safe JSON parse: backend may return empty or non-json on error
      let data = null
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : null
      } catch (err) {
        console.error('Failed to parse startSpeedtest response as JSON', err)
        throw new Error('Invalid response from server')
      }

      if (data && data.success) {
        setTestId(data.test_id)
        pollTestStatus(data.test_id)
      } else {
        throw new Error((data && data.error) || 'Failed to start speedtest')
      }
    } catch (err) {
      setTestState('error')
      setError(err.message)
    }
  }

  const pollTestStatus = async (id) => {
    clearPolling()

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/speedtest-status/${id}`)

        let data = null
        try {
          const text = await response.text()
          data = text ? JSON.parse(text) : null
        } catch (err) {
          console.error('Failed to parse pollTestStatus response as JSON', err)
          clearPolling()
          setTestState('error')
          setError('Invalid status response from server')
          return
        }

        if (data && data.success) {
          const status = data.status
          setProgress(status.progress || 0)

          if (status.status === 'completed') {
            clearPolling()
            setTestState('completed')
            setResult(status.result)

            // Get comparison analysis
            if (status.result) {
              await getComparativeAnalysis(status.result)
            }
          } else if (status.status === 'error') {
            clearPolling()
            setTestState('error')
            setError(status.error || 'Speedtest failed')
          }
        } else {
          // Unexpected payload
          console.error('Unexpected poll status payload', data)
        }
      } catch (err) {
        clearPolling()
        setTestState('error')
        setError('Failed to get test status')
      }
    }, 1000) // Poll every second
  }

  useEffect(() => {
    // If user navigates away and returns while a test is still running, resume polling.
    if (!hydrated) return
    if (testState === 'running' && testId) {
      pollTestStatus(testId)
    }
  }, [hydrated, testState, testId])

  const getComparativeAnalysis = async (testResult) => {
    try {
      const response = await fetch('/api/speedtest-compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_result: testResult
        })
      })
      let data = null
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : null
      } catch (err) {
        console.error('Failed to parse comparative analysis response as JSON', err)
        return
      }

      if (data && data.success) {
        setComparison(data.comparison)
      } else {
        console.error('Comparative analysis failed or returned invalid payload', data)
      }
    } catch (err) {
      console.error('Failed to get comparative analysis:', err)
    }
  }

  const resetTest = () => {
    clearPolling()
    setTestState('idle')
    setTestId(null)
    setProgress(0)
    setResult(null)
    setComparison(null)
    setError(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.error('Failed to clear persisted live speedtest state:', err)
    }
  }

  const getProgressColor = () => {
    if (progress < 30) return 'info'
    if (progress < 70) return 'warning'
    return 'success'
  }

  const getPerformanceColor = (percentile) => {
    if (percentile >= 75) return 'success'
    if (percentile >= 25) return 'warning'
    return 'error'
  }

  const formatSpeed = (speed) => {
    return speed ? speed.toFixed(1) : '0.0'
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
            Run a live speedtest and get comparative analysis with your historical data
          </Typography>
        </Box>
      </motion.div>

      {/* Test Control Panel */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              Internet Speed Test
            </Typography>
            
            <AnimatePresence mode="wait">
              {testState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Click the button below to start a comprehensive speed test
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<PlayIcon />}
                    onClick={startSpeedtest}
                    sx={{ 
                      px: 4, 
                      py: 1.5, 
                      fontSize: '1.1rem',
                      borderRadius: 2,
                    }}
                  >
                    Start Speed Test
                  </Button>
                </motion.div>
              )}

              {testState === 'running' && (
                <motion.div
                  key="running"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Box sx={{ mb: 3 }}>
                    <CircularProgress size={60} sx={{ mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Running Speed Test...
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      This may take up to 2 minutes
                    </Typography>
                    <Box sx={{ width: '60%', mx: 'auto' }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        color={getProgressColor()}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {progress}% Complete
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              )}

              {testState === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Alert severity="error" sx={{ mb: 3 }}>
                    <Typography variant="h6">Test Failed</Typography>
                    <Typography>{error}</Typography>
                  </Alert>
                  <Button
                    variant="outlined"
                    onClick={resetTest}
                  >
                    Try Again
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>
        </Grid>
      </Grid>

      {/* Test Results */}
      {testState === 'completed' && result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Current Results */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Download Speed"
                value={formatSpeed(result.downloadSpeed)}
                unit="Mbps"
                icon={<SpeedIcon sx={{ fontSize: 32 }} />}
                color="primary"
                delay={0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Upload Speed"
                value={formatSpeed(result.uploadSpeed)}
                unit="Mbps"
                icon={<UploadIcon sx={{ fontSize: 32 }} />}
                color="secondary"
                delay={0.1}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Latency"
                value={result.latency ? result.latency.toFixed(0) : '0'}
                unit="ms"
                icon={<LatencyIcon sx={{ fontSize: 32 }} />}
                color="warning"
                delay={0.2}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Jitter"
                value={result.jitter ? result.jitter.toFixed(1) : '0.0'}
                unit="ms"
                icon={<WifiIcon sx={{ fontSize: 32 }} />}
                color="info"
                delay={0.3}
              />
            </Grid>
          </Grid>

          {/* Test Details */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Test Details
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Server:</Typography>
                    <Typography fontWeight={500}>{result.server}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">ISP:</Typography>
                    <Typography fontWeight={500}>{result.isp}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Test Time:</Typography>
                    <Typography fontWeight={500}>
                      {format(new Date(result.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Performance Percentiles */}
            {comparison && comparison.performance_percentiles && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Performance Ranking
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography color="text.secondary">Download Speed</Typography>
                        <Chip
                          label={`${comparison.performance_percentiles.download.toFixed(0)}th percentile`}
                          color={getPerformanceColor(comparison.performance_percentiles.download)}
                          size="small"
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={comparison.performance_percentiles.download}
                        color={getPerformanceColor(comparison.performance_percentiles.download)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                    
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography color="text.secondary">Upload Speed</Typography>
                        <Chip
                          label={`${comparison.performance_percentiles.upload.toFixed(0)}th percentile`}
                          color={getPerformanceColor(comparison.performance_percentiles.upload)}
                          size="small"
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={comparison.performance_percentiles.upload}
                        color={getPerformanceColor(comparison.performance_percentiles.upload)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography color="text.secondary">Latency</Typography>
                        <Chip
                          label={`${comparison.performance_percentiles.latency.toFixed(0)}th percentile`}
                          color={getPerformanceColor(comparison.performance_percentiles.latency)}
                          size="small"
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={comparison.performance_percentiles.latency}
                        color={getPerformanceColor(comparison.performance_percentiles.latency)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* Comparative Analysis */}
          {comparison && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Historical Comparison */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <TimelineIcon sx={{ mr: 1 }} />
                    Historical Average
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" color="primary.main">
                          {formatSpeed(comparison.historical_summary.avg_download)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Avg Download
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
                          {result.downloadSpeed > comparison.historical_summary.avg_download ? (
                            <TrendingUpIcon color="success" fontSize="small" />
                          ) : (
                            <TrendingDownIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {((result.downloadSpeed - comparison.historical_summary.avg_download) / comparison.historical_summary.avg_download * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" color="success.main">
                          {formatSpeed(comparison.historical_summary.avg_upload)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Avg Upload
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
                          {result.uploadSpeed > comparison.historical_summary.avg_upload ? (
                            <TrendingUpIcon color="success" fontSize="small" />
                          ) : (
                            <TrendingDownIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {((result.uploadSpeed - comparison.historical_summary.avg_upload) / comparison.historical_summary.avg_upload * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" color="warning.main">
                          {comparison.historical_summary.avg_latency.toFixed(0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Avg Latency (ms)
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
                          {result.latency < comparison.historical_summary.avg_latency ? (
                            <TrendingUpIcon color="success" fontSize="small" />
                          ) : (
                            <TrendingDownIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {((result.latency - comparison.historical_summary.avg_latency) / comparison.historical_summary.avg_latency * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Based on {comparison.historical_summary.total_tests} historical tests
                  </Typography>
                </Paper>
              </Grid>

              {/* Recent Performance */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Recent Performance
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Download Speed Change (vs last 10 tests)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h4" color={
                        comparison.recent_comparison.download_change > 0 ? 'success.main' : 
                        comparison.recent_comparison.download_change < 0 ? 'error.main' : 'text.primary'
                      }>
                        {comparison.recent_comparison.download_change > 0 ? '+' : ''}{comparison.recent_comparison.download_change.toFixed(1)}%
                      </Typography>
                      {comparison.recent_comparison.download_change > 0 ? (
                        <TrendingUpIcon color="success" sx={{ ml: 1 }} />
                      ) : comparison.recent_comparison.download_change < 0 ? (
                        <TrendingDownIcon color="error" sx={{ ml: 1 }} />
                      ) : null}
                    </Box>
                  </Box>

                  {comparison.same_hour_comparison && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Same Hour Performance ({comparison.same_hour_comparison.hour}:00)
                      </Typography>
                      <Typography variant="body1">
                        {comparison.same_hour_comparison.comparison === 'better' ? '👍 Better than usual' : 
                         comparison.same_hour_comparison.comparison === 'worse' ? '👎 Worse than usual' : 
                         '➡️ Typical performance'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Based on {comparison.same_hour_comparison.test_count} tests at this hour
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* AI Insights */}
          {comparison && comparison.insights && comparison.insights.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <InfoIcon sx={{ mr: 1 }} />
                    Performance Insights
                  </Typography>
                  <List>
                    {comparison.insights.map((insight, index) => (
                      <ListItem key={index} sx={{ pl: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={insight}
                          primaryTypographyProps={{ variant: 'body1' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Action Buttons */}
          <Grid container spacing={3}>
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                onClick={startSpeedtest}
                startIcon={<PlayIcon />}
                sx={{ mr: 2 }}
              >
                Run Another Test
              </Button>
              <Button
                variant="outlined"
                onClick={resetTest}
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </motion.div>
      )}
    </Container>
  )
}

export default LiveSpeedtest
