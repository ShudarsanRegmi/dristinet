// Parse speedtest data from the results file
export const parseSpeedtestData = async () => {
  try {
    // For now, let's create a simple fetch to read the file
    // This will need to be served by a backend in production
    
    // Check if we can read from a local API endpoint
    const response = await fetch('/api/speedtest-data')
    if (response.ok) {
      return await response.json()
    }
    
    // Fallback: Return mock data with historical range
    // In production, you'd have a proper backend API
    console.warn('Using fallback mock data - need to implement proper backend')
    
    // Generate mock historical data from Oct 26 to Nov 1
    const mockData = []
    const startDate = new Date('2025-10-26T11:00:00')
    const endDate = new Date('2025-11-01T19:30:00')
    
    let currentDate = new Date(startDate)
    let testCount = 0
    
    while (currentDate <= endDate) {
      // Add some realistic variation
      const baseDownload = 9.0 + Math.random() * 2 // 9-11 Mbps range
      const baseUpload = 0.8 + Math.random() * 0.4 // 0.8-1.2 Mbps range
      
      mockData.push({
        timestamp: currentDate.toISOString().replace('T', ' ').substring(0, 19),
        downloadSpeed: Number(baseDownload.toFixed(2)),
        uploadSpeed: Number(baseUpload.toFixed(2)),
        latency: 25 + Math.random() * 15, // 25-40ms ping
        server: 'Ookla Server',
        hasError: false
      })
      
      // Increment by 30 minutes
      currentDate = new Date(currentDate.getTime() + 30 * 60 * 1000)
      testCount++
    }
    
    console.log(`Generated ${mockData.length} mock data points from ${startDate.toDateString()} to ${endDate.toDateString()}`)
    return mockData
    
  } catch (error) {
    console.error('Error loading speedtest data:', error)
    return []
  }
}

// Parse the actual speedtest file format
export const parseSpeedtestFile = (fileContent) => {
  const data = []
  const entries = fileContent.split('============================================')
  
  for (const entry of entries) {
    if (!entry.trim()) continue
    
    const lines = entry.split('\n')
    let timestamp = null
    let downloadSpeed = null
    let uploadSpeed = null
    let latency = null
    let server = 'Unknown'
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('Timestamp:')) {
        timestamp = trimmed.replace('Timestamp:', '').trim()
      } else if (trimmed.includes('Download:') && trimmed.includes('Mbps')) {
        const match = trimmed.match(/Download:\s*([0-9.]+)\s*Mbps/)
        if (match) downloadSpeed = parseFloat(match[1])
      } else if (trimmed.includes('Upload:') && trimmed.includes('Mbps')) {
        const match = trimmed.match(/Upload:\s*([0-9.]+)\s*Mbps/)
        if (match) uploadSpeed = parseFloat(match[1])
      } else if (trimmed.includes('Latency:') && trimmed.includes('ms')) {
        const match = trimmed.match(/Latency:\s*([0-9.]+)\s*ms/)
        if (match) latency = parseFloat(match[1])
      } else if (trimmed.includes('Server:')) {
        server = trimmed.replace('Server:', '').trim()
      }
    }
    
    if (timestamp && (downloadSpeed || uploadSpeed)) {
      data.push({
        timestamp,
        downloadSpeed: downloadSpeed || 0,
        uploadSpeed: uploadSpeed || 0,
        latency: latency || 0,
        server,
        hasError: false
      })
    }
  }
  
  // Sort by timestamp
  data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  
  return data
}
