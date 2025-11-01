import React, { useState, useEffect } from 'react'
import { 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  Box,
  Chip,
  Card,
  CardContent,
  useTheme
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
  AreaChart,
  Area
} from 'recharts'
import { useSpeedtestData } from '../hooks/useSpeedtestData'
import StatsCard from '../components/StatsCard'
import { 
  Speed as SpeedIcon,
  Upload as UploadIcon,
  NetworkCheck as LatencyIcon,
  Wifi as WifiIcon 
} from '@mui/icons-material'

const Realtime = () => {
  const theme = useTheme()
  const { data, stats, loading, error } = useSpeedtestData()
  const [realtimeData, setRealtimeData] = useState([])

  // Get last 24 hours of data
  useEffect(() => {
    if (data && data.length > 0) {
      const now = new Date()
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const recent = data
        .filter(test => new Date(test.timestamp) >= last24Hours)
        .slice(-50) // Last 50 tests
        .map(test => ({
          ...test,
          time: new Date(test.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        }))
      
      setRealtimeData(recent)
    }
  }, [data])

  const getLatestTest = () => {
    if (!data || data.length === 0) return null
    return data[data.length - 1]
  }

  const latestTest = getLatestTest()

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading real-time data...</Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography color="error">Error loading data: {error}</Typography>
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
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Real-time Monitoring
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip 
              icon={<WifiIcon />} 
              label="Live" 
              color="success" 
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
            {latestTest && (
              <Typography variant="body2" color="text.secondary">
                Last update: {new Date(latestTest.timestamp).toLocaleString()}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Current Status Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Download Speed"
              value={latestTest?.downloadSpeed?.toFixed(2) || '--'}
              unit="Mbps"
              icon={<SpeedIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Upload Speed"
              value={latestTest?.uploadSpeed?.toFixed(2) || '--'}
              unit="Mbps"
              icon={<UploadIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Latency"
              value={latestTest?.latency?.toFixed(0) || '--'}
              unit="ms"
              icon={<LatencyIcon />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Status"
              value={latestTest?.hasError ? 'Error' : 'Good'}
              icon={<WifiIcon />}
              color={latestTest?.hasError ? 'error' : 'success'}
            />
          </Grid>
        </Grid>

        {/* Real-time Charts */}
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Speed Trends (Last 24 Hours)
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={realtimeData}>
                    <defs>
                      <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1565C0" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#1565C0" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#48BB78" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#48BB78" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="time" 
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
                    <Area
                      type="monotone"
                      dataKey="downloadSpeed"
                      stroke="#1565C0"
                      fillOpacity={1}
                      fill="url(#downloadGradient)"
                      strokeWidth={2}
                      name="Download (Mbps)"
                    />
                    <Area
                      type="monotone"
                      dataKey="uploadSpeed"
                      stroke="#48BB78"
                      fillOpacity={1}
                      fill="url(#uploadGradient)"
                      strokeWidth={2}
                      name="Upload (Mbps)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Latency Monitor
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={realtimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="time" 
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
                      dataKey="latency"
                      stroke="#ED8936"
                      strokeWidth={2}
                      dot={{ fill: '#ED8936', strokeWidth: 2, r: 3 }}
                      name="Latency (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  )
}

export default Realtime
