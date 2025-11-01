import React, { useState } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Brush,
  ReferenceLine
} from 'recharts'
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
  RestartAlt as ResetIcon
} from '@mui/icons-material'

const SpeedChart = ({ data, title, type = 'points' }) => {
  const theme = useTheme()
  const [chartType, setChartType] = useState(type || 'points')
  const [anchorEl, setAnchorEl] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomDomain, setZoomDomain] = useState({ left: 'dataMin', right: 'dataMax' })
  const [selectedPoint, setSelectedPoint] = useState(null)

  const formatData = (rawData) => {
    return rawData.map((item, index) => ({
      ...item,
      timestamp: new Date(item.timestamp).getTime(),
      formattedDate: format(new Date(item.timestamp), 'MMM dd HH:mm'),
      id: index,
    }))
  }

  const chartData = formatData(data)

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload
      return (
        <Card 
          sx={{ 
            p: 2, 
            minWidth: 250,
            maxWidth: 350,
            boxShadow: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'primary.main' }}>
            Speed Test Details
          </Typography>
          
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {format(new Date(label), 'MMM dd, yyyy HH:mm:ss')}
            </Typography>
          </Box>

          {payload.map((entry, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: entry.color,
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                <Box component="span" sx={{ color: 'text.secondary' }}>{entry.name}:</Box>
                <Box component="span" sx={{ ml: 0.5, fontWeight: 600 }}>
                  {entry.value?.toFixed(2)} Mbps
                </Box>
              </Typography>
            </Box>
          ))}
          
          {dataPoint && (
            <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                <strong>Server:</strong> {dataPoint.server || 'Unknown'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                <strong>Ping:</strong> {dataPoint.ping ? `${dataPoint.ping} ms` : 'N/A'}
              </Typography>
            </Box>
          )}
        </Card>
      )
    }
    return null
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

  const handleZoom = (domain) => {
    if (domain) {
      setZoomDomain({
        left: domain.left || 'dataMin',
        right: domain.right || 'dataMax'
      })
    }
  }

  const resetZoom = () => {
    setZoomDomain({ left: 'dataMin', right: 'dataMax' })
    setAnchorEl(null)
  }

  const handlePointClick = (data) => {
    setSelectedPoint(selectedPoint?.id === data.id ? null : data)
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    }

    const commonElements = (
      <>
        <defs>
          <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.05}/>
          </linearGradient>
          <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0.05}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis 
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={[zoomDomain.left, zoomDomain.right]}
          tickFormatter={(value) => format(new Date(value), 'HH:mm')}
          stroke={theme.palette.text.secondary}
          fontSize={12}
          allowDataOverflow={true}
        />
        <YAxis 
          stroke={theme.palette.text.secondary}
          label={{ value: 'Speed (Mbps)', angle: -90, position: 'insideLeft' }}
          fontSize={12}
          allowDataOverflow={true}
        />
        <Tooltip content={<CustomTooltip />} />
        <Brush
          dataKey="timestamp"
          height={30}
          stroke={theme.palette.primary.main}
          onChange={handleZoom}
          tickFormatter={(value) => format(new Date(value), 'HH:mm')}
        />
      </>
    )

    switch (chartType) {
      case 'points':
        return (
          <ScatterChart {...commonProps}>
            {commonElements}
            {selectedPoint && (
              <>
                <ReferenceLine 
                  x={selectedPoint.timestamp} 
                  stroke={theme.palette.warning.main}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
                <ReferenceLine 
                  y={selectedPoint.downloadSpeed} 
                  stroke={theme.palette.primary.main}
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              </>
            )}
            <Scatter
              dataKey="downloadSpeed"
              fill={theme.palette.primary.main}
              name="Download"
              shape="circle"
              onClick={handlePointClick}
              style={{ cursor: 'pointer' }}
            />
            <Scatter
              dataKey="uploadSpeed"
              fill={theme.palette.success.main}
              name="Upload"
              shape="triangle"
              onClick={handlePointClick}
              style={{ cursor: 'pointer' }}
            />
          </ScatterChart>
        )
      
      case 'line':
        return (
          <LineChart {...commonProps}>
            {commonElements}
            <Line
              type="monotone"
              dataKey="downloadSpeed"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="Download"
            />
            <Line
              type="monotone"
              dataKey="uploadSpeed"
              stroke={theme.palette.success.main}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="Upload"
            />
          </LineChart>
        )
      
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {commonElements}
            <Area
              type="monotone"
              dataKey="downloadSpeed"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              fill="url(#downloadGradient)"
              name="Download"
            />
            <Area
              type="monotone"
              dataKey="uploadSpeed"
              stroke={theme.palette.success.main}
              strokeWidth={2}
              fill="url(#uploadGradient)"
              name="Upload"
            />
          </AreaChart>
        )
      
      default:
        return renderChart()
    }
  }

  const cardHeight = isFullscreen ? '80vh' : 600
  const chartHeight = isFullscreen ? 'calc(80vh - 140px)' : 480

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        position: isFullscreen ? 'fixed' : 'static',
        top: isFullscreen ? '10vh' : 'auto',
        left: isFullscreen ? '10vw' : 'auto',
        width: isFullscreen ? '80vw' : '100%',
        height: isFullscreen ? '80vh' : 'auto',
        zIndex: isFullscreen ? 1300 : 'auto',
      }}
    >
      <Card sx={{ height: cardHeight, bgcolor: 'background.paper' }}>
        <CardContent>
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
                <MenuItem onClick={resetZoom}>
                  <ResetIcon sx={{ mr: 1 }} />
                  Reset Zoom
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
              label={`${chartData.length} data points`}
              size="small"
              variant="outlined"
              color="secondary"
            />
            {selectedPoint && (
              <Chip
                label={`Selected: ${format(new Date(selectedPoint.timestamp), 'HH:mm')} - ${selectedPoint.downloadSpeed?.toFixed(1)} Mbps`}
                size="small"
                variant="filled"
                color="warning"
                onDelete={() => setSelectedPoint(null)}
              />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              💡 Use brush below chart to zoom • Click points for details
            </Typography>
          </Box>
          
          <Box sx={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer>
              {renderChart()}
            </ResponsiveContainer>
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
