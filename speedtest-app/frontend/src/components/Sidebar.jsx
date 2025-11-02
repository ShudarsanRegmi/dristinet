import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  setGlobalNetworkFilter, 
  setGlobalInterfaceFilter, 
  resetGlobalFilters, 
  getGlobalFilters 
} from '../hooks/useSpeedtestData'
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
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Collapse,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingIcon,
  Compare as CompareIcon,
  Wifi as RealtimeIcon,
  ChevronLeft as ChevronLeftIcon,
  PlayArrow as RunTestIcon,
  FilterList as FilterIcon,
  Router as InterfaceIcon,
  Wifi as WifiIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'

const drawerWidth = 280

const menuItems = [
  { 
    path: '/', 
    label: 'Overview', 
    icon: <DashboardIcon />,
    description: 'Quick stats & recent tests'
  },
  { 
    path: '/live-test', 
    label: 'Live Speedtest', 
    icon: <RunTestIcon />,
    description: 'Run test & compare results'
  },
  { 
    path: '/realtime', 
    label: 'Real-time', 
    icon: <RealtimeIcon />,
    description: 'Live monitoring'
  },
  { 
    path: '/analytics', 
    label: 'Analytics', 
    icon: <AnalyticsIcon />,
    description: 'Detailed analysis'
  },
  { 
    path: '/daywise', 
    label: 'Day-wise Analysis', 
    icon: <TimelineIcon />,
    description: 'Daily statistics & patterns'
  },
  { 
    path: '/trends', 
    label: 'Trends', 
    icon: <TrendingIcon />,
    description: 'Historical patterns'
  },
  { 
    path: '/comparison', 
    label: 'Comparison', 
    icon: <CompareIcon />,
    description: 'Time periods & ISP'
  },
  { 
    path: '/settings', 
    label: 'Settings', 
    icon: <SettingsIcon />,
    description: 'Preferences & config'
  },
]

const Sidebar = ({ open = true, onToggle }) => {
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [networks, setNetworks] = useState([])
  const [interfaces, setInterfaces] = useState([])
  const [networkFilter, setNetworkFilter] = useState('all')
  const [interfaceFilter, setInterfaceFilter] = useState('all')

  // Initialize filters from localStorage and fetch filter options
  useEffect(() => {
    const currentFilters = getGlobalFilters()
    setNetworkFilter(currentFilters.network)
    setInterfaceFilter(currentFilters.interface)

    const fetchFilterOptions = async () => {
      try {
        const [networksRes, interfacesRes] = await Promise.all([
          fetch('/api/filters/networks'),
          fetch('/api/filters/interfaces')
        ])

        const networksData = await networksRes.json()
        const interfacesData = await interfacesRes.json()

        if (networksData.success) {
          setNetworks(networksData.networks)
        }

        if (interfacesData.success) {
          setInterfaces(interfacesData.interfaces)
        }
      } catch (err) {
        console.error('Failed to fetch filter options:', err)
      }
    }

    fetchFilterOptions()
  }, [])

  const hasActiveFilters = networkFilter !== 'all' || interfaceFilter !== 'all'

  const handleNetworkFilterChange = (value) => {
    setNetworkFilter(value)
    setGlobalNetworkFilter(value)
  }

  const handleInterfaceFilterChange = (value) => {
    setInterfaceFilter(value)
    setGlobalInterfaceFilter(value)
  }

  const handleResetFilters = () => {
    setNetworkFilter('all')
    setInterfaceFilter('all')
    resetGlobalFilters()
  }

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper,
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          color: 'white',
          position: 'fixed',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'hidden', // Prevent main drawer from scrolling
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon sx={{ fontSize: 32, color: 'white' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                  Network Monitor
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  Performance Analytics
                </Typography>
              </Box>
            </Box>
            {onToggle && (
              <IconButton 
                onClick={onToggle}
                size="small"
                sx={{ 
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
            )}
          </Box>
        </motion.div>
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mx: 1 }} />
      
      {/* Scrollable Navigation Menu */}
      <Box 
        sx={{ 
          flex: 1,
          overflowY: 'auto',
          // Custom scrollbar styles for navigation area
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            '&:hover': {
              background: 'rgba(255,255,255,0.3)',
            },
          },
          // Firefox scrollbar
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.2) rgba(255,255,255,0.05)',
        }}
      >
        <List sx={{ mt: 1, pb: 2 }}>
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path
            
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <ListItem disablePadding sx={{ px: 1.5 }}>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: 2,
                      mb: 0.75,
                      py: 1.25,
                      px: 1.5,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        transform: 'translateX(4px)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <ListItemIcon sx={{ color: 'white', minWidth: 45 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      secondary={item.description}
                      sx={{ 
                        '& .MuiListItemText-primary': { 
                          color: 'white',
                          fontWeight: isActive ? 600 : 400,
                          fontSize: '0.95rem',
                        },
                        '& .MuiListItemText-secondary': { 
                          color: theme.palette.text.secondary,
                          fontSize: '0.75rem',
                        } 
                      }} 
                    />
                  </ListItemButton>
                </ListItem>
              </motion.div>
            )
          })}
        </List>
      </Box>
      
      {/* Global Filters Section */}
      <Box sx={{ px: 1.5, py: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <ListItemButton
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          sx={{
            borderRadius: 2,
            mb: 1.5,
            py: 1.25,
            px: 1.5,
            backgroundColor: hasActiveFilters ? 'rgba(255,255,255,0.1)' : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.05)',
              transform: 'translateX(2px)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 45 }}>
            <FilterIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Filters"
            secondary={hasActiveFilters ? `${networkFilter !== 'all' ? 1 : 0 + interfaceFilter !== 'all' ? 1 : 0} active` : 'Global data filters'}
            sx={{ 
              '& .MuiListItemText-primary': { 
                color: 'white',
                fontWeight: hasActiveFilters ? 600 : 400,
                fontSize: '0.95rem',
              },
              '& .MuiListItemText-secondary': { 
                color: theme.palette.text.secondary,
                fontSize: '0.75rem',
              } 
            }} 
          />
          {filtersExpanded ? <ExpandLessIcon sx={{ color: 'white' }} /> : <ExpandMoreIcon sx={{ color: 'white' }} />}
        </ListItemButton>

        <Collapse in={filtersExpanded}>
          <Box sx={{ pl: 1.5, pr: 1.5, pb: 1 }}>
            {/* Network Filter */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1.5, display: 'block', fontWeight: 500 }}>
                WiFi Network
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={networkFilter}
                  onChange={(e) => handleNetworkFilterChange(e.target.value)}
                  displayEmpty
                  sx={{
                    color: 'white',
                    height: 42,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.25)',
                      borderRadius: 2,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.4)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                      borderWidth: 2,
                    },
                    '& .MuiSelect-icon': {
                      color: 'rgba(255,255,255,0.7)',
                    },
                    '& .MuiInputBase-input': {
                      padding: '10px 14px',
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: theme.palette.background.paper,
                        maxHeight: 200,
                      },
                    },
                  }}
                >
                  <MenuItem value="all">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WifiIcon sx={{ mr: 1, fontSize: 'small' }} />
                      All Networks
                    </Box>
                  </MenuItem>
                  {networks.map(network => (
                    <MenuItem key={network} value={network}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WifiIcon sx={{ mr: 1, fontSize: 'small' }} />
                        {network}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Interface Filter */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1.5, display: 'block', fontWeight: 500 }}>
                Interface Type
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={interfaceFilter}
                  onChange={(e) => handleInterfaceFilterChange(e.target.value)}
                  displayEmpty
                  sx={{
                    color: 'white',
                    height: 42,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.25)',
                      borderRadius: 2,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.4)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                      borderWidth: 2,
                    },
                    '& .MuiSelect-icon': {
                      color: 'rgba(255,255,255,0.7)',
                    },
                    '& .MuiInputBase-input': {
                      padding: '10px 14px',
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: theme.palette.background.paper,
                        maxHeight: 200,
                      },
                    },
                  }}
                >
                  <MenuItem value="all">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <InterfaceIcon sx={{ mr: 1, fontSize: 'small' }} />
                      All Interfaces
                    </Box>
                  </MenuItem>
                  {interfaces.map(iface => (
                    <MenuItem key={iface} value={iface}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <InterfaceIcon sx={{ mr: 1, fontSize: 'small' }} />
                        {iface}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Active Filters & Reset */}
            {hasActiveFilters && (
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                  {networkFilter !== 'all' && (
                    <Chip
                      label={networkFilter}
                      size="small"
                      onDelete={() => handleNetworkFilterChange('all')}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        fontSize: '0.7rem',
                        height: 20,
                      }}
                    />
                  )}
                  {interfaceFilter !== 'all' && (
                    <Chip
                      label={interfaceFilter}
                      size="small"
                      onDelete={() => handleInterfaceFilterChange('all')}
                      sx={{
                        bgcolor: 'secondary.main',
                        color: 'secondary.contrastText',
                        fontSize: '0.7rem',
                        height: 20,
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <IconButton
                    size="small"
                    onClick={handleResetFilters}
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      '&:hover': {
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>
      
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          v1.0.0 • Built with React
        </Typography>
      </Box>
    </Drawer>
  )
}

export default Sidebar
