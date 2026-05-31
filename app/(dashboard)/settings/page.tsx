'use client'

import { useState, useEffect } from 'react'
import { Settings, Moon, DollarSign, Loader2, CreditCard, LogOut } from 'lucide-react'
import Link from 'next/link'
import { logoutAction } from '@/app/(auth)/actions'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isClosed, setIsClosed] = useState(false)
  const [noShillings, setNoShillings] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setIsClosed(data.is_closed || false)
        setNoShillings(data.no_shillings || false)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load settings', err)
        setLoading(false)
      })
  }, [])

  const toggleClosed = async () => {
    const newValue = !isClosed
    setIsClosed(newValue)
    setUpdating(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_closed: newValue })
      })
    } catch (error) {
      console.error(error)
      setIsClosed(!newValue)
    } finally {
      setUpdating(false)
    }
  }

  const toggleNoShillings = async () => {
    const newValue = !noShillings
    setNoShillings(newValue)
    setUpdating(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ no_shillings: newValue })
      })
    } catch (error) {
      console.error(error)
      setNoShillings(!newValue)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-8 py-6 border-b border-border/50 bg-background/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Bot Operations</h1>
            <p className="text-sm text-muted-foreground">Manage bot behavior and availability</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card/40 border border-border/50 rounded-2xl p-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl \${isClosed ? 'bg-indigo-500/20 text-indigo-500' : 'bg-muted text-muted-foreground'}`}>
                  <Moon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Closed for the Day</h3>
                  <p className="text-sm text-muted-foreground">Bot responds: "Sorry, we have closed for the day."</p>
                </div>
              </div>
              <button
                onClick={toggleClosed}
                disabled={updating}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isClosed ? 'bg-primary' : 'bg-input'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${isClosed ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="bg-card/40 border border-border/50 rounded-2xl p-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl \${noShillings ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">No Shillings Available</h3>
                  <p className="text-sm text-muted-foreground">Bot responds: "Sorry, we don't have shillings available."</p>
                </div>
              </div>
              <button
                onClick={toggleNoShillings}
                disabled={updating}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${noShillings ? 'bg-primary' : 'bg-input'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${noShillings ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="pt-6 mt-6 border-t border-border/50 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Account Links</h3>
              <Link href="/payment-methods" className="flex items-center gap-4 bg-card/40 border border-border/50 rounded-2xl p-4 hover:bg-accent/50 transition-colors shadow-sm w-full">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium">Payment Methods</h3>
                  <p className="text-sm text-muted-foreground">Manage your bank and mobile money accounts</p>
                </div>
              </Link>
              
              <form action={logoutAction}>
                <button type="submit" className="w-full flex items-center gap-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 hover:bg-rose-500/10 transition-colors shadow-sm text-left">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-rose-600">Sign Out</h3>
                    <p className="text-sm text-rose-500/70">Securely log out of your admin account</p>
                  </div>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
