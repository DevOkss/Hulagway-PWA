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

// API base URL — relative by default so Vercel proxies /api/* to the backend
// (same-origin, no CORS). Local dev overrides via .env.development.local:
//   VITE_API_URL=http://localhost:8001/api
// Never hardcode an absolute URL here — HTTPS pages block http:// mixed
// content, and a phone's "localhost" is the phone itself.
const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
export const API_BASE_URL = envUrl || '/api'

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
      // Base-aware: the app may live under a subpath (GitHub Pages).
      const base = import.meta.env.BASE_URL || '/'
      const loginPath = `${base.endsWith('/') ? base : `${base}/`}login`
      if (!window.location.pathname.startsWith(loginPath)) {
        window.location.href = loginPath
      }
    }
    return Promise.reject(error)
  },
)

export default api
