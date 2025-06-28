"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface LoginFormProps {
  onLogin: () => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const { data, error: authError } = await signIn(email, password)

    if (authError) {
      setError("Ongeldige inloggegevens")
    } else if (data.user) {
      // Gebruik window.location.href voor een harde redirect
      window.location.href = "/"
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center">
              <div className="relative w-10 h-10 mr-2">
                <div className="w-10 h-10 border-4 border-red-500 rounded-full relative">
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
              </div>
              <div className="text-lg font-bold text-red-500 tracking-wide">INTERFLON</div>
            </div>
          </div>
          <CardTitle>Inloggen</CardTitle>
          <CardDescription>
            Voer je inloggegevens in om toegang te krijgen tot de Product Registratie app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="naam@interflon.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>
              {isLoading ? "Bezig met inloggen..." : "Inloggen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
