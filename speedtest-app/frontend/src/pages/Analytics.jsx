import React, { useState } from 'react'
import {
  Box,
  Grid,
  Typography,
  Container,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
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
} from 'recharts'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useSpeedtestData, useDailyStats } from '../hooks/useSpeedtestData'
import SpeedChart from '../components/SpeedChart'

const Analytics = () => {
  const { data } = useSpeedtestData()
  const { dailyData } = useDailyStats()
  const [chartType, setChartType] = useState('daily')

  // Process data for different chart types
  const processHourlyData = () => {
    const hourlyStats = {}
    
    data.forEach(test => {
      if (test.hasError || !test.downloadSpeed) return
      
      const hour = new Date(test.timestamp).getHours()
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { hour, speeds: [], count: 0 }
      }
      hourlyStats[hour].speeds.push(test.downloadSpeed)
      hourlyStats[hour].count++
    })
    
    return Object.values(hourlyStats).map(stat => ({
      hour: stat.hour,
      avgSpeed: stat.speeds.reduce((a, b) => a + b, 0) / stat.speeds.length,
      testCount: stat.count,
      label: `${stat.hour}:00`,
    })).sort((a, b) => a.hour - b.hour)
  }

  const processSpeedDistribution = () => {
    const ranges = [
      { min: 0, max: 10, label: '0-10 Mbps', color: '#f44336' },
      { min: 10, max: 25, label: '10-25 Mbps', color: '#ff9800' },
      { min: 25, max: 50, label: '25-50 Mbps', color: '#ffeb3b' },
      { min: 50, max: 100, label: '50-100 Mbps', color: '#8bc34a' },
      { min: 100, max: Infinity, label: '100+ Mbps', color: '#4caf50' },
    ]

    const distribution = ranges.map(range => ({
      ...range,
      count: data.filter(test => 
        !test.hasError && 
        test.downloadSpeed >= range.min && 
        test.downloadSpeed < range.max
      ).length
    }))

    return distribution.filter(d => d.count > 0)
  }

  const hourlyData = processHourlyData()
  const speedDistribution = processSpeedDistribution()

  const chartData = chartType === 'daily' ? dailyData : 
                   chartType === 'hourly' ? hourlyData : data.slice(-30)

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Detailed Analytics
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
            Deep insights into your network performance patterns
          </Typography>
        </Box>
      </motion.div>

      {/* Chart Type Selector */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(_, newType) => newType && setChartType(newType)}
        >
          <ToggleButton value="daily">Daily Trends</ToggleButton>
          <ToggleButton value="hourly">Hourly Pattern</ToggleButton>
          <ToggleButton value="recent">Recent Activity</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3}>
        {/* Main Chart */}
        <Grid item xs={12} lg={8}>
          {chartType === 'recent' ? (
            <SpeedChart 
              data={data.slice(-30)} 
              title="Recent Speed Tests"
              type="line"
            />
          ) : (
            <motion.div
              key={chartType}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card sx={{ height: 400 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    {chartType === 'daily' ? 'Daily Average Speeds' : 'Hourly Performance Pattern'}
                  </Typography>
                  
                  <Box sx={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey={chartType === 'daily' ? 'date' : 'label'}
                          tickFormatter={chartType === 'daily' ? 
                            (value) => format(new Date(value), 'MMM dd') : 
                            undefined
                          }
                        />
                        <YAxis label={{ value: 'Speed (Mbps)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          formatter={(value) => [`${value.toFixed(2)} Mbps`, 'Average Speed']}
                        />
                        <Bar 
                          dataKey={chartType === 'daily' ? 'avgDownload' : 'avgSpeed'}
                          fill="#1976d2"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </Grid>

        {/* Speed Distribution */}
        <Grid item xs={12} lg={4}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Speed Distribution
                </Typography>
                
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={speedDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {speedDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} tests`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  {speedDistribution.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          bgcolor: item.color, 
                          borderRadius: 1, 
                          mr: 1 
                        }} 
                      />
                      <Typography variant="caption">
                        {item.label}: {item.count} tests
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Performance Insights */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Performance Insights
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Best Performance Time
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'success.main' }}>
                      {hourlyData.length > 0 ? 
                        `${hourlyData.reduce((best, current) => 
                          current.avgSpeed > best.avgSpeed ? current : best
                        ).hour}:00` : 'N/A'
                      }
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Most Active Hour
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'primary.main' }}>
                      {hourlyData.length > 0 ?
                        `${hourlyData.reduce((busiest, current) => 
                          current.testCount > busiest.testCount ? current : busiest
                        ).hour}:00` : 'N/A'
                      }
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Speed Consistency
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'info.main' }}>
                      {data.length > 0 ? (
                        data.filter(t => !t.hasError).length / data.length > 0.9 ? 'Excellent' : 
                        data.filter(t => !t.hasError).length / data.length > 0.7 ? 'Good' : 'Needs Attention'
                      ) : 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  )
}

export default Analytics
