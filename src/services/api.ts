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

// Backend API base URL — env-driven with a production fallback so Vercel
// builds (no env var configured) always target the live backend.
// Local dev: copy `.env.example` to `.env.development.local` and set
//   VITE_API_URL=http://localhost:8001/api
// Never commit a localhost URL here — that breaks the deployed PWA on phones
// (a phone's "localhost" is the phone itself, plus HTTPS pages block http APIs
// as mixed content, so login/sync/submit all fail with Network Error).
const PROD_API_URL = 'https://hulagway.devokss.online/api'
const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
export const API_BASE_URL = envUrl ? envUrl : PROD_API_URL

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
