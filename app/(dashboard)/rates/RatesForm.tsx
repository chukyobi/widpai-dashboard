"use client"

import * as React from "react"
import { useActionState } from "react"
import { updateRatesAction } from "./actions"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function RatesForm({ initialBuyRate, initialSellRate }: { initialBuyRate: string, initialSellRate: string }) {
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccess(false)
    setError(null)
    const formData = new FormData(event.currentTarget)
    
    startTransition(async () => {
      const result = await updateRatesAction(formData)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || "Something went wrong")
      }
    })
  }

  return (
    <div className="w-full max-w-md animate-in">
      <Card className="shadow-2xl border-primary/20 glass-card">
        <CardHeader className="pb-4 border-b border-border/50 bg-primary/5">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            KES/NGN Exchange Rates
          </CardTitle>
          <CardDescription className="text-muted-foreground/80">
            Update the live exchange rates used by the WhatsApp bot.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2 group">
              <label htmlFor="buyRate" className="text-sm font-medium leading-none text-foreground/80 group-focus-within:text-primary transition-colors">
                Buy Rate (Per KES)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <Input 
                  id="buyRate" 
                  name="buyRate" 
                  type="number" 
                  step="0.0001" 
                  defaultValue={initialBuyRate} 
                  required 
                  className="pl-8 bg-background/50 border-primary/20 focus:border-primary focus:ring-primary/20 transition-all hover:bg-background/80" 
                />
              </div>
            </div>
            <div className="space-y-2 group">
              <label htmlFor="sellRate" className="text-sm font-medium leading-none text-foreground/80 group-focus-within:text-primary transition-colors">
                Sell Rate (Per KES)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <Input 
                  id="sellRate" 
                  name="sellRate" 
                  type="number" 
                  step="0.0001" 
                  defaultValue={initialSellRate} 
                  required 
                  className="pl-8 bg-background/50 border-primary/20 focus:border-primary focus:ring-primary/20 transition-all hover:bg-background/80" 
                />
              </div>
            </div>
            
            {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</p>}
            {success && <p className="text-sm text-green-500 font-medium bg-green-500/10 p-3 rounded-lg border border-green-500/20 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
              Rates updated successfully!
            </p>}
          </CardContent>
          <CardFooter className="pt-2 pb-6 px-6">
            <Button type="submit" disabled={isPending} className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
              {isPending ? "Updating Database..." : "Update Live Rates"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
