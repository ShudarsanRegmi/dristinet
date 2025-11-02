import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Box, AppBar, Toolbar, IconButton, Typography, useTheme } from '@mui/material'
import { Menu as MenuIcon } from '@mui/icons-material'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import LiveSpeedtest from './pages/LiveSpeedtest'
import Realtime from './pages/Realtime'
import Analytics from './pages/Analytics'
import DayWise from './pages/DayWise'
import Trends from './pages/Trends'
import Comparison from './pages/Comparison'
import Settings from './pages/Settings'

const drawerWidth = 240

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const theme = useTheme()

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
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 'none',
            borderBottom: `1px solid ${theme.palette.divider}`,
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
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
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
