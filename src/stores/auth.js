import { defineStore } from 'pinia'
import { apiRequest as request } from '../api'

const STORAGE_KEY = 'webshop_auth'

function loadAuth() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const { token, user } = JSON.parse(raw)
      if (token && user) return { token, user }
    } catch {
      // if stored data is corrupted, keep the user signed out
    }
  }
  return { token: null, user: null }
}

function persist(token, user) {
  if (token && user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    ...loadAuth(),
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token && state.user),
    isAdmin: (state) => state.user?.role === 'admin',
  },
  actions: {
    setSessionFromResponse(response) {
      if (!response?.token || !response?.user) {
        throw new Error('Váratlan válasz a szervertől. Indítsd újra az API-t (npm run server).')
      }
      this.setSession(response.token, response.user)
      return response.user
    },
    setSession(token, user) {
      this.token = token
      this.user = user
      persist(token, user)
    },
    async login(username, password) {
      const response = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      return this.setSessionFromResponse(response)
    },
    async register({ name, username, email, password }) {
      const response = await request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password }),
      })
      return this.setSessionFromResponse(response)
    },
    async updateProfile({ name, username, email }) {
      const user = await request('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email }),
      })
      this.setSession(this.token, user)
      return user
    },
    async changePassword(currentPassword, newPassword) {
      await request('/api/auth/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
    },
    // On startup, verify whether the stored token is still valid.
    async restore() {
      if (!this.token) return
      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${this.token}` },
        })
        if (response.ok) {
          this.setSession(this.token, await response.json())
        } else if (response.status === 401) {
          this.setSession(null, null)
        }
      } catch {
        // the server is unavailable — keep the stored state as-is
      }
    },
    logout() {
      const token = this.token
      this.setSession(null, null)
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
    },
  },
})
