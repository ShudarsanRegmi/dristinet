import React from 'react'
import {
  Container,
  Typography,
  Paper,
  Box,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Grid,
} from '@mui/material'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

const Settings = () => {
  const { isDark, toggleTheme } = useTheme()
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Settings
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 4 }}>
          Customize your speedtest dashboard experience
        </Typography>
      </motion.div>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Display Preferences
              </Typography>
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Show real-time updates"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Enable animations"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={isDark}
                    onChange={toggleTheme}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography component="span">Dark mode</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Tip: Press Ctrl+Shift+T to toggle theme quickly
                    </Typography>
                  </Box>
                }
                sx={{ mb: 2, display: 'block' }}
              />
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Data Management
              </Typography>
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Auto-refresh data every 30 seconds"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Show failed tests in charts"
                sx={{ mb: 3, display: 'block' }}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained">
                  Save Settings
                </Button>
                <Button variant="outlined">
                  Reset to Defaults
                </Button>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Theme Preview
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 1, 
                  bgcolor: 'primary.main',
                  border: '2px solid',
                  borderColor: 'divider'
                }} />
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 1, 
                  bgcolor: 'background.default',
                  border: '2px solid',
                  borderColor: 'divider'
                }} />
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 1, 
                  bgcolor: 'background.paper',
                  border: '2px solid',
                  borderColor: 'divider'
                }} />
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 1, 
                  bgcolor: 'text.primary',
                  border: '2px solid',
                  borderColor: 'divider'
                }} />
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Current theme: <strong>{isDark ? 'Dark' : 'Light'}</strong>
              </Typography>
            </Paper>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                About
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 2 }}>
                Speedtest Dashboard v1.0.0
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                A modern React-based dashboard for monitoring network performance.
                Built with Material-UI, Recharts, and Framer Motion for a smooth,
                interactive experience.
              </Typography>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  )
}

export default Settings
