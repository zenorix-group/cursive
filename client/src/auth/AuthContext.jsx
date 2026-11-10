import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { enterAccount, leaveAccount } from '../data/cursiveStore.js'

const AuthContext = createContext(null)
const jsonHeaders = { 'Content-Type': 'application/json' }

async function post(path, body) {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: jsonHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'Something went wrong. Please try again.'), { field: data.field })
  }
  return data
}

export function AuthProvider({ children }) {
  // status: 'loading' while we ask who is signed in, 'ready', or 'error' if their saved reading could not be loaded
  const [state, setState] = useState({ status: 'loading', user: null, error: '' })

  const boot = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: '' }))
    try {
      // a 503 here just means accounts are off (no database); the app still works for guests
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' })
      const { user = null } = response.ok ? await response.json() : {}
      if (user) await enterAccount()
      setState({ status: 'ready', user, error: '' })
    } catch (error) {
      setState({ status: 'error', user: null, error: error.message })
    }
  }, [])

  useEffect(() => { boot() }, [boot])

  const authenticate = useCallback(async (path, body) => {
    const { user } = await post(path, body)
    try {
      await enterAccount()
    } catch (error) {
      setState({ status: 'error', user: null, error: error.message })
      throw error
    }
    setState({ status: 'ready', user, error: '' })
    return user
  }, [])

  const value = useMemo(() => ({
    ...state,
    login: (email, password) => authenticate('login', { email, password }),
    register: (name, email, password) => authenticate('register', { name, email, password }),
    logout: async () => {
      await leaveAccount()
      await post('logout').catch(() => {})
      setState({ status: 'ready', user: null, error: '' })
    },
    retry: boot,
  }), [state, authenticate, boot])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
