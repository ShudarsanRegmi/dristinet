import React, { useState, useMemo } from 'react'
import { 
  Container, 
  Typography, 
  Grid, 
  Card,
  CardContent,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  Chip,
  Button,
  ButtonGroup,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts'
import { useSpeedtestData } from '../hooks/useSpeedtestData'
import { 
  Compare as CompareIcon,
  Schedule as ScheduleIcon,
  Wifi as WifiIcon
} from '@mui/icons-material'

const Comparison = () => {
  const theme = useTheme()
  const { data, loading, error } = useSpeedtestData()
  const [comparisonType, setComparisonType] = useState('timeperiods')
  const [period1, setPeriod1] = useState('lastWeek')
  const [period2, setPeriod2] = useState('thisWeek')

  const comparisonData = useMemo(() => {
    if (!data || data.length === 0) return {}

    const now = new Date()
    let data1, data2, labels

    if (comparisonType === 'timeperiods') {
      // Time period comparison
      const getDateRange = (period) => {
        switch (period) {
          case 'lastWeek':
            return {
              start: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
              end: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
          case 'thisWeek':
            return {
              start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
              end: now
            }
          case 'lastMonth':
            return {
              start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
              end: new Date(now.getFullYear(), now.getMonth(), 0)
            }
          case 'thisMonth':
            return {
              start: new Date(now.getFullYear(), now.getMonth(), 1),
              end: now
            }
          default:
            return { start: new Date(0), end: now }
        }
      }

      const range1 = getDateRange(period1)
      const range2 = getDateRange(period2)

      data1 = data.filter(test => {
        const testDate = new Date(test.timestamp)
        return testDate >= range1.start && testDate <= range1.end && !test.hasError
      })

      data2 = data.filter(test => {
        const testDate = new Date(test.timestamp)
        return testDate >= range2.start && testDate <= range2.end && !test.hasError
      })

      labels = {
        period1: period1.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        period2: period2.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
      }
    } else {
      // ISP/Server comparison - group by most common servers
      const serverData = {}
      data.filter(test => !test.hasError).forEach(test => {
        const server = test.server || 'Unknown'
        if (!serverData[server]) {
          serverData[server] = []
        }
        serverData[server].push(test)
      })

      // Get top 2 servers by test count
      const topServers = Object.entries(serverData)
        .sort(([,a], [,b]) => b.length - a.length)
        .slice(0, 2)

      data1 = topServers[0]?.[1] || []
      data2 = topServers[1]?.[1] || []
      labels = {
        period1: topServers[0]?.[0] || 'Server 1',
        period2: topServers[1]?.[0] || 'Server 2'
      }
    }

    // Calculate statistics
    const calculateStats = (testData) => {
      if (testData.length === 0) return null
      
      const downloadSpeeds = testData.map(t => t.downloadSpeed).filter(s => s != null)
      const uploadSpeeds = testData.map(t => t.uploadSpeed).filter(s => s != null)
      const latencies = testData.map(t => t.latency).filter(l => l != null)

      return {
        avgDownload: downloadSpeeds.reduce((a, b) => a + b, 0) / downloadSpeeds.length,
        avgUpload: uploadSpeeds.reduce((a, b) => a + b, 0) / uploadSpeeds.length,
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        maxDownload: Math.max(...downloadSpeeds),
        minDownload: Math.min(...downloadSpeeds),
        maxUpload: Math.max(...uploadSpeeds),
        minUpload: Math.min(...uploadSpeeds),
        testCount: testData.length,
        reliability: ((testData.length / (testData.length + data.filter(t => t.hasError).length)) * 100)
      }
    }

    const stats1 = calculateStats(data1)
    const stats2 = calculateStats(data2)

    // Prepare chart data for side-by-side comparison
    const comparisonChartData = [
      {
        metric: 'Avg Download',
        [labels.period1]: stats1?.avgDownload || 0,
        [labels.period2]: stats2?.avgDownload || 0,
      },
      {
        metric: 'Avg Upload',
        [labels.period1]: stats1?.avgUpload || 0,
        [labels.period2]: stats2?.avgUpload || 0,
      },
      {
        metric: 'Avg Latency',
        [labels.period1]: stats1?.avgLatency || 0,
        [labels.period2]: stats2?.avgLatency || 0,
      }
    ]

    // Radar chart data
    const radarData = [
      {
        metric: 'Download Speed',
        [labels.period1]: Math.min((stats1?.avgDownload || 0) / 10 * 100, 100),
        [labels.period2]: Math.min((stats2?.avgDownload || 0) / 10 * 100, 100),
        fullMark: 100
      },
      {
        metric: 'Upload Speed',
        [labels.period1]: Math.min((stats1?.avgUpload || 0) / 10 * 100, 100),
        [labels.period2]: Math.min((stats2?.avgUpload || 0) / 10 * 100, 100),
        fullMark: 100
      },
      {
        metric: 'Low Latency',
        [labels.period1]: Math.max(0, 100 - (stats1?.avgLatency || 100)),
        [labels.period2]: Math.max(0, 100 - (stats2?.avgLatency || 100)),
        fullMark: 100
      },
      {
        metric: 'Reliability',
        [labels.period1]: stats1?.reliability || 0,
        [labels.period2]: stats2?.reliability || 0,
        fullMark: 100
      }
    ]

    return {
      stats1,
      stats2,
      labels,
      comparisonChartData,
      radarData,
      rawData1: data1,
      rawData2: data2
    }
  }, [data, comparisonType, period1, period2])

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading comparison data...</Typography>
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
            Performance Comparison
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip icon={<CompareIcon />} label="Side-by-Side Analysis" variant="outlined" />
            
            <ButtonGroup variant="outlined" size="small">
              <Button
                variant={comparisonType === 'timeperiods' ? 'contained' : 'outlined'}
                onClick={() => setComparisonType('timeperiods')}
                startIcon={<ScheduleIcon />}
              >
                Time Periods
              </Button>
              <Button
                variant={comparisonType === 'servers' ? 'contained' : 'outlined'}
                onClick={() => setComparisonType('servers')}
                startIcon={<WifiIcon />}
              >
                Servers/ISPs
              </Button>
            </ButtonGroup>

            {comparisonType === 'timeperiods' && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Period 1</InputLabel>
                  <Select
                    value={period1}
                    label="Period 1"
                    onChange={(e) => setPeriod1(e.target.value)}
                  >
                    <MenuItem value="lastWeek">Last Week</MenuItem>
                    <MenuItem value="thisWeek">This Week</MenuItem>
                    <MenuItem value="lastMonth">Last Month</MenuItem>
                    <MenuItem value="thisMonth">This Month</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Period 2</InputLabel>
                  <Select
                    value={period2}
                    label="Period 2"
                    onChange={(e) => setPeriod2(e.target.value)}
                  >
                    <MenuItem value="lastWeek">Last Week</MenuItem>
                    <MenuItem value="thisWeek">This Week</MenuItem>
                    <MenuItem value="lastMonth">Last Month</MenuItem>
                    <MenuItem value="thisMonth">This Month</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Comparison Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Statistical Comparison
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Metric</TableCell>
                        <TableCell align="right">{comparisonData.labels?.period1}</TableCell>
                        <TableCell align="right">{comparisonData.labels?.period2}</TableCell>
                        <TableCell align="right">Difference</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Average Download Speed</TableCell>
                        <TableCell align="right">
                          {comparisonData.stats1?.avgDownload?.toFixed(2) || '--'} Mbps
                        </TableCell>
                        <TableCell align="right">
                          {comparisonData.stats2?.avgDownload?.toFixed(2) || '--'} Mbps
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          color: (comparisonData.stats2?.avgDownload - comparisonData.stats1?.avgDownload) > 0 
                            ? 'success.main' : 'error.main' 
                        }}>
                          {((comparisonData.stats2?.avgDownload - comparisonData.stats1?.avgDownload) || 0).toFixed(2)} Mbps
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Upload Speed</TableCell>
                        <TableCell align="right">
                          {comparisonData.stats1?.avgUpload?.toFixed(2) || '--'} Mbps
                        </TableCell>
                        <TableCell align="right">
                          {comparisonData.stats2?.avgUpload?.toFixed(2) || '--'} Mbps
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          color: (comparisonData.stats2?.avgUpload - comparisonData.stats1?.avgUpload) > 0 
                            ? 'success.main' : 'error.main' 
                        }}>
                          {((comparisonData.stats2?.avgUpload - comparisonData.stats1?.avgUpload) || 0).toFixed(2)} Mbps
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Latency</TableCell>
                        <TableCell align="right">
                          {comparisonData.stats1?.avgLatency?.toFixed(0) || '--'} ms
                        </TableCell>
                        <TableCell align="right">
                          {comparisonData.stats2?.avgLatency?.toFixed(0) || '--'} ms
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          color: (comparisonData.stats2?.avgLatency - comparisonData.stats1?.avgLatency) < 0 
                            ? 'success.main' : 'error.main' 
                        }}>
                          {((comparisonData.stats2?.avgLatency - comparisonData.stats1?.avgLatency) || 0).toFixed(0)} ms
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Test Count</TableCell>
                        <TableCell align="right">{comparisonData.stats1?.testCount || 0}</TableCell>
                        <TableCell align="right">{comparisonData.stats2?.testCount || 0}</TableCell>
                        <TableCell align="right">
                          {(comparisonData.stats2?.testCount - comparisonData.stats1?.testCount) || 0}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Bar Chart Comparison */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData.comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="metric" 
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
                    <Bar 
                      dataKey={comparisonData.labels?.period1} 
                      fill="#1565C0" 
                      name={comparisonData.labels?.period1}
                    />
                    <Bar 
                      dataKey={comparisonData.labels?.period2} 
                      fill="#48BB78" 
                      name={comparisonData.labels?.period2}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Radar Chart */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Overall Performance
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={comparisonData.radarData}>
                    <PolarGrid stroke={theme.palette.divider} />
                    <PolarAngleAxis 
                      dataKey="metric" 
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                    />
                    <PolarRadiusAxis 
                      angle={0} 
                      domain={[0, 100]}
                      tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                    />
                    <Radar
                      name={comparisonData.labels?.period1}
                      dataKey={comparisonData.labels?.period1}
                      stroke="#1565C0"
                      fill="#1565C0"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Radar
                      name={comparisonData.labels?.period2}
                      dataKey={comparisonData.labels?.period2}
                      stroke="#48BB78"
                      fill="#48BB78"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  )
}

export default Comparison
