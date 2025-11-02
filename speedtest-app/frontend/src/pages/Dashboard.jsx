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
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
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

  // Get all valid data for charts
  const recentData = data.filter(item => !item.hasError && item.downloadSpeed)

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
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

      {/* Main Chart - Full Width */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <SpeedChart 
            data={recentData} 
            title="Interactive Speed Analysis - Click points for details, use brush to zoom"
            type="points"
          />
        </Grid>
      </Grid>

      {/* Test Summary - Horizontal Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Paper sx={{ p: 2, textAlign: 'center', height: 120 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Tests
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {stats.totalTests || 0}
              </Typography>
            </Paper>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Paper sx={{ p: 2, textAlign: 'center', height: 120 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Peak Speed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {stats.maxDownload?.toFixed(1) || '0'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mbps
              </Typography>
            </Paper>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Paper sx={{ p: 2, textAlign: 'center', height: 120 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Lowest Speed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                {stats.minDownload?.toFixed(1) || '0'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mbps
              </Typography>
            </Paper>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Paper sx={{ p: 2, textAlign: 'center', height: 120 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Failed Tests
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {stats.failedTests || 0}
              </Typography>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Recent Tests Overview
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Monitoring {data.length} total speed tests with {stats.successRate?.toFixed(1)}% success rate
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Avg Download</Typography>
                  <Typography variant="h6" color="primary.main">{stats.avgDownload?.toFixed(1)} Mbps</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Avg Upload</Typography>
                  <Typography variant="h6" color="success.main">{stats.avgUpload?.toFixed(1)} Mbps</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Avg Latency</Typography>
                  <Typography variant="h6" color="warning.main">{stats.avgLatency?.toFixed(0)} ms</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </motion.div>
    </Container>
  )
}

export default Dashboard
