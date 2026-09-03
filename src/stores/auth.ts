import { defineStore } from 'pinia'
import api, { getToken, setToken } from '@/services/api'
import type { AuthUser } from '@/types/offline'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    loading: false,
    error: '' as string,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user || !!getToken(),
  },
  actions: {
    async login(email: string, password: string) {
      this.loading = true
      this.error = ''
      try {
        const { data } = await api.post('/auth/login', {
          email,
          password,
          device_name: navigator.userAgent.slice(0, 200),
        })
        setToken(data.token)
        this.user = data.user
        return true
      } catch (error: any) {
        this.error = error.response?.data?.message ?? 'Login failed. Check your credentials.'
        return false
      } finally {
        this.loading = false
      }
    },
    async fetchUser() {
      if (!getToken()) return
      try {
        const { data } = await api.get('/auth/user')
        this.user = data
      } catch {
        // offline or invalid token — keep cached user if present
      }
    },
    async logout() {
      try {
        await api.post('/auth/logout')
      } catch {
        // token may already be invalid; proceed with local logout
      }
      setToken(null)
      this.user = null
    },
  },
})
