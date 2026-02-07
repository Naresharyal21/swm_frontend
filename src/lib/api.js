// src/lib/api.js
import axios from 'axios'
import { authStorage } from './authStorage'

const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
console.log('API baseURL =', baseURL)

export const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true, // safe even if you don't use cookies now
})

// -------------------------
// Request: attach token
// -------------------------
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

function isOnAuthPage() {
  const p = window.location.pathname
  return p === '/login' || p === '/register' || p === '/forgot-password'
}

function safeRedirectToLogin() {
  // avoid redirect loops
  if (isOnAuthPage()) return
  window.location.assign('/login')
}

function forceLogout(reason = 'logout') {
  if (forcedLogoutOnce) return
  forcedLogoutOnce = true

  console.warn('[auth] forceLogout:', reason)

  authStorage.clear()

  // notify AuthProvider
  window.dispatchEvent(new Event('auth:logout'))

  // force route to login
  safeRedirectToLogin()
}

async function tryRefresh() {
  const refreshToken = authStorage.getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')

  // IMPORTANT: use plain axios (NOT api) to avoid interceptor loops
  const res = await axios.post(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    { timeout: 30000, withCredentials: true }
  )

  const { accessToken, refreshToken: newRefreshToken, refreshExpiresAt } = res.data || {}
  if (!accessToken || !newRefreshToken) throw new Error('Invalid refresh response')

  authStorage.setSession({ accessToken, refreshToken: newRefreshToken, refreshExpiresAt })
  return accessToken
}

// Optional helper you can reuse in UI toast messages
export function getErrorMessage(e, fallback = 'Request failed') {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    fallback
  )
}

function isAxiosCanceled(error) {
  // Covers axios cancel tokens + AbortController cancellations
  return (
    axios.isCancel?.(error) ||
    error?.code === 'ERR_CANCELED' ||
    error?.message === 'canceled'
  )
}

// -------------------------
// Response: refresh on 401
// -------------------------
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // axios cancel -> do not do anything
    if (isAxiosCanceled(error)) return Promise.reject(error)

    const original = error?.config
    const status = error?.response?.status

    if (!original) return Promise.reject(error)

    const url = String(original?.url || '')

    // ✅ Auth endpoints where 401 is normal (wrong password, bad OTP, etc.)
    const isLoginOrReset =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/verify-otp') ||
      url.includes('/auth/reset-password')

    // ✅ role removed / permission denied => logout immediately (not for auth endpoints)
    if (status === 403 && !url.includes('/auth/')) {
      forceLogout('403_forbidden')
      return Promise.reject(error)
    }

    // ✅ If 401 happened on login/reset endpoints -> DO NOT refresh, DO NOT logout
    if (status === 401 && isLoginOrReset) {
      return Promise.reject(error)
    }

    // ✅ refresh only for 401 on protected endpoints (and only once)
    if (status !== 401 || original.__isRetryRequest) {
      return Promise.reject(error)
    }

    original.__isRetryRequest = true

    try {
      // If there is no refresh token, don't force logout here — just reject.
      const rt = authStorage.getRefreshToken()
      if (!rt) return Promise.reject(error)

      if (!refreshPromise) {
        refreshPromise = tryRefresh().finally(() => {
          refreshPromise = null
        })
      }

      const newAccess = await refreshPromise
      original.headers = original.headers || {}
      original.headers.Authorization = `Bearer ${newAccess}`

      return api.request(original)
    } catch (e) {
      // refresh failed: logout once
      forceLogout('refresh_failed')
      return Promise.reject(e)
    }
  }
)

export function unwrap(res) {
  return res?.data
}
