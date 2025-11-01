import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  useTheme,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'

const drawerWidth = 240

const menuItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
]

const Sidebar = () => {
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper,
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          color: 'white',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SpeedIcon sx={{ fontSize: 32, color: 'white' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
              Network Monitor
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
            Performance Analytics
          </Typography>
        </motion.div>
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mx: 1 }} />
      
      <List sx={{ mt: 1 }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path
          
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ListItem disablePadding sx={{ px: 1 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label} 
                    sx={{ 
                      '& .MuiListItemText-primary': { 
                        color: 'white',
                        fontWeight: isActive ? 600 : 400,
                      } 
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            </motion.div>
          )
        })}
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          v1.0.0 • Built with React
        </Typography>
      </Box>
    </Drawer>
  )
}

export default Sidebar
