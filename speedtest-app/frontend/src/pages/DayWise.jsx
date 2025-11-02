import React, { useState, useMemo } from 'react'
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Container,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material'
import {
  Speed as SpeedIcon,
  Upload as UploadIcon,
  AccessTime as LatencyIcon,
  CheckCircle as SuccessIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CalendarMonth as CalendarIcon,
  Schedule as ScheduleIcon,
  SignalWifiStatusbar4Bar as SignalIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { format, parseISO, isValid } from 'date-fns'
import StatsCard from '../components/StatsCard'
import SpeedChart from '../components/SpeedChart'
import LoadingSpinner from '../components/LoadingSpinner'
import { useSpeedtestData } from '../hooks/useSpeedtestData'

const DayWise = () => {
  const { data, loading, error } = useSpeedtestData()
  const [selectedDate, setSelectedDate] = useState('')

  // Get unique dates from data
  const availableDates = useMemo(() => {
    if (!data || data.length === 0) return []
    
    const dates = data
      .filter(item => item.timestamp)
      .map(item => {
        const date = new Date(item.timestamp)
        return isValid(date) ? format(date, 'yyyy-MM-dd') : null
      })
      .filter(Boolean)
    
    const uniqueDates = [...new Set(dates)].sort().reverse() // Most recent first
    return uniqueDates
  }, [data])

  // Set default selected date to most recent
  React.useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0])
    }
  }, [availableDates, selectedDate])

  // Filter data for selected date
  const dayData = useMemo(() => {
    if (!data || !selectedDate) return []
    
    return data.filter(item => {
      if (!item.timestamp) return false
      const itemDate = new Date(item.timestamp)
      if (!isValid(itemDate)) return false
      return format(itemDate, 'yyyy-MM-dd') === selectedDate
    })
  }, [data, selectedDate])

  // Calculate day statistics
  const dayStats = useMemo(() => {
    if (dayData.length === 0) return null

    const validTests = dayData.filter(item => !item.hasError && item.downloadSpeed)
    const failedTests = dayData.filter(item => item.hasError)
    
    if (validTests.length === 0) {
      return {
        totalTests: dayData.length,
        validTests: 0,
        failedTests: failedTests.length,
        successRate: 0,
        avgDownload: 0,
        avgUpload: 0,
        avgLatency: 0,
        maxDownload: 0,
        minDownload: 0,
        maxUpload: 0,
        minUpload: 0,
        maxLatency: 0,
        minLatency: 0,
      }
    }

    const downloadSpeeds = validTests.map(t => t.downloadSpeed).filter(Boolean)
    const uploadSpeeds = validTests.map(t => t.uploadSpeed).filter(Boolean)
    const latencies = validTests.map(t => t.latency).filter(Boolean)

    return {
      totalTests: dayData.length,
      validTests: validTests.length,
      failedTests: failedTests.length,
      successRate: (validTests.length / dayData.length) * 100,
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
  }, [dayData])

  // Hourly analysis
  const hourlyAnalysis = useMemo(() => {
    if (!dayData || dayData.length === 0) return []

    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      tests: [],
      avgDownload: 0,
      avgUpload: 0,
      avgLatency: 0,
      testCount: 0,
    }))

    dayData.forEach(test => {
      if (!test.timestamp || test.hasError) return
      const hour = new Date(test.timestamp).getHours()
      hours[hour].tests.push(test)
    })

    return hours.map(hourData => {
      const validTests = hourData.tests.filter(t => t.downloadSpeed)
      if (validTests.length === 0) {
        return { ...hourData, testCount: hourData.tests.length }
      }

      const avgDownload = validTests.reduce((sum, t) => sum + (t.downloadSpeed || 0), 0) / validTests.length
      const avgUpload = validTests.reduce((sum, t) => sum + (t.uploadSpeed || 0), 0) / validTests.length
      const avgLatency = validTests.reduce((sum, t) => sum + (t.latency || 0), 0) / validTests.length

      return {
        ...hourData,
        avgDownload,
        avgUpload,
        avgLatency,
        testCount: hourData.tests.length,
      }
    })
  }, [dayData])

  // Peak and low performance times
  const performanceInsights = useMemo(() => {
    if (!hourlyAnalysis || hourlyAnalysis.length === 0) return null

    const hoursWithData = hourlyAnalysis.filter(h => h.testCount > 0 && h.avgDownload > 0)
    if (hoursWithData.length === 0) return null

    const peakSpeed = Math.max(...hoursWithData.map(h => h.avgDownload))
    const lowSpeed = Math.min(...hoursWithData.map(h => h.avgDownload))
    
    const peakHour = hoursWithData.find(h => h.avgDownload === peakSpeed)
    const lowHour = hoursWithData.find(h => h.avgDownload === lowSpeed)

    const peakLatency = Math.max(...hoursWithData.map(h => h.avgLatency))
    const lowLatency = Math.min(...hoursWithData.map(h => h.avgLatency))
    
    const worstLatencyHour = hoursWithData.find(h => h.avgLatency === peakLatency)
    const bestLatencyHour = hoursWithData.find(h => h.avgLatency === lowLatency)

    return {
      peakSpeed,
      peakHour: peakHour?.hour,
      lowSpeed,
      lowHour: lowHour?.hour,
      peakLatency,
      worstLatencyHour: worstLatencyHour?.hour,
      lowLatency,
      bestLatencyHour: bestLatencyHour?.hour,
    }
  }, [hourlyAnalysis])

  if (loading) {
    return <LoadingSpinner message="Loading Day-wise Analysis..." variant="analytics" size="medium" />
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">Error loading data: {error}</Alert>
      </Container>
    )
  }

  if (availableDates.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="info">No speedtest data available for analysis.</Alert>
      </Container>
    )
  }

  const formatHour = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Date Selection */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 2 }}>
            Detailed analysis for a specific day with hourly breakdowns and performance insights
          </Typography>
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Select Date</InputLabel>
            <Select
              value={selectedDate}
              label="Select Date"
              onChange={(e) => setSelectedDate(e.target.value)}
              startAdornment={<CalendarIcon sx={{ mr: 1 }} />}
            >
              {availableDates.map(date => (
                <MenuItem key={date} value={date}>
                  {format(parseISO(date), 'MMM dd, yyyy')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </motion.div>



      {selectedDate && dayStats && (
        <>
          {/* Day Overview Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Total Tests"
                value={dayStats.totalTests.toString()}
                unit="tests"
                icon={<SignalIcon sx={{ fontSize: 32 }} />}
                color="info"
                delay={0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Success Rate"
                value={dayStats.successRate.toFixed(1)}
                unit="%"
                icon={<SuccessIcon sx={{ fontSize: 32 }} />}
                color="success"
                delay={0.1}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Avg Download"
                value={dayStats.avgDownload.toFixed(1)}
                unit="Mbps"
                icon={<SpeedIcon sx={{ fontSize: 32 }} />}
                color="primary"
                delay={0.2}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Avg Latency"
                value={dayStats.avgLatency.toFixed(0)}
                unit="ms"
                icon={<LatencyIcon sx={{ fontSize: 32 }} />}
                color="warning"
                delay={0.3}
              />
            </Grid>
          </Grid>

          {/* Performance Insights */}
          {performanceInsights && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
                    <ScheduleIcon sx={{ mr: 1 }} />
                    Performance Insights
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Speed Performance
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Chip
                            icon={<TrendingUpIcon />}
                            label={`Peak: ${performanceInsights.peakSpeed.toFixed(1)} Mbps at ${formatHour(performanceInsights.peakHour)}`}
                            color="success"
                            variant="outlined"
                          />
                          <Chip
                            icon={<TrendingDownIcon />}
                            label={`Low: ${performanceInsights.lowSpeed.toFixed(1)} Mbps at ${formatHour(performanceInsights.lowHour)}`}
                            color="error"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Latency Performance
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Chip
                            icon={<TrendingUpIcon />}
                            label={`Best: ${performanceInsights.lowLatency.toFixed(0)} ms at ${formatHour(performanceInsights.bestLatencyHour)}`}
                            color="success"
                            variant="outlined"
                          />
                          <Chip
                            icon={<TrendingDownIcon />}
                            label={`Worst: ${performanceInsights.peakLatency.toFixed(0)} ms at ${formatHour(performanceInsights.worstLatencyHour)}`}
                            color="error"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Daily Chart */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <SpeedChart 
                data={dayData.filter(item => !item.hasError && item.downloadSpeed)} 
                title={`Speed Analysis for ${format(parseISO(selectedDate), 'MMM dd, yyyy')}`}
                type="line"
                showTimeRange={false}
                isDayView={true}
              />
            </Grid>
          </Grid>

          {/* Detailed Statistics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Speed Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="body2" color="text.secondary">Max Download</Typography>
                      <Typography variant="h5" color="success.main">{dayStats.maxDownload.toFixed(1)} Mbps</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="body2" color="text.secondary">Min Download</Typography>
                      <Typography variant="h5" color="error.main">{dayStats.minDownload.toFixed(1)} Mbps</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="body2" color="text.secondary">Max Upload</Typography>
                      <Typography variant="h5" color="success.main">{dayStats.maxUpload.toFixed(1)} Mbps</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="body2" color="text.secondary">Min Upload</Typography>
                      <Typography variant="h5" color="error.main">{dayStats.minUpload.toFixed(1)} Mbps</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Test Summary
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Valid Tests:</Typography>
                    <Typography color="success.main" fontWeight={600}>{dayStats.validTests}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Failed Tests:</Typography>
                    <Typography color="error.main" fontWeight={600}>{dayStats.failedTests}</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Best Latency:</Typography>
                    <Typography color="success.main" fontWeight={600}>{dayStats.minLatency.toFixed(0)} ms</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Worst Latency:</Typography>
                    <Typography color="warning.main" fontWeight={600}>{dayStats.maxLatency.toFixed(0)} ms</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Hourly Breakdown */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Hourly Breakdown
                </Typography>
                
                <Grid container spacing={1}>
                  {hourlyAnalysis.filter(h => h.testCount > 0).map((hour) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={hour.hour}>
                      <Card variant="outlined" sx={{ 
                        p: 1.5, 
                        textAlign: 'center',
                        bgcolor: hour.avgDownload > dayStats.avgDownload ? 'success.light' : 
                                hour.avgDownload < dayStats.avgDownload * 0.8 ? 'error.light' : 'background.paper',
                        opacity: hour.testCount === 0 ? 0.5 : 1
                      }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {formatHour(hour.hour)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {hour.testCount} test{hour.testCount !== 1 ? 's' : ''}
                        </Typography>
                        {hour.avgDownload > 0 && (
                          <>
                            <Typography variant="body2">
                              ↓ {hour.avgDownload.toFixed(1)} Mbps
                            </Typography>
                            <Typography variant="body2">
                              ↑ {hour.avgUpload.toFixed(1)} Mbps
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {hour.avgLatency.toFixed(0)}ms
                            </Typography>
                          </>
                        )}
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {selectedDate && (!dayStats || dayStats.totalTests === 0) && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No speedtest data available for {format(parseISO(selectedDate), 'MMM dd, yyyy')}.
        </Alert>
      )}
    </Container>
  )
}

export default DayWise
