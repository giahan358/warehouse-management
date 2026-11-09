import { createContext, useContext, useMemo, useState } from 'react'
import authApi from '../api/authApi'

const AuthContext = createContext(null)
const STORAGE_KEY = 'logistorage_user'

// Giữ phiên đăng nhập khi F5 (mock). Khi có BE dùng cookie session/JWT + authApi.me().
function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login: (u) => {
        setUser(u)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)) } catch { /* bỏ qua */ }
      },
      logout: () => {
        authApi.logout().catch(() => {})
        setUser(null)
        try { localStorage.removeItem(STORAGE_KEY) } catch { /* bỏ qua */ }
      },
    }),
    [user],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
