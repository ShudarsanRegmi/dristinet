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
  MenuItem
} from '@mui/material'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  ShowChart as LineIcon,
  ScatterPlot as PointIcon,
  Timeline as AreaIcon,
  MoreVert as MoreIcon,
  Fullscreen as FullscreenIcon,
  ZoomIn as ZoomIcon,
  RestartAlt as ResetIcon,
  GetApp as ExportIcon,
  PanTool as PanIcon
} from '@mui/icons-material'

const SpeedChart = ({ data, title, type = 'points' }) => {
  const theme = useTheme()
  const [chartType, setChartType] = useState(type || 'points')
  const [anchorEl, setAnchorEl] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedPoints, setSelectedPoints] = useState([])

  // Process data for Plotly
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { x: [], downloadSpeed: [], uploadSpeed: [], timestamps: [] }
    
    const validData = data.filter(item => !item.hasError && item.downloadSpeed)
    
    return {
      x: validData.map(item => new Date(item.timestamp)),
      downloadSpeed: validData.map(item => item.downloadSpeed || 0),
      uploadSpeed: validData.map(item => item.uploadSpeed || 0),
      timestamps: validData.map(item => item.timestamp),
      servers: validData.map(item => item.server || 'Unknown'),
      latency: validData.map(item => item.latency || 0),
      rawData: validData
    }
  }, [data])

  // Create Plotly traces based on chart type
  const createTraces = () => {
    const baseTrace = {
      x: chartData.x,
      hovertemplate: 
        '<b>%{text}</b><br>' +
        'Time: %{x}<br>' +
        'Speed: %{y:.2f} Mbps<br>' +
        'Server: %{customdata[0]}<br>' +
        'Latency: %{customdata[1]} ms<br>' +
        '<extra></extra>',
      customdata: chartData.rawData.map(item => [item.server || 'Unknown', item.latency || 'N/A'])
    }

    switch (chartType) {
      case 'points':
        return [
          {
            ...baseTrace,
            y: chartData.downloadSpeed,
            type: 'scattergl',
            mode: 'markers',
            name: 'Download Speed',
            text: chartData.rawData.map(item => `Download: ${item.downloadSpeed?.toFixed(2)} Mbps`),
            marker: {
              color: theme.palette.primary.main,
              size: 8,
              opacity: 0.8,
              line: { width: 1, color: theme.palette.primary.dark }
            }
          },
          {
            ...baseTrace,
            y: chartData.uploadSpeed,
            type: 'scattergl',
            mode: 'markers',
            name: 'Upload Speed',
            text: chartData.rawData.map(item => `Upload: ${item.uploadSpeed?.toFixed(2)} Mbps`),
            marker: {
              color: theme.palette.success.main,
              size: 8,
              opacity: 0.8,
              symbol: 'triangle-up',
              line: { width: 1, color: theme.palette.success.dark }
            }
          }
        ]
      
      case 'line':
        return [
          {
            ...baseTrace,
            y: chartData.downloadSpeed,
            type: 'scattergl',
            mode: 'lines+markers',
            name: 'Download Speed',
            text: chartData.rawData.map(item => `Download: ${item.downloadSpeed?.toFixed(2)} Mbps`),
            line: { color: theme.palette.primary.main, width: 2 },
            marker: { color: theme.palette.primary.main, size: 6 }
          },
          {
            ...baseTrace,
            y: chartData.uploadSpeed,
            type: 'scattergl',
            mode: 'lines+markers',
            name: 'Upload Speed',
            text: chartData.rawData.map(item => `Upload: ${item.uploadSpeed?.toFixed(2)} Mbps`),
            line: { color: theme.palette.success.main, width: 2 },
            marker: { color: theme.palette.success.main, size: 6 }
          }
        ]
      
      case 'area':
        return [
          {
            ...baseTrace,
            y: chartData.downloadSpeed,
            type: 'scatter',
            mode: 'lines',
            name: 'Download Speed',
            text: chartData.rawData.map(item => `Download: ${item.downloadSpeed?.toFixed(2)} Mbps`),
            fill: 'tonexty',
            fillcolor: `${theme.palette.primary.main}20`,
            line: { color: theme.palette.primary.main, width: 2 }
          },
          {
            ...baseTrace,
            y: chartData.uploadSpeed,
            type: 'scatter',
            mode: 'lines',
            name: 'Upload Speed',
            text: chartData.rawData.map(item => `Upload: ${item.uploadSpeed?.toFixed(2)} Mbps`),
            fill: 'tozeroy',
            fillcolor: `${theme.palette.success.main}20`,
            line: { color: theme.palette.success.main, width: 2 }
          }
        ]
      
      default:
        return createTraces()
    }
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

  // Plotly layout configuration
  const layout = {
    title: false,
    showlegend: true,
    legend: {
      orientation: 'h',
      y: -0.1,
      x: 0.5,
      xanchor: 'center',
      font: { color: theme.palette.text.primary }
    },
    xaxis: {
      type: 'date',
      title: 'Time',
      gridcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      tickfont: { color: theme.palette.text.secondary },
      titlefont: { color: theme.palette.text.primary }
    },
    yaxis: {
      title: 'Speed (Mbps)',
      gridcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      tickfont: { color: theme.palette.text.secondary },
      titlefont: { color: theme.palette.text.primary }
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
              {title}
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

          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            mb: 2,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <Chip
              icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.primary.main }} />}
              label="Download Speed"
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.success.main }} />}
              label="Upload Speed"
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${chartData.rawData.length} tests`}
              size="small"
              variant="outlined"
              color="secondary"
            />
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
              data={createTraces()}
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
