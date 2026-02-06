const ACCESS = 'swm_accessToken'
const REFRESH = 'swm_refreshToken'
const USER = 'swm_user'
const REFRESH_EXP = 'swm_refreshExpiresAt'

export const authStorage = {
  getAccessToken() {
    return localStorage.getItem(ACCESS) || ''
  },
  getRefreshToken() {
    return localStorage.getItem(REFRESH) || ''
  },
  getUser() {
    const raw = localStorage.getItem(USER)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },
  setSession({ accessToken, refreshToken, refreshExpiresAt, user }) {
    if (accessToken) localStorage.setItem(ACCESS, accessToken)
    if (refreshToken) localStorage.setItem(REFRESH, refreshToken)
    if (refreshExpiresAt) localStorage.setItem(REFRESH_EXP, String(refreshExpiresAt))
    if (user) localStorage.setItem(USER, JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
    localStorage.removeItem(USER)
    localStorage.removeItem(REFRESH_EXP)
  }
}
