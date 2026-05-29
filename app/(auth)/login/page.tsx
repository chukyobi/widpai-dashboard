"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loginAction } from "../actions"

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const formData = new FormData(e.currentTarget)
    
    // Server actions that use redirect() must be wrapped in a transition 
    // when called from an event handler, otherwise the redirect fails.
    import('react').then(({ startTransition }) => {
      startTransition(async () => {
        try {
          const result = await loginAction(formData)
          if (result?.error) { 
            setError(result.error)
            setPending(false) 
          }
        } catch (e) {
          // Ignore redirect errors, throw everything else
          if (e && typeof e === 'object' && 'message' in e && (e as any).message === 'NEXT_REDIRECT') {
            throw e;
          }
          console.error(e)
          setError("An unexpected error occurred.")
          setPending(false)
        }
      })
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Enter your credentials to access the dashboard</p>
      </div>

      <form onSubmit={handleSubmit} method="POST" className="space-y-4">
        <div className="space-y-2 group">
          <label className="text-sm font-medium text-foreground/80 group-focus-within:text-primary transition-colors" htmlFor="email">
            Email address
          </label>
          <Input id="email" name="email" type="email" placeholder="admin@widpai.com"
            className="bg-background/50 border-border/50 hover:border-primary/40 focus:border-primary transition-all" required />
        </div>

        <div className="space-y-2 group">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground/80 group-focus-within:text-primary transition-colors" htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" placeholder="••••••••"
            className="bg-background/50 border-border/50 hover:border-primary/40 focus:border-primary transition-all" required />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 mt-2"
          type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don&apos;t have an account? </span>
        <Link href="/signup" className="font-semibold text-primary hover:underline">Create one</Link>
      </div>
    </div>
  )
}
