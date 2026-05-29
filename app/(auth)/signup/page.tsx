"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signupAction } from "../actions"

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const formData = new FormData(e.currentTarget)
    
    import('react').then(({ startTransition }) => {
      startTransition(async () => {
        try {
          const result = await signupAction(formData)
          if (result?.error) { 
            setError(result.error)
            setPending(false) 
          }
        } catch (e) {
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
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Create an account</h2>
        <p className="text-sm text-muted-foreground">
          Register to manage the trading hub
        </p>
      </div>

      <form onSubmit={handleSubmit} method="POST" className="space-y-4">
        <div className="space-y-2 group">
          <label className="text-sm font-medium leading-none text-foreground/80 group-focus-within:text-primary transition-colors" htmlFor="name">
            Full Name
          </label>
          <Input
            id="name"
            name="name"
            placeholder="John Doe"
            className="bg-background/50 border-border/50 hover:border-primary/40 focus:border-primary transition-all"
            required
          />
        </div>

        <div className="space-y-2 group">
          <label className="text-sm font-medium leading-none text-foreground/80 group-focus-within:text-primary transition-colors" htmlFor="email">
            Email address
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@widpai.com"
            className="bg-background/50 border-border/50 hover:border-primary/40 focus:border-primary transition-all"
            required
          />
        </div>

        <div className="space-y-2 group">
          <label className="text-sm font-medium leading-none text-foreground/80 group-focus-within:text-primary transition-colors" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            className="bg-background/50 border-border/50 hover:border-primary/40 focus:border-primary transition-all"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 animate-fade-in">
            {error}
          </p>
        )}

        <Button 
          className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 mt-2" 
          type="submit"
          disabled={pending}
        >
          {pending ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
