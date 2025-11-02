import React from 'react'
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Typography,
  Paper,
  Grid,
  Tooltip,
} from '@mui/material'
import {
  Wifi as WifiIcon,
  Router as InterfaceIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

const FilterPanel = ({
  networks = [],
  interfaces = [],
  filters = { network: 'all', interface: 'all' },
  onFilterChange,
  onResetFilters,
  hasActiveFilters = false,
  filterSummary = 'All data',
  testCount = 0,
  compact = false,
}) => {

  const handleNetworkChange = (event) => {
    onFilterChange('network', event.target.value)
  }

  const handleInterfaceChange = (event) => {
    onFilterChange('interface', event.target.value)
  }

  if (compact) {
    return (
      <Paper 
        sx={{ 
          p: 2, 
          mb: 2, 
          bgcolor: 'action.hover',
          borderRadius: 2,
          border: hasActiveFilters ? 2 : 1,
          borderColor: hasActiveFilters ? 'primary.main' : 'divider',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <FilterIcon color={hasActiveFilters ? 'primary' : 'action'} />
          </Grid>
          
          <Grid item xs>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Network</InputLabel>
                <Select
                  value={filters.network}
                  label="Network"
                  onChange={handleNetworkChange}
                  startAdornment={<WifiIcon sx={{ mr: 1, fontSize: 'small' }} />}
                >
                  <MenuItem value="all">All Networks</MenuItem>
                  {networks.map(network => (
                    <MenuItem key={network} value={network}>
                      {network || 'Unknown'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Interface</InputLabel>
                <Select
                  value={filters.interface}
                  label="Interface"
                  onChange={handleInterfaceChange}
                  startAdornment={<InterfaceIcon sx={{ mr: 1, fontSize: 'small' }} />}
                >
                  <MenuItem value="all">All Interfaces</MenuItem>
                  {interfaces.map(iface => (
                    <MenuItem key={iface} value={iface}>
                      {iface}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <AnimatePresence>
                {hasActiveFilters && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Tooltip title="Clear all filters">
                      <IconButton 
                        size="small" 
                        onClick={onResetFilters}
                        color="primary"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </Grid>

          <Grid item>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                {filterSummary}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {testCount} test{testCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    )
  }

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: hasActiveFilters ? 2 : 1,
        borderColor: hasActiveFilters ? 'primary.main' : 'divider',
      }}
    >
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
          <FilterIcon sx={{ mr: 1 }} />
          Data Filters
        </Typography>
        
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Tooltip title="Clear all filters">
                <IconButton 
                  onClick={onResetFilters}
                  color="primary"
                  size="small"
                >
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>WiFi Network (SSID)</InputLabel>
            <Select
              value={filters.network}
              label="WiFi Network (SSID)"
              onChange={handleNetworkChange}
              startAdornment={<WifiIcon sx={{ mr: 1 }} />}
            >
              <MenuItem value="all">
                <em>All Networks ({networks.length} available)</em>
              </MenuItem>
              {networks.map(network => (
                <MenuItem key={network} value={network}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <WifiIcon sx={{ mr: 1, fontSize: 'small' }} />
                    {network || 'Unknown Network'}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Network Interface</InputLabel>
            <Select
              value={filters.interface}
              label="Network Interface"
              onChange={handleInterfaceChange}
              startAdornment={<InterfaceIcon sx={{ mr: 1 }} />}
            >
              <MenuItem value="all">
                <em>All Interfaces ({interfaces.length} available)</em>
              </MenuItem>
              {interfaces.map(iface => (
                <MenuItem key={iface} value={iface}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <InterfaceIcon sx={{ mr: 1, fontSize: 'small' }} />
                    {iface}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: { xs: 'flex-start', md: 'flex-end' },
            gap: 1 
          }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {filterSummary}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {testCount} test{testCount !== 1 ? 's' : ''} match{testCount === 1 ? 'es' : ''} your criteria
            </Typography>
            
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                    {filters.network !== 'all' && (
                      <Chip
                        label={`WiFi: ${filters.network}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        icon={<WifiIcon />}
                        onDelete={() => onFilterChange('network', 'all')}
                      />
                    )}
                    {filters.interface !== 'all' && (
                      <Chip
                        label={`Interface: ${filters.interface}`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        icon={<InterfaceIcon />}
                        onDelete={() => onFilterChange('interface', 'all')}
                      />
                    )}
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Grid>
      </Grid>

      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Box sx={{ 
              mt: 2, 
              pt: 2, 
              borderTop: 1, 
              borderColor: 'divider',
              bgcolor: 'action.hover',
              borderRadius: 1,
              p: 2
            }}>
              <Typography variant="body2" color="text.secondary">
                💡 <strong>Filtering Tips:</strong> Use network filters to compare WiFi performance across different SSIDs, 
                or interface filters to compare WiFi vs Ethernet connections. Combine both for specific scenarios.
              </Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Paper>
  )
}

export default FilterPanel
