"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getSupabaseBrowserClient } from "./supabase-client"
import type { Permiso } from "./db-types"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  auth_user_id: string
  permissions?: Permiso
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        await loadUserData(session.user.id)
      }
    } catch (error) {
      console.error("[v0] Error checking session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserData = async (authUserId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("auth_user_id", authUserId)
        .single()

      if (profileError) throw profileError

      const { data: permissions, error: permissionsError } = await supabase
        .from("permisos")
        .select("*")
        .eq("auth_user_id", authUserId)
        .single()

      if (permissionsError) throw permissionsError

      setUser({
        id: profile.id,
        email: profile.email,
        full_name: profile.nombre,
        role: profile.rol,
        auth_user_id: authUserId,
        permissions: permissions,
      })
    } catch (error) {
      console.error("[v0] Error loading user data:", error)
      throw error
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Only log critical errors, not invalid credentials from auto-refresh attempts
        if (error.message !== "Invalid login credentials") {
          console.error("[v0] Login error:", error)
        }
        throw error
      }
      if (!data.user) throw new Error("No user returned")

      await loadUserData(data.user.id)
    } catch (error: any) {
      // Suppress invalid credentials errors from appearing in console (likely from auto-refresh)
      if (error.message !== "Invalid login credentials") {
        console.error("[v0] Login error:", error)
      }
      throw new Error(error.message || "Error al iniciar sesión")
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
