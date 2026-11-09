// Auth context: holds the signed-in user, token and role helpers.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getStoredUser, getToken, setStoredUser, setToken } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null))
  const [ready, setReady] = useState(false)

  // Revalidate the session on first load.
  useEffect(() => {
    let alive = true
    async function load() {
      if (!getToken()) {
        setReady(true)
        return
      }
      try {
        const { user: fresh } = await api.get('/api/auth/me')
        if (!alive) return
        setUser(fresh)
        setStoredUser(fresh)
      } catch {
        if (!alive) return
        setToken(null)
        setStoredUser(null)
        setUser(null)
      } finally {
        if (alive) setReady(true)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async ({ identifier, password }) => {
    const data = await api.post('/api/auth/login', { identifier, password })
    setToken(data.token)
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const loginWithToken = useCallback((token, nextUser) => {
    setToken(token)
    setStoredUser(nextUser)
    setUser(nextUser)
  }, [])

  const register = useCallback(async (payload) => {
    const data = await api.post('/api/auth/register', payload)
    setToken(data.token)
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setStoredUser(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      loginWithToken,
      register,
      logout,
      isCitizen: user?.role === 'CITIZEN',
      isOfficer: user?.role === 'OFFICER',
      isAdmin: user?.role === 'ADMIN',
    }),
    [user, ready, login, loginWithToken, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
