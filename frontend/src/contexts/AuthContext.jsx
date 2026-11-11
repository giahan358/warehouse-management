import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { USE_MOCK } from '../api/axiosClient'
import authApi from '../api/authApi'

const AuthContext = createContext(null)
const STORAGE_KEY = 'logistorage_user'

// Mock auth is persisted locally; backend auth is restored from the JWT.
function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => USE_MOCK ? readStoredUser() : null)
  const [isLoading, setIsLoading] = useState(!USE_MOCK)

  useEffect(() => {
    if (USE_MOCK) return
    let active = true
    authApi.me()
      .then((currentUser) => { if (active) setUser(currentUser) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login: (u) => {
        setUser(u)
        if (USE_MOCK) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)) } catch { /* bỏ qua */ }
        }
      },
      logout: () => {
        authApi.logout().catch(() => {})
        setUser(null)
        if (USE_MOCK) {
          try { localStorage.removeItem(STORAGE_KEY) } catch { /* bỏ qua */ }
        }
      },
    }),
    [user, isLoading],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
