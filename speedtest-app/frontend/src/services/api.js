import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

export const speedtestAPI = {
  // Get all speedtest data
  getAllData: async () => {
    const response = await api.get('/speedtest-data')
    return response.data
  },

  // Get statistical overview
  getStats: async () => {
    const response = await api.get('/speedtest-stats')
    return response.data
  },

  // Get daily aggregated data
  getDailyStats: async () => {
    const response = await api.get('/speedtest-daily')
    return response.data
  },
}

export default api
