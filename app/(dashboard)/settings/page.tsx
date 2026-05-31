'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Settings, Moon, DollarSign, Loader2 } from 'lucide-react'

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
              <Switch checked={isClosed} onCheckedChange={toggleClosed} disabled={updating} />
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
              <Switch checked={noShillings} onCheckedChange={toggleNoShillings} disabled={updating} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
