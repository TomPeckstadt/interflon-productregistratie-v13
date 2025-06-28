"use client"

import { useState, useEffect, createContext, useContext } from "react"
import type React from "react"
import { signIn, signOut, getCurrentUser, onAuthStateChange, type User } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff } from "lucide-react"

// Auth Context
interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("🔐 AuthProvider: Initializing...")

    // Get current user on mount
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        console.log("🔐 AuthProvider: Current user:", currentUser)
        setUser(currentUser)
      } catch (error) {
        console.error("🔐 AuthProvider: Error getting current user:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Set up auth state listener
    const { data } = onAuthStateChange((user) => {
      console.log("🔐 AuthProvider: Auth state changed:", user)
      setUser(user)
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => {
      if (data?.subscription) {
        data.subscription.unsubscribe()
      }
    }
  }, [])

  const handleSignOut = async () => {
    console.log("🔐 AuthProvider: Signing out...")
    try {
      await signOut()
      setUser(null)
    } catch (error) {
      console.error("🔐 AuthProvider: Error signing out:", error)
    }
  }

  const value = {
    user,
    loading,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Auth Guard Component - shows login form if not authenticated
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <>{children}</>
}

// Login Form Component
export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    console.log("🔐 LoginForm: Attempting login with:", email)

    try {
      const { data, error } = await signIn(email, password)

      if (error) {
        console.error("🔐 LoginForm: Login error:", error)
        setError(error.message || "Ongeldige inloggegevens")
        return
      }

      if (data?.user) {
        console.log("🔐 LoginForm: Login successful:", data.user.email)
        // The AuthProvider will handle the state update via onAuthStateChange
        window.location.reload() // Force a refresh to ensure clean state
      } else {
        setError("Login mislukt - geen gebruikersgegevens ontvangen")
      }
    } catch (error) {
      console.error("🔐 LoginForm: Login exception:", error)
      setError("Er is een onverwachte fout opgetreden")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="mx-auto mb-4">
              <div
                className="flex items-center bg-white p-4 rounded-lg shadow-sm border mx-auto"
                style={{ width: "200px", height: "80px", position: "relative" }}
              >
                <div className="w-1 h-12 bg-amber-500 absolute left-4"></div>
                <div
                  className="text-2xl font-bold text-gray-800 tracking-wide absolute"
                  style={{ bottom: "16px", left: "32px" }}
                >
                  DEMATIC
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Inloggen</CardTitle>
            <CardDescription className="text-gray-600">
              Log in om toegang te krijgen tot de Product Registratie app
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="naam@interflon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Wachtwoord</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-base font-medium"
                disabled={loading}
              >
                {loading ? "Bezig met inloggen..." : "Inloggen"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
