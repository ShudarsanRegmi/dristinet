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
import { speedtestAPI } from '../services/api'

const LiveSpeedtest = () => {
  const STORAGE_KEY = 'liveSpeedtestStateV1'
  const [testState, setTestState] = useState('idle') // idle, running, completed, error
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [error, setError] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const progressIntervalRef = useRef(null)

  const clearProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  useEffect(() => {
    // Restore state when returning to this page after route/tab switch.
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        
        // NEVER restore "running" state - always treat it as idle on load
        // Only restore completed or error states with their results
        if (parsed.testState === 'completed') {
          setTestState('completed')
          setProgress(100)
          setResult(parsed.result || null)
          setComparison(parsed.comparison || null)
          setError(null)
        } else if (parsed.testState === 'error') {
          setTestState('error')
          setProgress(0)
          setResult(null)
          setComparison(null)
          setError(parsed.error || null)
        } else {
          // For idle or running, always reset to idle
          setTestState('idle')
          setProgress(0)
          setResult(null)
          setComparison(null)
          setError(null)
        }
      }
    } catch (err) {
      console.error('Failed to restore live speedtest state:', err)
    } finally {
      setHydrated(true)
    }

    return () => {
      clearProgress()
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return

    // Only save state when not running, to avoid stale "running" states
    if (testState !== 'running') {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            testState,
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
    }
  }, [hydrated, testState, progress, result, comparison, error])

  const startSpeedtest = async () => {
    try {
      clearProgress()
      setTestState('running')
      setProgress(0)
      setResult(null)
      setComparison(null)
      setError(null)

      try {
        // Call the API service to start speedtest (returns immediately)
        console.log('Starting speedtest...')
        const startResponse = await speedtestAPI.runSpeedtest()
        
        console.log('Speedtest start response:', startResponse)
        
        if (startResponse && startResponse.success) {
          console.log('Speedtest started, beginning to poll progress')
          // Now poll for progress
          pollProgress()
        } else {
          const errorMsg = startResponse?.error || 'No success flag in response'
          console.error('Speedtest failed to start:', errorMsg)
          throw new Error(errorMsg)
        }
      } catch (apiErr) {
        clearProgress()
        console.error('API Error:', apiErr)
        throw apiErr
      }
    } catch (err) {
      clearProgress()
      setTestState('error')
      setError(err.message || 'Failed to start speedtest')
      console.error('Speedtest error:', err)
    }
  }

  const pollProgress = () => {
    clearProgress()
    
    progressIntervalRef.current = setInterval(async () => {
      try {
        const progressData = await speedtestAPI.getSpeedtestProgress()
        
        if (!progressData) {
          return
        }

        // Update progress bar with real progress from backend
        setProgress(Math.round(progressData.progress))

        if (progressData.status === 'completed' && progressData.result) {
          clearProgress()
          setTestState('completed')
          setResult(progressData.result)
          
          // Get comparison analysis
          await getComparativeAnalysis(progressData.result)
        } else if (progressData.status === 'error') {
          clearProgress()
          setTestState('error')
          setError(progressData.error || 'Speedtest failed')
        }
      } catch (err) {
        console.error('Error polling progress:', err)
        // Continue polling even if there's an error
      }
    }, 500) // Poll every 500ms for real-time updates
  }

  const getComparativeAnalysis = async (testResult) => {
    try {
      // Get recent test history for comparison
      const recentTests = await speedtestAPI.getRecentTests(10)
      
      if (recentTests && recentTests.length > 0) {
        // Calculate historical metrics
        const avgDownload = recentTests.reduce((sum, t) => sum + (t.downloadSpeed || 0), 0) / recentTests.length
        const avgUpload = recentTests.reduce((sum, t) => sum + (t.uploadSpeed || 0), 0) / recentTests.length
        const avgLatency = recentTests.reduce((sum, t) => sum + (t.latency || 0), 0) / recentTests.length

        // Calculate percentiles
        const downloadPercentile = (recentTests.filter(t => (t.downloadSpeed || 0) <= testResult.download_mbps).length / recentTests.length * 100)
        const uploadPercentile = (recentTests.filter(t => (t.uploadSpeed || 0) <= testResult.upload_mbps).length / recentTests.length * 100)
        const latencyPercentile = (recentTests.filter(t => (t.latency || 0) >= testResult.ping_ms).length / recentTests.length * 100)

        // Calculate recent change metrics
        const lastTest = recentTests[0]
        const downloadChange = lastTest ? ((testResult.download_mbps - lastTest.downloadSpeed) / lastTest.downloadSpeed * 100) : 0
        const uploadChange = lastTest ? ((testResult.upload_mbps - lastTest.uploadSpeed) / lastTest.uploadSpeed * 100) : 0
        const latencyChange = lastTest ? ((testResult.ping_ms - lastTest.latency) / lastTest.latency * 100) : 0

        // Same hour comparison
        const testHour = new Date(testResult.timestamp).getHours()
        const sameHourTests = recentTests.filter(t => new Date(t.timestamp).getHours() === testHour)
        let sameHourComparison = null

        if (sameHourTests.length > 0) {
          const sameHourAvgDownload = sameHourTests.reduce((sum, t) => sum + (t.downloadSpeed || 0), 0) / sameHourTests.length
          const sameHourAvgUpload = sameHourTests.reduce((sum, t) => sum + (t.uploadSpeed || 0), 0) / sameHourTests.length
          
          const avgSpeedThisHour = (sameHourAvgDownload + sameHourAvgUpload) / 2
          const currentSpeed = (testResult.download_mbps + testResult.upload_mbps) / 2
          
          let comparison = 'typical'
          if (currentSpeed > avgSpeedThisHour * 1.1) comparison = 'better'
          else if (currentSpeed < avgSpeedThisHour * 0.9) comparison = 'worse'
          
          sameHourComparison = {
            hour: testHour,
            comparison,
            test_count: sameHourTests.length
          }
        }

        // Generate insights
        const insights = []
        if (downloadPercentile > 75) insights.push('🚀 Excellent download speed - better than 75% of your tests')
        else if (downloadPercentile < 25) insights.push('⚠️ Download speed is below your average')
        
        if (latencyPercentile > 75) insights.push('⏱️ Latency is higher than usual - may affect responsiveness')
        else if (latencyPercentile < 25) insights.push('✅ Great latency - excellent for gaming/video calls')

        if (downloadChange > 20) insights.push('📈 Download speed improved significantly')
        else if (downloadChange < -20) insights.push('📉 Download speed decreased - check for interference')

        setComparison({
          historical_summary: {
            avg_download: avgDownload,
            avg_upload: avgUpload,
            avg_latency: avgLatency,
            total_tests: recentTests.length
          },
          performance_percentiles: {
            download: downloadPercentile,
            upload: uploadPercentile,
            latency: latencyPercentile
          },
          recent_comparison: {
            download_change: downloadChange,
            upload_change: uploadChange,
            latency_change: latencyChange
          },
          same_hour_comparison: sameHourComparison,
          insights
        })
      }
    } catch (err) {
      console.error('Failed to get comparative analysis:', err)
      // Set minimal comparison object to prevent errors
      setComparison({
        historical_summary: { avg_download: 0, avg_upload: 0, avg_latency: 0, total_tests: 0 },
        performance_percentiles: { download: 0, upload: 0, latency: 0 },
        recent_comparison: { download_change: 0, upload_change: 0, latency_change: 0 },
        same_hour_comparison: null,
        insights: []
      })
    }
  }

  const resetTest = () => {
    clearProgress()
    setTestState('idle')
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
                      {progress < 20 ? 'Measuring latency...' : progress < 60 ? 'Testing download speed...' : 'Testing upload speed...'}
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
          {comparison && comparison.historical_summary && comparison.performance_percentiles && comparison.recent_comparison && (
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
                          {result && result.downloadSpeed > comparison.historical_summary.avg_download ? (
                            <TrendingUpIcon color="success" fontSize="small" />
                          ) : (
                            <TrendingDownIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {result && ((result.downloadSpeed - comparison.historical_summary.avg_download) / comparison.historical_summary.avg_download * 100).toFixed(1)}%
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
                          {result && result.uploadSpeed > comparison.historical_summary.avg_upload ? (
                            <TrendingUpIcon color="success" fontSize="small" />
                          ) : (
                            <TrendingDownIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {result && ((result.uploadSpeed - comparison.historical_summary.avg_upload) / comparison.historical_summary.avg_upload * 100).toFixed(1)}%
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

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Upload Speed Change (vs last 10 tests)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h4" color={
                        comparison.recent_comparison.upload_change > 0 ? 'success.main' : 
                        comparison.recent_comparison.upload_change < 0 ? 'error.main' : 'text.primary'
                      }>
                        {comparison.recent_comparison.upload_change > 0 ? '+' : ''}{comparison.recent_comparison.upload_change.toFixed(1)}%
                      </Typography>
                      {comparison.recent_comparison.upload_change > 0 ? (
                        <TrendingUpIcon color="success" sx={{ ml: 1 }} />
                      ) : comparison.recent_comparison.upload_change < 0 ? (
                        <TrendingDownIcon color="error" sx={{ ml: 1 }} />
                      ) : null}
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Latency Change (vs last 10 tests)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h4" color={
                        comparison.recent_comparison.latency_change < 0 ? 'success.main' : 
                        comparison.recent_comparison.latency_change > 0 ? 'error.main' : 'text.primary'
                      }>
                        {comparison.recent_comparison.latency_change > 0 ? '+' : ''}{comparison.recent_comparison.latency_change.toFixed(1)}%
                      </Typography>
                      {comparison.recent_comparison.latency_change < 0 ? (
                        <TrendingDownIcon color="success" sx={{ ml: 1 }} />
                      ) : comparison.recent_comparison.latency_change > 0 ? (
                        <TrendingUpIcon color="error" sx={{ ml: 1 }} />
                      ) : null}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />
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
