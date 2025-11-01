import React from 'react'
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material'
import { motion } from 'framer-motion'

const StatsCard = ({ 
  title, 
  value, 
  unit, 
  icon, 
  color = 'primary', 
  trend = null,
  delay = 0 
}) => {
  const theme = useTheme()

  const getColorValue = (colorName) => {
    if (theme.palette[colorName]) {
      return theme.palette[colorName].main
    }
    return colorName
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
    >
      <Card
        sx={{
          height: '100%',
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${getColorValue(color)}20`,
          '&:hover': {
            borderColor: getColorValue(color),
            boxShadow: `0 8px 25px ${getColorValue(color)}25`,
          },
          transition: 'all 0.3s ease',
        }}
      >
        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
              {title}
            </Typography>
            <Box sx={{ 
              color: getColorValue(color),
              opacity: 0.9,
              display: 'flex',
              alignItems: 'center'
            }}>
              {icon}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
              {value}
            </Typography>
            {unit && (
              <Typography variant="h6" sx={{ opacity: 0.8 }}>
                {unit}
              </Typography>
            )}
          </Box>
          
          {trend && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {trend}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default StatsCard
