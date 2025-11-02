import React, { createContext, useContext, useReducer, useEffect } from 'react'

// Filter context
const FilterContext = createContext()

// Filter reducer
const filterReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NETWORKS':
      return { ...state, availableNetworks: action.payload }
    case 'SET_INTERFACES':
      return { ...state, availableInterfaces: action.payload }
    case 'SET_NETWORK_FILTER':
      return { ...state, networkFilter: action.payload }
    case 'SET_INTERFACE_FILTER':
      return { ...state, interfaceFilter: action.payload }
    case 'RESET_FILTERS':
      return { ...state, networkFilter: 'all', interfaceFilter: 'all' }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    default:
      return state
  }
}

// Initial state
const initialState = {
  availableNetworks: [],
  availableInterfaces: [],
  networkFilter: 'all',
  interfaceFilter: 'all',
  loading: false,
  error: null,
}

// Provider component
export const FilterProvider = ({ children }) => {
  const [state, dispatch] = useReducer(filterReducer, initialState)

  // Fetch available filter options
  const fetchFilterOptions = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const [networksRes, interfacesRes] = await Promise.all([
        fetch('/api/filters/networks'),
        fetch('/api/filters/interfaces')
      ])

      const networksData = await networksRes.json()
      const interfacesData = await interfacesRes.json()

      if (networksData.success) {
        dispatch({ type: 'SET_NETWORKS', payload: networksData.networks })
      }

      if (interfacesData.success) {
        dispatch({ type: 'SET_INTERFACES', payload: interfacesData.interfaces })
      }

      dispatch({ type: 'SET_ERROR', payload: null })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // Initialize filter options
  useEffect(() => {
    fetchFilterOptions()
  }, [])

  // Actions
  const setNetworkFilter = (network) => {
    dispatch({ type: 'SET_NETWORK_FILTER', payload: network })
  }

  const setInterfaceFilter = (interfaceValue) => {
    dispatch({ type: 'SET_INTERFACE_FILTER', payload: interfaceValue })
  }

  const resetFilters = () => {
    dispatch({ type: 'RESET_FILTERS' })
  }

  const getFilterSummary = () => {
    const activeFilters = []
    
    if (state.networkFilter !== 'all') {
      activeFilters.push(`WiFi: ${state.networkFilter}`)
    }
    
    if (state.interfaceFilter !== 'all') {
      activeFilters.push(`Interface: ${state.interfaceFilter}`)
    }

    return activeFilters.length > 0 ? activeFilters.join(', ') : 'All data'
  }

  const hasActiveFilters = () => {
    return state.networkFilter !== 'all' || state.interfaceFilter !== 'all'
  }

  const getFilterParams = () => {
    const params = new URLSearchParams()
    if (state.networkFilter !== 'all') {
      params.append('network', state.networkFilter)
    }
    if (state.interfaceFilter !== 'all') {
      params.append('interface', state.interfaceFilter)
    }
    return params.toString()
  }

  const value = {
    ...state,
    setNetworkFilter,
    setInterfaceFilter,
    resetFilters,
    getFilterSummary,
    hasActiveFilters,
    getFilterParams,
    refreshFilterOptions: fetchFilterOptions,
  }

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  )
}

// Hook to use filter context
export const useGlobalFilters = () => {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useGlobalFilters must be used within a FilterProvider')
  }
  return context
}
