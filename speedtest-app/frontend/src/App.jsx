import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Box, AppBar, Toolbar, IconButton, Typography, useTheme as useMuiTheme, Tooltip } from '@mui/material'
import { Menu as MenuIcon, LightMode, DarkMode } from '@mui/icons-material'
import { useTheme } from './context/ThemeContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import LiveSpeedtest from './pages/LiveSpeedtest'
import Realtime from './pages/Realtime'
import Analytics from './pages/Analytics'
import DayWise from './pages/DayWise'
import Trends from './pages/Trends'
import Comparison from './pages/Comparison'
import Settings from './pages/Settings'

const drawerWidth = 280

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const muiTheme = useMuiTheme()
  const { themeMode, toggleTheme, isDark } = useTheme()

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <Router>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* App Bar */}
        <AppBar 
          position="fixed" 
          sx={{ 
            width: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
            ml: sidebarOpen ? `${drawerWidth}px` : 0,
            transition: muiTheme.transitions.create(['width', 'margin'], {
              easing: muiTheme.transitions.easing.sharp,
              duration: muiTheme.transitions.duration.enteringScreen,
            }),
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 'none',
            borderBottom: `1px solid ${muiTheme.palette.divider}`,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              onClick={toggleSidebar}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Network Performance Dashboard
            </Typography>
            
            {/* Theme Toggle Button */}
            <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton
                color="inherit"
                onClick={toggleTheme}
                sx={{
                  ml: 2,
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'rotate(180deg)',
                  },
                }}
              >
                {isDark ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onToggle={toggleSidebar} />

        {/* Main Content */}
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1,
            width: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
            transition: muiTheme.transitions.create(['width', 'margin'], {
              easing: muiTheme.transitions.easing.sharp,
              duration: muiTheme.transitions.duration.enteringScreen,
            }),
            ml: sidebarOpen ? 0 : `-${drawerWidth}px`,
          }}
        >
          {/* Toolbar spacer */}
          <Toolbar />
          
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live-test" element={<LiveSpeedtest />} />
            <Route path="/realtime" element={<Realtime />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/daywise" element={<DayWise />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/comparison" element={<Comparison />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  )
}

export default App
