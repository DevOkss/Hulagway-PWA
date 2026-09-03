import axios from 'axios'

export const TOKEN_KEY = 'hulagway_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)

export const setToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// Backend API base URL — kept as a constant (not from env) so no Vercel
// environment variable is required. Appended with /api if missing.
export const API_BASE_URL = 'https://hulagway.devokss.online/api'

const rawBase = API_BASE_URL.replace(/\/+$/, '')
const baseURL = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`

const api = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
