import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  )
}

export default App
