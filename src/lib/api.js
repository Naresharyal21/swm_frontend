import axios from 'axios'
import { authStorage } from './authStorage'

const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
console.log('API baseURL =', baseURL)

export const api = axios.create({
  baseURL,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null
let forcedLogoutOnce = false

function forceLogout(reason = 'logout') {
  if (forcedLogoutOnce) return
  forcedLogoutOnce = true

  console.warn('[auth] forceLogout:', reason)

  authStorage.clear()

  // notify AuthProvider
  window.dispatchEvent(new Event('auth:logout'))

  // force route to login
  window.location.assign('/login')
}

async function tryRefresh() {
  const refreshToken = authStorage.getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')

  const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken }, { timeout: 30000 })

  const { accessToken, refreshToken: newRefreshToken, refreshExpiresAt } = res.data || {}
  authStorage.setSession({ accessToken, refreshToken: newRefreshToken, refreshExpiresAt })
  return accessToken
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config
    const status = error?.response?.status

    if (!original) return Promise.reject(error)

    const url = String(original?.url || '')
    const isAuthEndpoint = url.includes('/auth/')

    // ✅ role removed / permission denied => logout immediately
    if (status === 403 && !isAuthEndpoint) {
      forceLogout('403_forbidden')
      return Promise.reject(error)
    }

    // ✅ refresh only for 401
    if (status !== 401 || original.__isRetryRequest) {
      return Promise.reject(error)
    }

    original.__isRetryRequest = true

    try {
      if (!refreshPromise) {
        refreshPromise = tryRefresh().finally(() => {
          refreshPromise = null
        })
      }

      const newAccess = await refreshPromise
      original.headers = original.headers || {}
      original.headers.Authorization = `Bearer ${newAccess}`
      return api.request(original)
    } catch {
      forceLogout('refresh_failed')
      return Promise.reject(error)
    }
  }
)

export function unwrap(res) {
  return res?.data
}
