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

// Normalize the base URL so it always ends with /api, whether the env var is
// set with or without the prefix (e.g. https://hulagway.devokss.online or
// https://hulagway.devokss.online/api). Prevents hitting a bare /auth/login 404.
const rawBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '')
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
