import React from 'react'
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Container,
  Paper,
} from '@mui/material'
import {
  Speed as SpeedIcon,
  Upload as UploadIcon,
  AccessTime as LatencyIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import StatsCard from '../components/StatsCard'
import SpeedChart from '../components/SpeedChart'
import { useSpeedtestData, useSpeedtestStats } from '../hooks/useSpeedtestData'

const Dashboard = () => {
  const { data, loading: dataLoading, error: dataError } = useSpeedtestData()
  const { stats, loading: statsLoading, error: statsError } = useSpeedtestStats()

  if (dataLoading || statsLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={60} />
      </Container>
    )
  }

  if (dataError || statsError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">
          Error loading data: {dataError || statsError}
        </Alert>
      </Container>
    )
  }

  // Get recent data for charts (last 50 tests)
  const recentData = data.slice(-50).filter(item => !item.hasError && item.downloadSpeed)

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Network Performance Dashboard
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
            Real-time insights into your internet connectivity
          </Typography>
        </Box>
      </motion.div>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Avg Download Speed"
            value={stats.avgDownload?.toFixed(1) || '0'}
            unit="Mbps"
            icon={<SpeedIcon sx={{ fontSize: 32 }} />}
            color="primary"
            delay={0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Avg Upload Speed"
            value={stats.avgUpload?.toFixed(1) || '0'}
            unit="Mbps"
            icon={<UploadIcon sx={{ fontSize: 32 }} />}
            color="secondary"
            delay={0.1}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Avg Latency"
            value={stats.avgLatency?.toFixed(0) || '0'}
            unit="ms"
            icon={<LatencyIcon sx={{ fontSize: 32 }} />}
            color="warning"
            delay={0.2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Success Rate"
            value={stats.successRate?.toFixed(1) || '0'}
            unit="%"
            icon={<SuccessIcon sx={{ fontSize: 32 }} />}
            color="success"
            delay={0.3}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <SpeedChart 
            data={recentData} 
            title="Speed Trends (Recent Tests)"
            type="area"
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Test Summary
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Tests Performed
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {stats.totalTests || 0}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Peak Download Speed
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {stats.maxDownload?.toFixed(1) || '0'} Mbps
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Lowest Speed Recorded
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'error.main' }}>
                  {stats.minDownload?.toFixed(1) || '0'} Mbps
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Failed Tests
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  {stats.failedTests || 0}
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Recent Tests Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitoring {data.length} total speed tests. 
            Current success rate: {stats.successRate?.toFixed(1)}%
          </Typography>
        </Paper>
      </motion.div>
    </Container>
  )
}

export default Dashboard
