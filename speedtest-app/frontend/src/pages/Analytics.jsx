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
  ComposedChart
} from 'recharts'
import { motion } from 'framer-motion'
import { useSpeedtestData } from '../hooks/useSpeedtestData'
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
  const { data, stats, loading, error } = useSpeedtestData()
  const [viewMode, setViewMode] = useState('overview')

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

  if (loading) {
    return <LoadingSpinner message="Loading Analytics Data..." variant="analytics" size="medium" />
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography color="error" variant="h6">Error loading data: {error}</Typography>
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
                  value={stats?.avgDownloadSpeed?.toFixed(2) || '--'}
                  unit="Mbps"
                  icon={<SpeedIcon />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Avg Upload"
                  value={stats?.avgUploadSpeed?.toFixed(2) || '--'}
                  unit="Mbps"
                  icon={<UploadIcon />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Avg Latency"
                  value={stats?.avgLatency?.toFixed(0) || '--'}
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
                <Typography variant="h6" gutterBottom>
                  Speed Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.speedRanges || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, percent }) => `${range} Mbps (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(analyticsData.speedRanges || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity Chart */}
          {viewMode === 'overview' && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Activity (Last 50 Tests)
                  </Typography>
                  <SpeedChart 
                    data={(data || []).slice(-50)} 
                    title=""
                    type="points"
                  />
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </motion.div>
    </Container>
  )
}

export default Analytics
