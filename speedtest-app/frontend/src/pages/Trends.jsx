import React, { useState, useMemo } from 'react'
import { 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  Chip
} from '@mui/material'
import { motion } from 'framer-motion'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts'
import { useSpeedtestData } from '../hooks/useSpeedtestData'
import LoadingSpinner from '../components/LoadingSpinner'
import { 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material'

const Trends = () => {
  const theme = useTheme()
  const { data, loading, error } = useSpeedtestData()
  const [timeRange, setTimeRange] = useState('7d')

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return {}

    const now = new Date()
    let startDate
    
    switch (timeRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(0)
    }

    const filteredData = data.filter(test => 
      new Date(test.timestamp) >= startDate && !test.hasError
    )

    // Daily averages
    const dailyData = {}
    filteredData.forEach(test => {
      const date = test.timestamp.split(' ')[0]
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          downloadSpeeds: [],
          uploadSpeeds: [],
          latencies: []
        }
      }
      dailyData[date].downloadSpeeds.push(test.downloadSpeed)
      dailyData[date].uploadSpeeds.push(test.uploadSpeed)
      dailyData[date].latencies.push(test.latency)
    })

    const trendData = Object.values(dailyData).map(day => ({
      date: day.date,
      avgDownload: day.downloadSpeeds.reduce((a, b) => a + b, 0) / day.downloadSpeeds.length,
      avgUpload: day.uploadSpeeds.reduce((a, b) => a + b, 0) / day.uploadSpeeds.length,
      avgLatency: day.latencies.reduce((a, b) => a + b, 0) / day.latencies.length,
      testCount: day.downloadSpeeds.length
    })).sort((a, b) => new Date(a.date) - new Date(b.date))

    // Hourly distribution
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      downloadSpeed: 0,
      uploadSpeed: 0,
      testCount: 0
    }))

    filteredData.forEach(test => {
      const hour = new Date(test.timestamp).getHours()
      hourlyData[hour].downloadSpeed += test.downloadSpeed
      hourlyData[hour].uploadSpeed += test.uploadSpeed
      hourlyData[hour].testCount += 1
    })

    hourlyData.forEach(data => {
      if (data.testCount > 0) {
        data.downloadSpeed = data.downloadSpeed / data.testCount
        data.uploadSpeed = data.uploadSpeed / data.testCount
      }
    })

    // Speed distribution
    const speedRanges = [
      { range: '0-2 Mbps', min: 0, max: 2, count: 0 },
      { range: '2-5 Mbps', min: 2, max: 5, count: 0 },
      { range: '5-10 Mbps', min: 5, max: 10, count: 0 },
      { range: '10+ Mbps', min: 10, max: Infinity, count: 0 },
    ]

    filteredData.forEach(test => {
      speedRanges.forEach(range => {
        if (test.downloadSpeed >= range.min && test.downloadSpeed < range.max) {
          range.count++
        }
      })
    })

    // Performance correlation
    const correlationData = filteredData.map(test => ({
      downloadSpeed: test.downloadSpeed,
      latency: test.latency,
      uploadSpeed: test.uploadSpeed
    }))

    return {
      trendData,
      hourlyData,
      speedRanges,
      correlationData
    }
  }, [data, timeRange])

  const COLORS = ['#1565C0', '#48BB78', '#ED8936', '#E53E3E']

  if (loading) {
    return <LoadingSpinner message="Analyzing Network Trends..." variant="analytics" size="medium" />
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
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              Performance Trends
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip icon={<TimelineIcon />} label="Historical Analysis" variant="outlined" />
              <Chip icon={<TrendingUpIcon />} label="Pattern Detection" variant="outlined" />
            </Box>
          </Box>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1d">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3}>
          {/* Daily Trend */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Daily Performance Trends
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={processedData.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="date" 
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                    />
                    <YAxis 
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
                    <Line
                      type="monotone"
                      dataKey="avgDownload"
                      stroke="#1565C0"
                      strokeWidth={3}
                      dot={{ fill: '#1565C0', strokeWidth: 2, r: 4 }}
                      name="Avg Download (Mbps)"
                    />
                    <Line
                      type="monotone"
                      dataKey="avgUpload"
                      stroke="#48BB78"
                      strokeWidth={3}
                      dot={{ fill: '#48BB78', strokeWidth: 2, r: 4 }}
                      name="Avg Upload (Mbps)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Hourly Distribution */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance by Hour of Day
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processedData.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="hour" 
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                    />
                    <YAxis 
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
                    <Bar dataKey="downloadSpeed" fill="#1565C0" name="Download (Mbps)" />
                    <Bar dataKey="uploadSpeed" fill="#48BB78" name="Upload (Mbps)" />
                  </BarChart>
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
                      data={processedData.speedRanges}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, percent }) => `${range} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {processedData.speedRanges?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Performance Correlation */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Speed vs Latency Correlation
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={processedData.correlationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      type="number" 
                      dataKey="downloadSpeed" 
                      name="Download Speed"
                      unit="Mbps"
                      stroke={theme.palette.text.secondary}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="latency" 
                      name="Latency"
                      unit="ms"
                      stroke={theme.palette.text.secondary}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '8px'
                      }}
                    />
                    <Scatter name="Tests" dataKey="latency" fill="#1565C0" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  )
}

export default Trends
