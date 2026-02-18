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
    const response = await api.get('/api/auth/validate', {
      headers: { 'X-API-KEY': key },
    })
    return response.status >= 200 && response.status < 300
  } catch {
    return false
  }
}
