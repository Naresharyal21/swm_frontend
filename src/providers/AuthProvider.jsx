import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { sdk } from '../lib/sdk'
import { authStorage } from '../lib/authStorage'
import { pickErrorMessage } from '../lib/utils'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authStorage.getUser())
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        const token = authStorage.getAccessToken()
        if (!token) {
          setBooting(false)
          return
        }
        const data = await sdk.auth.me()
        if (!mounted) return
        const u = data?.user
        if (u) {
          authStorage.setSession({ user: u })
          setUser(u)
        }
      } catch {
        // axios interceptor will try refresh; if still fails it emits auth:logout
      } finally {
        if (mounted) setBooting(false)
      }
    }

    boot()

    function onForcedLogout() {
      authStorage.clear()
      setUser(null)
    }

    window.addEventListener('auth:logout', onForcedLogout)
    return () => {
      mounted = false
      window.removeEventListener('auth:logout', onForcedLogout)
    }
  }, [])

  const api = useMemo(
    () => ({
      user,
      booting,
      isAuthed: !!user,

      async login(email, password) {
        try {
          const data = await sdk.auth.login({ email, password })
          authStorage.setSession(data)
          setUser(data?.user || null)
          toast.success('Welcome back')
          return { ok: true }
        } catch (e) {
          const msg = pickErrorMessage(e)
          
          return { ok: false, message: msg }
        }
      },

      // ✅ IMPORTANT: do NOT auto-login on register
      async register(payload) {
        try {
          await sdk.auth.register(payload)

          // If backend returns tokens/user, we intentionally ignore them
          // and also ensure no session is stored.
          authStorage.clear()
          setUser(null)

          return { ok: true }
        } catch (e) {
          const msg = pickErrorMessage(e)
          toast.error(msg)
          return { ok: false, message: msg }
        }
      },

      async logout({ silent = false } = {}) {
        try {
          const refreshToken = authStorage.getRefreshToken()
          if (refreshToken) {
            await sdk.auth.logout({ refreshToken })
          }
        } catch {
          // ignore
        } finally {
          authStorage.clear()
          setUser(null)
          if (!silent) toast.success('Logged out')
        }
      },
    }),
    [user, booting]
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
