// src/lib/auth.tsx
'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import Cookies from 'js-cookie'
import api from './api'
import { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, role?: 'PRODUCER' | 'STUDENT') => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Carrega usuário ao montar (se token existir)
  const loadUser = useCallback(async () => {
    const token = Cookies.get('accessToken')
    if (!token) { setIsLoading(false); return }
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
    } catch {
      Cookies.remove('accessToken')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    Cookies.set('accessToken', data.accessToken, { expires: 1 / 96 }) // 15min
    setUser(data.user)
  }

  const register = async (name: string, email: string, password: string, role?: 'PRODUCER' | 'STUDENT') => {
    const { data } = await api.post('/auth/register', { name, email, password, role })
    Cookies.set('accessToken', data.accessToken, { expires: 1 / 96 })
    setUser(data.user)
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    Cookies.remove('accessToken')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
