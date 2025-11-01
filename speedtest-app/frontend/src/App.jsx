import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Realtime from './pages/Realtime'
import Analytics from './pages/Analytics'
import Trends from './pages/Trends'
import Comparison from './pages/Comparison'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/realtime" element={<Realtime />} />
            <Route path="/analytics" element={<Analytics />} />
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
