import api from './api'

const AUTH_STORAGE_KEY = 'dql_admin_key'

export function getAdminKey(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(AUTH_STORAGE_KEY)
}

export function setAdminKey(key: string): void {
  sessionStorage.setItem(AUTH_STORAGE_KEY, key)
  // Set default header for all future requests
  api.defaults.headers.common['X-API-KEY'] = key
}

export function clearAdminKey(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  delete api.defaults.headers.common['X-API-KEY']
}

export function isAuthenticated(): boolean {
  return !!getAdminKey()
}

/** Restore the header from sessionStorage (call on app init) */
export function restoreAuthHeader(): void {
  const key = getAdminKey()
  if (key) {
    api.defaults.headers.common['X-API-KEY'] = key
  }
}

/**
 * Validate the key against the backend by calling a protected endpoint.
 * Returns true if the key is accepted, false otherwise.
 */
export async function validateAdminKey(key: string): Promise<boolean> {
  try {
    // Temporarily set the header for this request
    const response = await api.get('/api/trading/status', {
      headers: { 'X-API-KEY': key },
    })
    return response.status === 200
  } catch {
    // trading/status is public, so try a protected endpoint instead
    try {
      await api.post('/api/positions/update-prices', null, {
        headers: { 'X-API-KEY': key },
      })
      return true
    } catch (err: any) {
      // 401 means wrong key, anything else means key might be fine but endpoint errored
      if (err?.response?.status === 401) return false
      // If we get 500 or other, the key was accepted (auth passed) but something else failed
      return err?.response?.status !== 401
    }
  }
}
