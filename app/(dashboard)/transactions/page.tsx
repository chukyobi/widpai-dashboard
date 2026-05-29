'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'

type Transaction = {
  id: number
  whatsapp_number: string
  receipt_url: string
  status: 'PENDING' | 'COMPLETED' | 'DISPUTED'
  amount_detected: string | null
  created_at: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    fetchTransactions()
    const interval = setInterval(fetchTransactions, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [])

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions')
      const data = await res.json()
      if (data.transactions) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Failed to fetch transactions', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: number, status: 'COMPLETED' | 'DISPUTED') => {
    try {
      setUpdatingId(id)
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        setTransactions(prev =>
          prev.map(t => (t.id === id ? { ...t, status } : t))
        )
      }
    } catch (error) {
      console.error('Failed to update transaction status', error)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          Review and approve pending transactions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {transactions.map((tx) => (
          <Card key={tx.id} className="overflow-hidden flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex justify-between items-center">
                <span className="truncate" title={tx.whatsapp_number}>
                  {tx.whatsapp_number}
                </span>
                {tx.status === 'PENDING' && <Clock className="h-5 w-5 text-yellow-500" />}
                {tx.status === 'COMPLETED' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {tx.status === 'DISPUTED' && <XCircle className="h-5 w-5 text-red-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="relative aspect-[3/4] w-full bg-muted rounded-md mb-4 overflow-hidden">
                {tx.receipt_url ? (
                  <img
                    src={tx.receipt_url}
                    alt="Receipt"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    No Receipt
                  </div>
                )}
              </div>
              
              <div className="mb-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium capitalize">{tx.status.toLowerCase()}</span>
                </div>
              </div>

              {tx.status === 'PENDING' && (
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                    disabled={updatingId === tx.id}
                    onClick={() => handleUpdateStatus(tx.id, 'DISPUTED')}
                  >
                    Dispute
                  </Button>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={updatingId === tx.id}
                    onClick={() => handleUpdateStatus(tx.id, 'COMPLETED')}
                  >
                    {updatingId === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {transactions.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg border-dashed">
            No transactions found.
          </div>
        )}
      </div>
    </div>
  )
}
