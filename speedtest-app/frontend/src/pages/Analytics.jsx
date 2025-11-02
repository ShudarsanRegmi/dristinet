import React, { useState, useMemo } from 'react'
import {
  Box,
  Grid,
  Typography,
  Container,
  Card,
  CardContent,
  useTheme,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Scatter,
  ReferenceLine
} from 'recharts'
import { motion } from 'framer-motion'
import { useSpeedtestData, useSpeedtestStats } from '../hooks/useSpeedtestData'
import SpeedChart from '../components/SpeedChart'
import StatsCard from '../components/StatsCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { 
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon,
  Upload as UploadIcon,
  NetworkCheck as LatencyIcon
} from '@mui/icons-material'

const Analytics = () => {
  const theme = useTheme()
  const { data, loading: dataLoading, error: dataError } = useSpeedtestData()
  const { stats, loading: statsLoading, error: statsError } = useSpeedtestStats()
  const [viewMode, setViewMode] = useState('overview')
  
  // Performance threshold states (moved to top level)
  const [speedThreshold, setSpeedThreshold] = useState(5) // Default 5 Mbps threshold
  const [latencyThreshold, setLatencyThreshold] = useState(100) // Default 100ms threshold
  const [speedDateRange, setSpeedDateRange] = useState('today')
  const [latencyDateRange, setLatencyDateRange] = useState('today')

  // Debug logging
  console.log('Analytics Debug:', { 
    dataLength: data?.length, 
    stats, 
    dataLoading, 
    statsLoading,
    dataError,
    statsError
  })

  // Comprehensive data analysis
  const analyticsData = useMemo(() => {
    if (!data || data.length === 0) return {}

    const validTests = data.filter(test => !test.hasError && test.downloadSpeed != null)
    
    // Hourly analysis
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      avgDownload: 0,
      avgUpload: 0,
      avgLatency: 0,
      testCount: 0
    }))
    
    validTests.forEach(test => {
      const hour = new Date(test.timestamp).getHours()
      const stat = hourlyStats[hour]
      stat.avgDownload += test.downloadSpeed
      stat.avgUpload += test.uploadSpeed || 0
      stat.avgLatency += test.latency || 0
      stat.testCount++
    })

    hourlyStats.forEach(stat => {
      if (stat.testCount > 0) {
        stat.avgDownload = stat.avgDownload / stat.testCount
        stat.avgUpload = stat.avgUpload / stat.testCount
        stat.avgLatency = stat.avgLatency / stat.testCount
      }
    })

    // Speed distribution
    const speedRanges = [
      { range: '0-2', min: 0, max: 2, count: 0, color: '#E53E3E' },
      { range: '2-5', min: 2, max: 5, count: 0, color: '#ED8936' },
      { range: '5-8', min: 5, max: 8, count: 0, color: '#ECC94B' },
      { range: '8-10', min: 8, max: 10, count: 0, color: '#48BB78' },
      { range: '10+', min: 10, max: Infinity, count: 0, color: '#38A169' }
    ]

    validTests.forEach(test => {
      speedRanges.forEach(range => {
        if (test.downloadSpeed >= range.min && test.downloadSpeed < range.max) {
          range.count++
        }
      })
    })

    return {
      hourlyStats,
      speedRanges,
      totalTests: data.length,
      validTests: validTests.length,
      errorRate: ((data.length - validTests.length) / data.length * 100) || 0
    }
  }, [data])

  if (dataLoading || statsLoading) {
    return <LoadingSpinner message="Loading Analytics Data..." variant="analytics" size="medium" />
  }

  if (dataError || statsError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography color="error" variant="h6">Error loading data: {dataError || statsError}</Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Detailed Analytics
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip icon={<AnalyticsIcon />} label="Advanced Insights" variant="outlined" />
            <Chip 
              label={`${analyticsData.validTests || 0} Valid Tests`} 
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              label={`${analyticsData.errorRate?.toFixed(1) || 0}% Error Rate`} 
              color={analyticsData.errorRate > 5 ? "error" : "success"}
              variant="outlined" 
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>View Mode</InputLabel>
              <Select
                value={viewMode}
                label="View Mode"
                onChange={(e) => setViewMode(e.target.value)}
              >
                <MenuItem value="overview">Overview</MenuItem>
                <MenuItem value="performance">Performance</MenuItem>
                <MenuItem value="patterns">Patterns</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Overview Cards */}
          {viewMode === 'overview' && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Total Tests"
                  value={analyticsData.totalTests || 0}
                  icon={<AnalyticsIcon />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Avg Download"
                  value={stats?.avgDownload && !isNaN(stats.avgDownload) ? stats.avgDownload.toFixed(2) : '--'}
                  unit="Mbps"
                  icon={<SpeedIcon />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Avg Upload"
                  value={stats?.avgUpload && !isNaN(stats.avgUpload) ? stats.avgUpload.toFixed(2) : '--'}
                  unit="Mbps"
                  icon={<UploadIcon />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Avg Latency"
                  value={stats?.avgLatency && !isNaN(stats.avgLatency) ? stats.avgLatency.toFixed(0) : '--'}
                  unit="ms"
                  icon={<LatencyIcon />}
                  color="error"
                />
              </Grid>
            </>
          )}

          {/* Hourly Performance Pattern */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Hourly Performance Pattern
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={analyticsData.hourlyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="hour" 
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                    />
                    <YAxis 
                      yAxisId="speed"
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                    />
                    <YAxis 
                      yAxisId="latency"
                      orientation="right"
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      yAxisId="speed"
                      dataKey="avgDownload" 
                      fill="#1565C0" 
                      name="Avg Download (Mbps)"
                      opacity={0.7}
                    />
                    <Line 
                      yAxisId="latency"
                      type="monotone" 
                      dataKey="avgLatency" 
                      stroke="#ED8936" 
                      strokeWidth={2}
                      name="Avg Latency (ms)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Speed Distribution */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                  Speed Distribution
                </Typography>
                
                {/* Compact Chart with Center Legend */}
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={analyticsData.speedRanges || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="count"
                        stroke={theme.palette.background.paper}
                        strokeWidth={2}
                      >
                        {(analyticsData.speedRanges || []).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            style={{
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                              transition: 'all 0.3s ease'
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <Box sx={{
                                bgcolor: 'background.paper',
                                p: 1.5,
                                borderRadius: 2,
                                boxShadow: 3,
                                border: '1px solid',
                                borderColor: 'divider'
                              }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {data.range} Mbps
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {data.count} tests ({((data.count / (analyticsData.validTests || 1)) * 100).toFixed(1)}%)
                                </Typography>
                              </Box>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Summary */}
                  <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
                      {analyticsData.validTests || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Total Tests
                    </Typography>
                  </Box>
                </Box>

                {/* Horizontal Legend */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
                  {(analyticsData.speedRanges || []).map((range, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.1)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        },
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}>
                        <Box sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: range.color,
                          boxShadow: `0 0 0 2px ${range.color}30`
                        }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 'fit-content' }}>
                          {range.range}
                        </Typography>
                        <Box sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: range.color + '20',
                          minWidth: 'fit-content'
                        }}>
                          <Typography variant="caption" sx={{ 
                            fontWeight: 600,
                            color: range.color,
                            filter: 'brightness(1.2)'
                          }}>
                            {range.count} ({((range.count / (analyticsData.validTests || 1)) * 100).toFixed(0)}%)
                          </Typography>
                        </Box>
                      </Box>
                    </motion.div>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Performance Issues Detection */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                  Performance Issues
                </Typography>
                
                {(() => {
                  const validTests = data?.filter(test => !test.hasError && test.downloadSpeed != null) || []
                  const slowTests = validTests.filter(test => test.downloadSpeed < 2).length
                  const fastTests = validTests.filter(test => test.downloadSpeed >= 10).length
                  const highLatency = validTests.filter(test => test.latency > 100).length
                  const inconsistent = validTests.filter((test, index, arr) => {
                    if (index === 0) return false
                    const prev = arr[index - 1]
                    return Math.abs(test.downloadSpeed - prev.downloadSpeed) > 5
                  }).length

                  const issues = [
                    {
                      label: 'Slow Speed Tests',
                      count: slowTests,
                      percentage: ((slowTests / validTests.length) * 100).toFixed(1),
                      color: '#E53E3E',
                      icon: '🐌',
                      severity: slowTests > validTests.length * 0.3 ? 'high' : slowTests > validTests.length * 0.15 ? 'medium' : 'low'
                    },
                    {
                      label: 'High Latency',
                      count: highLatency,
                      percentage: ((highLatency / validTests.length) * 100).toFixed(1),
                      color: '#ED8936',
                      icon: '⏳',
                      severity: highLatency > validTests.length * 0.25 ? 'high' : highLatency > validTests.length * 0.1 ? 'medium' : 'low'
                    },
                    {
                      label: 'Speed Inconsistency',
                      count: inconsistent,
                      percentage: ((inconsistent / validTests.length) * 100).toFixed(1),
                      color: '#ECC94B',
                      icon: '📊',
                      severity: inconsistent > validTests.length * 0.4 ? 'high' : inconsistent > validTests.length * 0.2 ? 'medium' : 'low'
                    },
                    {
                      label: 'Good Performance',
                      count: fastTests,
                      percentage: ((fastTests / validTests.length) * 100).toFixed(1),
                      color: '#48BB78',
                      icon: '🚀',
                      severity: 'good'
                    }
                  ]

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {issues.map((issue, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            borderRadius: 2,
                            bgcolor: issue.severity === 'high' ? 'rgba(229, 62, 62, 0.1)' : 
                                     issue.severity === 'medium' ? 'rgba(237, 137, 54, 0.1)' :
                                     issue.severity === 'good' ? 'rgba(72, 187, 120, 0.1)' : 
                                     'rgba(255,255,255,0.05)',
                            border: '1px solid',
                            borderColor: issue.severity === 'high' ? 'rgba(229, 62, 62, 0.3)' : 
                                        issue.severity === 'medium' ? 'rgba(237, 137, 54, 0.3)' :
                                        issue.severity === 'good' ? 'rgba(72, 187, 120, 0.3)' : 
                                        'rgba(255,255,255,0.1)',
                            '&:hover': {
                              transform: 'translateX(4px)',
                              bgcolor: issue.severity === 'high' ? 'rgba(229, 62, 62, 0.15)' : 
                                       issue.severity === 'medium' ? 'rgba(237, 137, 54, 0.15)' :
                                       issue.severity === 'good' ? 'rgba(72, 187, 120, 0.15)' : 
                                       'rgba(255,255,255,0.1)',
                            },
                            transition: 'all 0.2s ease'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant="h6">{issue.icon}</Typography>
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {issue.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {issue.count} tests affected
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="h6" sx={{ 
                                fontWeight: 700, 
                                color: issue.color,
                                filter: 'brightness(1.2)'
                              }}>
                                {issue.percentage}%
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                of total
                              </Typography>
                            </Box>
                          </Box>
                        </motion.div>
                      ))}
                    </Box>
                  )
                })()}
              </CardContent>
            </Card>
          </Grid>

          {/* Network Reliability Score */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                  Network Reliability Score
                </Typography>
                
                {(() => {
                  const validTests = data?.filter(test => !test.hasError && test.downloadSpeed != null) || []
                  const totalTests = data?.length || 1
                  
                  // Calculate reliability metrics
                  const successRate = (validTests.length / totalTests) * 100
                  const consistencyScore = (() => {
                    if (validTests.length < 2) return 100
                    const speeds = validTests.map(t => t.downloadSpeed)
                    const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length
                    const variance = speeds.reduce((acc, speed) => acc + Math.pow(speed - avg, 2), 0) / speeds.length
                    const stdDev = Math.sqrt(variance)
                    const coefficientOfVariation = (stdDev / avg) * 100
                    return Math.max(0, 100 - coefficientOfVariation * 2)
                  })()
                  
                  const performanceScore = (() => {
                    const avgSpeed = validTests.reduce((acc, test) => acc + test.downloadSpeed, 0) / validTests.length || 0
                    const avgLatency = validTests.reduce((acc, test) => acc + (test.latency || 0), 0) / validTests.length || 0
                    
                    let speedScore = Math.min(100, (avgSpeed / 10) * 100) // 10 Mbps = 100%
                    let latencyScore = Math.max(0, 100 - (avgLatency / 100) * 100) // 100ms = 0%
                    
                    return (speedScore * 0.7 + latencyScore * 0.3)
                  })()

                  const overallScore = (successRate * 0.4 + consistencyScore * 0.3 + performanceScore * 0.3)
                  
                  const getScoreColor = (score) => {
                    if (score >= 80) return '#48BB78'
                    if (score >= 60) return '#ECC94B'
                    if (score >= 40) return '#ED8936'
                    return '#E53E3E'
                  }

                  const getScoreGrade = (score) => {
                    if (score >= 90) return 'A+'
                    if (score >= 80) return 'A'
                    if (score >= 70) return 'B'
                    if (score >= 60) return 'C'
                    if (score >= 50) return 'D'
                    return 'F'
                  }

                  return (
                    <Box>
                      {/* Overall Score Display */}
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                        p: 3,
                        borderRadius: 3,
                        bgcolor: `${getScoreColor(overallScore)}15`,
                        border: '2px solid',
                        borderColor: `${getScoreColor(overallScore)}40`
                      }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h2" sx={{ 
                            fontWeight: 800, 
                            color: getScoreColor(overallScore),
                            lineHeight: 1,
                            mb: 1
                          }}>
                            {overallScore.toFixed(0)}
                          </Typography>
                          <Typography variant="h4" sx={{ 
                            fontWeight: 600, 
                            color: getScoreColor(overallScore),
                            mb: 0.5
                          }}>
                            Grade {getScoreGrade(overallScore)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Network Reliability Score
                          </Typography>
                        </Box>
                      </Box>

                      {/* Score Breakdown */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {[
                          { label: 'Success Rate', value: successRate, weight: '40%', icon: '✅' },
                          { label: 'Consistency', value: consistencyScore, weight: '30%', icon: '📊' },
                          { label: 'Performance', value: performanceScore, weight: '30%', icon: '⚡' }
                        ].map((metric, index) => (
                          <Box key={index} sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.05)'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Typography variant="body1">{metric.icon}</Typography>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {metric.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Weight: {metric.weight}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 600,
                              color: getScoreColor(metric.value)
                            }}>
                              {metric.value.toFixed(0)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )
                })()}
              </CardContent>
            </Card>
          </Grid>

          {/* Speed Variance Analysis */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                  Speed Variance Analysis
                </Typography>
                
                {(() => {
                  const validTests = data?.filter(test => !test.hasError && test.downloadSpeed != null) || []
                  
                  // Group tests by time periods for variance analysis
                  const timeGroups = validTests.reduce((groups, test) => {
                    const date = new Date(test.timestamp)
                    const day = date.toISOString().split('T')[0]
                    
                    if (!groups[day]) {
                      groups[day] = []
                    }
                    groups[day].push(test)
                    return groups
                  }, {})

                  const varianceData = Object.entries(timeGroups)
                    .slice(-14) // Last 14 days
                    .map(([date, tests]) => {
                      const speeds = tests.map(t => t.downloadSpeed)
                      const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length
                      const min = Math.min(...speeds)
                      const max = Math.max(...speeds)
                      const variance = speeds.reduce((acc, speed) => acc + Math.pow(speed - avg, 2), 0) / speeds.length
                      const stdDev = Math.sqrt(variance)
                      
                      return {
                        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        avg: Number(avg.toFixed(2)),
                        min: Number(min.toFixed(2)),
                        max: Number(max.toFixed(2)),
                        variance: Number(stdDev.toFixed(2)),
                        tests: tests.length
                      }
                    })

                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={varianceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          stroke={theme.palette.text.secondary}
                          fontSize={11}
                        />
                        <YAxis 
                          stroke={theme.palette.text.secondary}
                          fontSize={11}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                          formatter={(value, name) => [
                            `${value} ${name === 'variance' ? 'Mbps σ' : 'Mbps'}`,
                            name === 'avg' ? 'Average' : name === 'min' ? 'Minimum' : name === 'max' ? 'Maximum' : 'Std Deviation'
                          ]}
                        />
                        
                        {/* Speed Range Area */}
                        <Bar dataKey="max" fill="#48BB7820" name="max" />
                        <Bar dataKey="min" fill="#E53E3E20" name="min" />
                        
                        {/* Average Line */}
                        <Line 
                          type="monotone" 
                          dataKey="avg" 
                          stroke="#1565C0" 
                          strokeWidth={3}
                          name="avg"
                          dot={{ fill: '#1565C0', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#1565C0', strokeWidth: 2 }}
                        />
                        
                        {/* Variance Line */}
                        <Line 
                          type="monotone" 
                          dataKey="variance" 
                          stroke="#ED8936" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="variance"
                          dot={{ fill: '#ED8936', strokeWidth: 2, r: 3 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>
          </Grid>

          {/* Network Quality Trends */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                  Quality Trends
                </Typography>
                
                {(() => {
                  const validTests = data?.filter(test => !test.hasError && test.downloadSpeed != null) || []
                  const recent = validTests.slice(-30) // Last 30 tests
                  const previous = validTests.slice(-60, -30) // Previous 30 tests
                  
                  const calculateAvg = (tests, field) => {
                    if (tests.length === 0) return 0
                    return tests.reduce((acc, test) => acc + (test[field] || 0), 0) / tests.length
                  }

                  const trends = [
                    {
                      label: 'Download Speed',
                      recent: calculateAvg(recent, 'downloadSpeed'),
                      previous: calculateAvg(previous, 'downloadSpeed'),
                      unit: 'Mbps',
                      icon: '📥',
                      good: 'higher'
                    },
                    {
                      label: 'Upload Speed', 
                      recent: calculateAvg(recent, 'uploadSpeed'),
                      previous: calculateAvg(previous, 'uploadSpeed'),
                      unit: 'Mbps',
                      icon: '📤',
                      good: 'higher'
                    },
                    {
                      label: 'Latency',
                      recent: calculateAvg(recent, 'latency'),
                      previous: calculateAvg(previous, 'latency'),
                      unit: 'ms',
                      icon: '⏱️',
                      good: 'lower'
                    }
                  ]

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      {trends.map((trend, index) => {
                        const change = ((trend.recent - trend.previous) / trend.previous) * 100
                        const isImproving = trend.good === 'higher' ? change > 0 : change < 0
                        const changeColor = isImproving ? '#48BB78' : change === 0 ? '#ECC94B' : '#E53E3E'
                        
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Box sx={{
                              p: 2.5,
                              borderRadius: 2,
                              bgcolor: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.1)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                              },
                              transition: 'all 0.2s ease'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                <Typography variant="h6">{trend.icon}</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {trend.label}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">Current</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  {trend.recent.toFixed(1)} {trend.unit}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                <Typography variant="caption" color="text.secondary">Previous</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {trend.previous.toFixed(1)} {trend.unit}
                                </Typography>
                              </Box>

                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1,
                                p: 1,
                                borderRadius: 1,
                                bgcolor: `${changeColor}15`,
                                border: '1px solid',
                                borderColor: `${changeColor}30`
                              }}>
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600,
                                  color: changeColor
                                }}>
                                  {isImproving ? '📈' : change === 0 ? '➡️' : '📉'}
                                  {Math.abs(change).toFixed(1)}%
                                </Typography>
                                <Typography variant="caption" sx={{ color: changeColor }}>
                                  {isImproving ? 'Better' : change === 0 ? 'Same' : 'Worse'}
                                </Typography>
                              </Box>
                            </Box>
                          </motion.div>
                        )
                      })}
                    </Box>
                  )
                })()}
              </CardContent>
            </Card>
          </Grid>

          {/* Speed Threshold Analysis */}
          <Grid item xs={12} sx={{ mt: 4 }}>
            <Card>
              <CardContent>
                {(() => {
                  // Filter data by date range
                  const getFilteredData = (range) => {
                    const now = new Date()
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    let startDate
                    
                    switch (range) {
                      case 'today':
                        startDate = today
                        break
                      case 'yesterday':
                        startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000)
                        break
                      case '7d':
                        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                        break
                      case '30d':
                        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                        break
                      case 'all':
                        return data || []
                      default:
                        startDate = today
                    }
                    
                    return (data || []).filter(test => {
                      const testDate = new Date(test.timestamp)
                      return testDate >= startDate
                    })
                  }

                  const filteredData = getFilteredData(speedDateRange)
                  
                  // Process data for speed analysis
                  const analysisData = filteredData.map((test, index) => {
                    const isPoorSpeed = test.downloadSpeed < speedThreshold
                    
                    return {
                      ...test,
                      index: index + 1,
                      isPoorSpeed,
                      timestamp: new Date(test.timestamp).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    }
                  })

                  const poorSpeedCount = analysisData.filter(test => test.isPoorSpeed).length
                  const speedPerformanceRate = filteredData.length > 0 ? ((filteredData.length - poorSpeedCount) / filteredData.length * 100).toFixed(1) : '0'

                  return (
                    <>
                      {/* Header with Stats */}
                      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                            📥 Speed Threshold Analysis
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {filteredData.length} tests • {poorSpeedCount} slow • {speedPerformanceRate}% good speed
                          </Typography>
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: poorSpeedCount > filteredData.length * 0.3 ? 'rgba(229, 62, 62, 0.1)' : 
                                   poorSpeedCount > filteredData.length * 0.1 ? 'rgba(237, 137, 54, 0.1)' : 
                                   'rgba(72, 187, 120, 0.1)',
                          border: '1px solid',
                          borderColor: poorSpeedCount > filteredData.length * 0.3 ? 'rgba(229, 62, 62, 0.3)' : 
                                      poorSpeedCount > filteredData.length * 0.1 ? 'rgba(237, 137, 54, 0.3)' : 
                                      'rgba(72, 187, 120, 0.3)'
                        }}>
                          <Typography variant="h5" sx={{ 
                            fontWeight: 700,
                            color: poorSpeedCount > filteredData.length * 0.3 ? '#E53E3E' : 
                                   poorSpeedCount > filteredData.length * 0.1 ? '#ED8936' : 
                                   '#48BB78'
                          }}>
                            {poorSpeedCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Slow Tests
                          </Typography>
                        </Box>
                      </Box>

                      {/* Controls */}
                      <Box sx={{ 
                        mb: 3, 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap'
                      }}>
                        {/* Date Range Selector */}
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>Date Range</InputLabel>
                          <Select
                            value={speedDateRange}
                            label="Date Range"
                            onChange={(e) => setSpeedDateRange(e.target.value)}
                          >
                            <MenuItem value="today">Today</MenuItem>
                            <MenuItem value="yesterday">Yesterday</MenuItem>
                            <MenuItem value="7d">Last 7 Days</MenuItem>
                            <MenuItem value="30d">Last 30 Days</MenuItem>
                            <MenuItem value="all">All Time</MenuItem>
                          </Select>
                        </FormControl>

                        {/* Speed Threshold Control */}
                        <Box sx={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Minimum Speed: <strong>{speedThreshold} Mbps</strong>
                          </Typography>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            step="0.5"
                            value={speedThreshold}
                            onChange={(e) => setSpeedThreshold(parseFloat(e.target.value))}
                            style={{
                              width: '100%',
                              height: '6px',
                              borderRadius: '3px',
                              background: `linear-gradient(to right, #E53E3E 0%, #ED8936 50%, #48BB78 100%)`,
                              outline: 'none',
                              appearance: 'none',
                              cursor: 'pointer'
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Speed Analysis Chart */}
                      <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={analysisData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} opacity={0.3} />
                          
                          <XAxis 
                            dataKey="index"
                            stroke={theme.palette.text.secondary}
                            fontSize={10}
                            interval="preserveStartEnd"
                          />
                          
                          <YAxis 
                            stroke={theme.palette.text.secondary}
                            fontSize={10}
                            label={{ value: 'Speed (Mbps)', angle: -90, position: 'insideLeft' }}
                          />

                          {/* Speed Threshold Line */}
                          <ReferenceLine 
                            y={speedThreshold} 
                            stroke="#ED8936" 
                            strokeDasharray="8 4"
                            strokeWidth={2}
                            label={{ value: `${speedThreshold} Mbps`, position: 'topLeft' }}
                          />

                          <Tooltip 
                            contentStyle={{
                              backgroundColor: theme.palette.background.paper,
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length > 0) {
                                const data = payload[0].payload
                                return (
                                  <Box sx={{ p: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                      Test #{label} - {data.timestamp}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: data.isPoorSpeed ? '#E53E3E' : '#48BB78' }}>
                                      📥 Download: {data.downloadSpeed?.toFixed(2)} Mbps
                                      {data.isPoorSpeed && ' ⚠️ Below threshold'}
                                    </Typography>
                                    <Typography variant="body2">
                                      📤 Upload: {data.uploadSpeed?.toFixed(2)} Mbps
                                    </Typography>
                                  </Box>
                                )
                              }
                              return null
                            }}
                          />

                          {/* Download Speed Scatter Plot */}
                          <Scatter
                            dataKey="downloadSpeed"
                            fill={(entry) => entry?.isPoorSpeed ? '#E53E3E' : '#1565C0'}
                            shape={(props) => {
                              const { cx, cy, payload } = props
                              const size = payload?.isPoorSpeed ? 7 : 4
                              const color = payload?.isPoorSpeed ? '#E53E3E' : '#1565C0'
                              
                              return (
                                <circle 
                                  cx={cx} 
                                  cy={cy} 
                                  r={size} 
                                  fill={color}
                                  stroke={payload?.isPoorSpeed ? '#FFFFFF' : color}
                                  strokeWidth={payload?.isPoorSpeed ? 2 : 0}
                                  style={{
                                    filter: payload?.isPoorSpeed ? 'drop-shadow(0 0 6px rgba(229, 62, 62, 0.6))' : 'none'
                                  }}
                                />
                              )
                            }}
                            name="Download Speed"
                          />

                          {/* Average Speed Line */}
                          <Line
                            type="monotone"
                            dataKey={(data) => {
                              const avg = analysisData.reduce((acc, test) => acc + test.downloadSpeed, 0) / analysisData.length
                              return avg
                            }}
                            stroke="#1565C0"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            dot={false}
                            name="Average Speed"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>

                      {/* Legend */}
                      <Box sx={{ 
                        mt: 2, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        flexWrap: 'wrap',
                        gap: 2
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1565C0' }} />
                          <Typography variant="caption">Good Speed</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#E53E3E', boxShadow: '0 0 4px rgba(229, 62, 62, 0.6)' }} />
                          <Typography variant="caption">Below Threshold</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 16, height: 2, bgcolor: '#ED8936' }} />
                          <Typography variant="caption">Threshold Line</Typography>
                        </Box>
                      </Box>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </Grid>

          {/* Latency Threshold Analysis */}
          <Grid item xs={12} sx={{ mt: 3 }}>
            <Card>
              <CardContent>
                {(() => {
                  // Filter data by date range
                  const getFilteredData = (range) => {
                    const now = new Date()
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    let startDate
                    
                    switch (range) {
                      case 'today':
                        startDate = today
                        break
                      case 'yesterday':
                        startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000)
                        break
                      case '7d':
                        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                        break
                      case '30d':
                        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                        break
                      case 'all':
                        return data || []
                      default:
                        startDate = today
                    }
                    
                    return (data || []).filter(test => {
                      const testDate = new Date(test.timestamp)
                      return testDate >= startDate
                    })
                  }

                  const filteredData = getFilteredData(latencyDateRange)
                  
                  // Process data for latency analysis
                  const analysisData = filteredData.map((test, index) => {
                    const isPoorLatency = test.latency > latencyThreshold
                    
                    return {
                      ...test,
                      index: index + 1,
                      isPoorLatency,
                      timestamp: new Date(test.timestamp).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    }
                  })

                  const poorLatencyCount = analysisData.filter(test => test.isPoorLatency).length
                  const latencyPerformanceRate = filteredData.length > 0 ? ((filteredData.length - poorLatencyCount) / filteredData.length * 100).toFixed(1) : '0'

                  return (
                    <>
                      {/* Header with Stats */}
                      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                            ⏱️ Latency Threshold Analysis
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {filteredData.length} tests • {poorLatencyCount} high latency • {latencyPerformanceRate}% good latency
                          </Typography>
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: poorLatencyCount > filteredData.length * 0.3 ? 'rgba(229, 62, 62, 0.1)' : 
                                   poorLatencyCount > filteredData.length * 0.1 ? 'rgba(237, 137, 54, 0.1)' : 
                                   'rgba(72, 187, 120, 0.1)',
                          border: '1px solid',
                          borderColor: poorLatencyCount > filteredData.length * 0.3 ? 'rgba(229, 62, 62, 0.3)' : 
                                      poorLatencyCount > filteredData.length * 0.1 ? 'rgba(237, 137, 54, 0.3)' : 
                                      'rgba(72, 187, 120, 0.3)'
                        }}>
                          <Typography variant="h5" sx={{ 
                            fontWeight: 700,
                            color: poorLatencyCount > filteredData.length * 0.3 ? '#E53E3E' : 
                                   poorLatencyCount > filteredData.length * 0.1 ? '#ED8936' : 
                                   '#48BB78'
                          }}>
                            {poorLatencyCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            High Latency
                          </Typography>
                        </Box>
                      </Box>

                      {/* Controls */}
                      <Box sx={{ 
                        mb: 3, 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap'
                      }}>
                        {/* Date Range Selector */}
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>Date Range</InputLabel>
                          <Select
                            value={latencyDateRange}
                            label="Date Range"
                            onChange={(e) => setLatencyDateRange(e.target.value)}
                          >
                            <MenuItem value="today">Today</MenuItem>
                            <MenuItem value="yesterday">Yesterday</MenuItem>
                            <MenuItem value="7d">Last 7 Days</MenuItem>
                            <MenuItem value="30d">Last 30 Days</MenuItem>
                            <MenuItem value="all">All Time</MenuItem>
                          </Select>
                        </FormControl>

                        {/* Latency Threshold Control */}
                        <Box sx={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Maximum Latency: <strong>{latencyThreshold} ms</strong>
                          </Typography>
                          <input
                            type="range"
                            min="20"
                            max="300"
                            step="10"
                            value={latencyThreshold}
                            onChange={(e) => setLatencyThreshold(parseInt(e.target.value))}
                            style={{
                              width: '100%',
                              height: '6px',
                              borderRadius: '3px',
                              background: `linear-gradient(to right, #48BB78 0%, #ECC94B 50%, #E53E3E 100%)`,
                              outline: 'none',
                              appearance: 'none',
                              cursor: 'pointer'
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Latency Analysis Chart */}
                      <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={analysisData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} opacity={0.3} />
                          
                          <XAxis 
                            dataKey="index"
                            stroke={theme.palette.text.secondary}
                            fontSize={10}
                            interval="preserveStartEnd"
                          />
                          
                          <YAxis 
                            stroke={theme.palette.text.secondary}
                            fontSize={10}
                            label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
                          />

                          {/* Latency Threshold Line */}
                          <ReferenceLine 
                            y={latencyThreshold} 
                            stroke="#E53E3E" 
                            strokeDasharray="8 4"
                            strokeWidth={2}
                            label={{ value: `${latencyThreshold} ms`, position: 'topLeft' }}
                          />

                          <Tooltip 
                            contentStyle={{
                              backgroundColor: theme.palette.background.paper,
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length > 0) {
                                const data = payload[0].payload
                                return (
                                  <Box sx={{ p: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                      Test #{label} - {data.timestamp}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: data.isPoorLatency ? '#E53E3E' : '#48BB78' }}>
                                      ⏱️ Latency: {data.latency?.toFixed(0)} ms
                                      {data.isPoorLatency && ' ⚠️ Above threshold'}
                                    </Typography>
                                    <Typography variant="body2">
                                      📥 Download: {data.downloadSpeed?.toFixed(2)} Mbps
                                    </Typography>
                                  </Box>
                                )
                              }
                              return null
                            }}
                          />

                          {/* Latency Line with Highlighted Points */}
                          <Line
                            type="monotone"
                            dataKey="latency"
                            stroke="#ED8936"
                            strokeWidth={2}
                            dot={(props) => {
                              const { cx, cy, payload } = props
                              const size = payload?.isPoorLatency ? 6 : 3
                              const color = payload?.isPoorLatency ? '#E53E3E' : '#ED8936'
                              
                              return (
                                <circle 
                                  cx={cx} 
                                  cy={cy} 
                                  r={size} 
                                  fill={color}
                                  stroke={payload?.isPoorLatency ? '#FFFFFF' : color}
                                  strokeWidth={payload?.isPoorLatency ? 2 : 0}
                                  style={{
                                    filter: payload?.isPoorLatency ? 'drop-shadow(0 0 6px rgba(229, 62, 62, 0.6))' : 'none'
                                  }}
                                />
                              )
                            }}
                            connectNulls={false}
                            name="Latency"
                          />

                          {/* Average Latency Line */}
                          <Line
                            type="monotone"
                            dataKey={(data) => {
                              const avg = analysisData.reduce((acc, test) => acc + (test.latency || 0), 0) / analysisData.length
                              return avg
                            }}
                            stroke="#ED8936"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            dot={false}
                            name="Average Latency"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>

                      {/* Legend */}
                      <Box sx={{ 
                        mt: 2, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        flexWrap: 'wrap',
                        gap: 2
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ED8936' }} />
                          <Typography variant="caption">Good Latency</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#E53E3E', boxShadow: '0 0 4px rgba(229, 62, 62, 0.6)' }} />
                          <Typography variant="caption">Above Threshold</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 16, height: 2, bgcolor: '#E53E3E' }} />
                          <Typography variant="caption">Threshold Line</Typography>
                        </Box>
                      </Box>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </Grid>


        </Grid>
      </motion.div>
    </Container>
  )
}

export default Analytics
