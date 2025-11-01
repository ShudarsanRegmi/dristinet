import React from 'react'
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
} from 'recharts'
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material'
import { motion } from 'framer-motion'
import { format } from 'date-fns'

const SpeedChart = ({ data, title, type = 'line' }) => {
  const theme = useTheme()

  const formatData = (rawData) => {
    return rawData.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp).getTime(),
      formattedDate: format(new Date(item.timestamp), 'MMM dd HH:mm'),
    }))
  }

  const chartData = formatData(data)

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Card sx={{ p: 1, minWidth: 200 }}>
          <Typography variant="subtitle2">
            {format(new Date(label), 'MMM dd, yyyy HH:mm')}
          </Typography>
          {payload.map((entry, index) => (
            <Typography 
              key={index}
              variant="body2" 
              sx={{ color: entry.color }}
            >
              {entry.name}: {entry.value?.toFixed(2)} Mbps
            </Typography>
          ))}
        </Card>
      )
    }
    return null
  }

  const Chart = type === 'area' ? AreaChart : LineChart

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card sx={{ height: 400 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {title}
          </Typography>
          
          <Box sx={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <Chart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                  stroke={theme.palette.text.secondary}
                />
                <YAxis 
                  stroke={theme.palette.text.secondary}
                  label={{ value: 'Speed (Mbps)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {type === 'area' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="downloadSpeed"
                      stroke={theme.palette.primary.main}
                      strokeWidth={3}
                      dot={false}
                      name="Download"
                    />
                    <Line
                      type="monotone"
                      dataKey="uploadSpeed"
                      stroke={theme.palette.success.main}
                      strokeWidth={3}
                      dot={false}
                      name="Upload"
                    />
                  </>
                )}
              </Chart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default SpeedChart
