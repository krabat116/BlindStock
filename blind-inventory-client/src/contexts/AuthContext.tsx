import { createContext, useContext, useState, useCallback } from "react"

type AuthUser = {
  id: number
  username: string
  role: string
}

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadFromStorage(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem("blind_token")
    const userRaw = localStorage.getItem("blind_user")
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const stored = loadFromStorage()
  const [token, setToken] = useState<string | null>(stored.token)
  const [user, setUser] = useState<AuthUser | null>(stored.user)

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem("blind_token", newToken)
    localStorage.setItem("blind_user", JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("blind_token")
    localStorage.removeItem("blind_user")
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
