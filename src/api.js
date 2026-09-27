import { useAuthStore } from './stores/auth'

// Shared API call: sends the session token when the user is logged in.
export async function apiRequest(url, options = {}) {
  const auth = useAuthStore()
  const headers = { ...options.headers }
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`

  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    // Expired or invalid token: the client also logs out.
    if (response.status === 401 && auth.token) auth.setSession(null, null)
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'A szerver nem elérhető.')
  }
  return response.status === 204 ? null : response.json()
}
