"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { type User, getCurrentUser, onAuthStateChange, signIn, signOut, isSupabaseConfigured } from "./auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<any>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const configured = isSupabaseConfigured()

  useEffect(() => {
    if (!configured) {
      console.log("⚠️ Supabase not configured - skipping auth initialization")
      setLoading(false)
      return
    }

    // Get initial user
    getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [configured])

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true)
    const result = await signIn(email, password)
    if (result.data?.user) {
      const userData = {
        id: result.data.user.id,
        email: result.data.user.email || "",
        name: result.data.user.user_metadata?.name || result.data.user.email?.split("@")[0] || "User",
        role: result.data.user.user_metadata?.role || "user",
      }
      setUser(userData)
    }
    setLoading(false)
    return result
  }

  const handleSignOut = async () => {
    setLoading(true)
    const result = await signOut()
    setUser(null)
    setLoading(false)
    return result
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: handleSignIn,
        signOut: handleSignOut,
        isConfigured: configured,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Login Form Component
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, isConfigured } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message || "Login failed")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">D</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Product Registratie</CardTitle>
          <CardDescription className="text-gray-600">
            {isConfigured
              ? "Log in met uw account om door te gaan"
              : "Demo modus - gebruik admin@example.com / admin123"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="uw.email@bedrijf.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Wachtwoord
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inloggen...
                </>
              ) : (
                "Inloggen"
              )}
            </Button>
          </form>
          {!isConfigured && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Demo modus:</strong> Supabase is niet geconfigureerd. Gebruik <code>admin@example.com</code> en{" "}
                <code>admin123</code> om in te loggen.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
