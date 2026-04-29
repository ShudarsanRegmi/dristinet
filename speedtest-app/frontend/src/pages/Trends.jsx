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
import { useSpeedtestData, useDailyRollup, useSpeedtestStats } from '../hooks/useSpeedtestData'
import LoadingSpinner from '../components/LoadingSpinner'
import { 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material'

const Trends = () => {
  const theme = useTheme()
  // Map timeRange to days for rollup
  const mapRangeToDays = (r) => {
    switch (r) {
      case '1d': return 1
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      default: return 365
    }
  }

  const [timeRange, setTimeRange] = useState('7d')
  const days = mapRangeToDays(timeRange)

  const { data: dailyData, loading: rollupLoading, error: rollupError } = useDailyRollup(days)
  const { stats, loading: statsLoading } = useSpeedtestStats()
  const { data: rawData, loading: rawLoading } = useSpeedtestData()
  const loading = rollupLoading || statsLoading || rawLoading
  const error = rollupError

  const processedData = useMemo(() => {
    // trendData comes from daily rollup endpoint
    const trendData = (dailyData || []).map(d => ({
      date: d.day,
      avgDownload: d.avg_download,
      avgUpload: d.avg_upload,
      avgLatency: d.avg_ping,
      testCount: d.samples
    })).sort((a, b) => new Date(a.date) - new Date(b.date))

    // hourly distribution comes from stats.hourly if available
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      downloadSpeed: 0,
      uploadSpeed: 0,
      testCount: 0
    }))

    if (stats?.hourly && stats.hourly.length > 0) {
      stats.hourly.forEach(h => {
        const idx = Number(h.hour)
        if (!Number.isNaN(idx) && idx >= 0 && idx < 24) {
          hourlyData[idx].downloadSpeed = h.avg_download ?? h.avgDownload ?? 0
          hourlyData[idx].uploadSpeed = h.avg_upload ?? h.avgUpload ?? 0
          hourlyData[idx].testCount = h.samples ?? 0
        }
      })
    }

    // Speed distribution & correlation use recent raw samples (if available)
    const speedRanges = [
      { range: '0-2 Mbps', min: 0, max: 2, count: 0 },
      { range: '2-5 Mbps', min: 2, max: 5, count: 0 },
      { range: '5-10 Mbps', min: 5, max: 10, count: 0 },
      { range: '10+ Mbps', min: 10, max: Infinity, count: 0 },
    ]

    const filteredRaw = (rawData || []).filter(t => !t.hasError && t.downloadSpeed != null)
    filteredRaw.forEach(test => {
      speedRanges.forEach(range => {
        if (test.downloadSpeed >= range.min && test.downloadSpeed < range.max) {
          range.count++
        }
      })
    })

    const correlationData = filteredRaw.map(test => ({
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
  }, [dailyData, stats, rawData, timeRange])

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
