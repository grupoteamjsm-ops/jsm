import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

interface User {
  id: string
  nombre: string
  email: string
  rol: 'admin' | 'operador' | 'viewer'
}

export const useAuthStore = defineStore('auth', () => {
  const user         = ref<User | null>(null)
  const accessToken  = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))
  const loading      = ref(false)
  const error        = ref<string | null>(null)

  const isAuthenticated = computed(() => !!accessToken.value)
  const isAdmin         = computed(() => user.value?.rol === 'admin')
  const isOperador      = computed(() => ['admin', 'operador'].includes(user.value?.rol ?? ''))

  const setTokens = (access: string, refresh: string) => {
    accessToken.value  = access
    refreshToken.value = refresh
    localStorage.setItem('access_token',  access)
    localStorage.setItem('refresh_token', refresh)
  }

  const clearTokens = () => {
    accessToken.value  = null
    refreshToken.value = null
    user.value         = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  const login = async (email: string, password: string) => {
    loading.value = true
    error.value   = null
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      setTokens(data.access_token, data.refresh_token)
      user.value = data.usuario
      return true
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Error al iniciar sesión'
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', { refresh_token: refreshToken.value })
    } finally {
      clearTokens()
    }
  }

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/api/auth/me')
      user.value = data.usuario
    } catch {
      clearTokens()
    }
  }

  return { user, accessToken, loading, error, isAuthenticated, isAdmin, isOperador, login, logout, fetchMe }
})
