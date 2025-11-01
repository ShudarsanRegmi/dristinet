import React, { useState, useMemo } from 'react'
import Plot from 'react-plotly.js'
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  useTheme, 
  ToggleButton, 
  ToggleButtonGroup,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Select,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material'
import { motion } from 'framer-motion'
import { format, subDays, subHours, subWeeks } from 'date-fns'
import {
  ShowChart as LineIcon,
  ScatterPlot as PointIcon,
  Timeline as AreaIcon,
  MoreVert as MoreIcon,
  Fullscreen as FullscreenIcon,
  ZoomIn as ZoomIcon,
  RestartAlt as ResetIcon,
  GetApp as ExportIcon,
  PanTool as PanIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material'

const SpeedChart = ({ data, title, type = 'points' }) => {
  const theme = useTheme()
  const [chartType, setChartType] = useState(type || 'points')
  const [anchorEl, setAnchorEl] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedPoints, setSelectedPoints] = useState([])
  const [showDownload, setShowDownload] = useState(true)
  const [showUpload, setShowUpload] = useState(true)
  const [timeRange, setTimeRange] = useState('all')

  // Process data for Plotly with time range filtering
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { x: [], downloadSpeed: [], uploadSpeed: [], timestamps: [] }
    
    let validData = data.filter(item => !item.hasError && item.downloadSpeed)
    
    // Apply time range filter
    const now = new Date()
    let cutoffTime
    
    switch (timeRange) {
      case '24h':
        cutoffTime = subHours(now, 24)
        break
      case '1week':
        cutoffTime = subWeeks(now, 1)
        break
      case '30days':
        cutoffTime = subDays(now, 30)
        break
      case 'all':
      default:
        cutoffTime = null
        break
    }
    
    if (cutoffTime) {
      validData = validData.filter(item => new Date(item.timestamp) >= cutoffTime)
    }
    
    return {
      x: validData.map(item => new Date(item.timestamp)),
      downloadSpeed: validData.map(item => item.downloadSpeed || 0),
      uploadSpeed: validData.map(item => item.uploadSpeed || 0),
      timestamps: validData.map(item => item.timestamp),
      servers: validData.map(item => item.server || 'Unknown'),
      latency: validData.map(item => item.latency || 0),
      rawData: validData
    }
  }, [data, timeRange])

  // Create Plotly traces based on chart type and visibility settings
  const createTraces = () => {
    const traces = []
    const baseTrace = {
      x: chartData.x,
      hovertemplate: 
        '<b>%{text}</b><br>' +
        'Date: %{x|%Y-%m-%d}<br>' +
        'Time: %{x|%H:%M:%S}<br>' +
        'Speed: %{y:.2f} Mbps<br>' +
        'Server: %{customdata[0]}<br>' +
        'Latency: %{customdata[1]} ms<br>' +
        '<extra></extra>',
      customdata: chartData.rawData.map(item => [item.server || 'Unknown', item.latency || 'N/A'])
    }

    // Download Speed traces
    if (showDownload) {
      const downloadTrace = {
        ...baseTrace,
        y: chartData.downloadSpeed,
        name: 'Download Speed',
        text: chartData.rawData.map(item => `Download: ${item.downloadSpeed?.toFixed(2)} Mbps`),
      }

      switch (chartType) {
        case 'points':
          traces.push({
            ...downloadTrace,
            type: 'scattergl',
            mode: 'markers',
            marker: {
              color: theme.palette.primary.main,
              size: 8,
              opacity: 0.8,
              line: { width: 1, color: theme.palette.primary.dark }
            }
          })
          break
        
        case 'line':
          traces.push({
            ...downloadTrace,
            type: 'scattergl',
            mode: 'lines+markers',
            line: { color: theme.palette.primary.main, width: 2 },
            marker: { color: theme.palette.primary.main, size: 6 }
          })
          break
        
        case 'area':
          traces.push({
            ...downloadTrace,
            type: 'scatter',
            mode: 'lines',
            fill: 'tonexty',
            fillcolor: `${theme.palette.primary.main}20`,
            line: { color: theme.palette.primary.main, width: 2 }
          })
          break
      }
    }

    // Upload Speed traces
    if (showUpload) {
      const uploadTrace = {
        ...baseTrace,
        y: chartData.uploadSpeed,
        name: 'Upload Speed',
        text: chartData.rawData.map(item => `Upload: ${item.uploadSpeed?.toFixed(2)} Mbps`),
      }

      switch (chartType) {
        case 'points':
          traces.push({
            ...uploadTrace,
            type: 'scattergl',
            mode: 'markers',
            marker: {
              color: theme.palette.success.main,
              size: 8,
              opacity: 0.8,
              symbol: 'triangle-up',
              line: { width: 1, color: theme.palette.success.dark }
            }
          })
          break
        
        case 'line':
          traces.push({
            ...uploadTrace,
            type: 'scattergl',
            mode: 'lines+markers',
            line: { color: theme.palette.success.main, width: 2 },
            marker: { color: theme.palette.success.main, size: 6 }
          })
          break
        
        case 'area':
          traces.push({
            ...uploadTrace,
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            fillcolor: `${theme.palette.success.main}20`,
            line: { color: theme.palette.success.main, width: 2 }
          })
          break
      }
    }

    return traces
  }

  const handleChartTypeChange = (event, newType) => {
    if (newType !== null) {
      setChartType(newType)
    }
  }

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    setAnchorEl(null)
  }

  const handlePlotlyEvent = (eventData) => {
    if (eventData.points) {
      setSelectedPoints(eventData.points.map(point => ({
        x: point.x,
        y: point.y,
        pointIndex: point.pointIndex,
        curveNumber: point.curveNumber
      })))
    }
  }

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value)
  }

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '24h': return 'Last 24 Hours'
      case '1week': return 'Last Week' 
      case '30days': return 'Last 30 Days'
      case 'all': return 'All Time'
      default: return 'All Time'
    }
  }

  // Add reference lines for common speed thresholds
  const addReferenceLines = (traces) => {
    const referenceLines = []
    
    // Add reference lines for common internet speed benchmarks
    const speedBenchmarks = [
      { speed: 25, label: 'HD Streaming (25 Mbps)', color: 'rgba(255, 193, 7, 0.6)' },
      { speed: 100, label: 'High-Speed (100 Mbps)', color: 'rgba(76, 175, 80, 0.6)' }
    ]
    
    speedBenchmarks.forEach(benchmark => {
      if (chartData.x.length > 0) {
        referenceLines.push({
          type: 'scatter',
          mode: 'lines',
          x: [chartData.x[0], chartData.x[chartData.x.length - 1]],
          y: [benchmark.speed, benchmark.speed],
          line: {
            color: benchmark.color,
            width: 1,
            dash: 'dash'
          },
          name: benchmark.label,
          showlegend: false,
          hovertemplate: `${benchmark.label}<extra></extra>`
        })
      }
    })
    
    return [...traces, ...referenceLines]
  }

  // Plotly layout configuration with normal scaling
  const layout = {
    title: false,
    showlegend: true,
    legend: {
      orientation: 'h',
      y: -0.15,
      x: 0.5,
      xanchor: 'center',
      font: { color: theme.palette.text.primary }
    },
    xaxis: {
      type: 'date',
      title: 'Time',
      gridcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      tickfont: { color: theme.palette.text.secondary },
      titlefont: { color: theme.palette.text.primary },
      tickmode: 'auto',
      nticks: 10,
      tickformat: timeRange === '24h' ? '%H:%M' : timeRange === '1week' ? '%m/%d %H:%M' : '%m/%d',
      showticklabels: true,
      tickangle: -45
    },
    yaxis: {
      title: 'Speed (Mbps)',
      gridcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      tickfont: { color: theme.palette.text.secondary },
      titlefont: { color: theme.palette.text.primary },
      rangemode: 'tozero', // Force scale to start from 0
      range: [0, null], // Start from 0, let max be automatic
      zeroline: true,
      zerolinecolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
      zerolinewidth: 2
    },
    plot_bgcolor: 'transparent',
    paper_bgcolor: 'transparent',
    margin: { l: 60, r: 30, t: 30, b: 80 },
    dragmode: 'zoom',
    hovermode: 'closest'
  }

  // Plotly configuration
  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
    modeBarButtonsToAdd: [
      {
        name: 'Export PNG',
        icon: {
          width: 857.1,
          height: 1000,
          path: 'M214.3 285.7v428.6h428.6v-428.6h-428.6z M214.3 142.9h428.6c78.8 0 142.8 64 142.8 142.8v428.6c0 78.8-64 142.8-142.8 142.8h-428.6c-78.8 0-142.8-64-142.8-142.8v-428.6c0-78.8 64-142.8 142.8-142.8z'
        },
        click: function(gd) {
          window.Plotly.downloadImage(gd, {
            format: 'png',
            width: 1200,
            height: 600,
            filename: `speedtest-chart-${new Date().toISOString().split('T')[0]}`
          })
        }
      }
    ],
    responsive: true
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography>No data available</Typography>
        </CardContent>
      </Card>
    )
  }

  const cardHeight = isFullscreen ? '90vh' : 650
  const plotHeight = isFullscreen ? '85vh' : 520

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        position: isFullscreen ? 'fixed' : 'static',
        top: isFullscreen ? '5vh' : 'auto',
        left: isFullscreen ? '5vw' : 'auto',
        width: isFullscreen ? '90vw' : '100%',
        height: isFullscreen ? '90vh' : 'auto',
        zIndex: isFullscreen ? 1300 : 'auto',
      }}
    >
      <Card sx={{ height: cardHeight, bgcolor: 'background.paper' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title} - {getTimeRangeLabel()}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ToggleButtonGroup
                value={chartType}
                exclusive
                onChange={handleChartTypeChange}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.75rem',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      }
                    }
                  }
                }}
              >
                <ToggleButton value="points" aria-label="scatter plot">
                  <PointIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Points
                </ToggleButton>
                <ToggleButton value="line" aria-label="line chart">
                  <LineIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Line
                </ToggleButton>
                <ToggleButton value="area" aria-label="area chart">
                  <AreaIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Area
                </ToggleButton>
              </ToggleButtonGroup>
              
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                sx={{ ml: 1 }}
              >
                <MoreIcon />
              </IconButton>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={toggleFullscreen}>
                  <FullscreenIcon sx={{ mr: 1 }} />
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          {/* Controls Row */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            mb: 2,
            flexWrap: 'wrap',
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1
          }}>
            {/* Time Range Selector */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={handleTimeRangeChange}
                startAdornment={<DateRangeIcon sx={{ mr: 1, fontSize: 'small' }} />}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="1week">Last Week</MenuItem>
                <MenuItem value="30days">Last 30 Days</MenuItem>
              </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem />

            {/* Visibility Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Show:
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showDownload}
                    onChange={(e) => setShowDownload(e.target.checked)}
                    size="small"
                    sx={{ 
                      color: theme.palette.primary.main,
                      '&.Mui-checked': { color: theme.palette.primary.main }
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      bgcolor: theme.palette.primary.main 
                    }} />
                    <Typography variant="body2">Download</Typography>
                  </Box>
                }
                sx={{ mr: 1 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showUpload}
                    onChange={(e) => setShowUpload(e.target.checked)}
                    size="small"
                    sx={{ 
                      color: theme.palette.success.main,
                      '&.Mui-checked': { color: theme.palette.success.main }
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      bgcolor: theme.palette.success.main 
                    }} />
                    <Typography variant="body2">Upload</Typography>
                  </Box>
                }
              />
            </Box>
          </Box>

          {/* Status and Info */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            mb: 2,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <Chip
              label={`${chartData.rawData.length} tests displayed`}
              size="small"
              variant="outlined"
              color="secondary"
            />
            {!showDownload && !showUpload && (
              <Chip
                label="No data visible - enable Download or Upload"
                size="small"
                variant="filled"
                color="warning"
              />
            )}
            {selectedPoints.length > 0 && (
              <Chip
                label={`${selectedPoints.length} selected`}
                size="small"
                variant="filled"
                color="warning"
                onDelete={() => setSelectedPoints([])}
              />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              � Drag to zoom • Double-click to reset • Click toolbar for more options
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1, width: '100%' }}>
            <Plot
              data={addReferenceLines(createTraces())}
              layout={{
                ...layout,
                height: plotHeight,
                font: { color: theme.palette.text.primary }
              }}
              config={config}
              onClick={handlePlotlyEvent}
              onSelected={handlePlotlyEvent}
              style={{ width: '100%', height: plotHeight }}
              useResizeHandler
            />
          </Box>
        </CardContent>
      </Card>

      {isFullscreen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1299,
          }}
          onClick={toggleFullscreen}
        />
      )}
    </motion.div>
  )
}

export default SpeedChart
