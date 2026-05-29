'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, CheckCircle2, XCircle, Clock, Image as ImageIcon, MessageSquare, Download, Filter, X } from 'lucide-react'
import Link from 'next/link'

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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  
  // Filtering States
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

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

  // Derived state for filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      let matches = true;
      
      // Status Filter
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) {
        matches = false;
      }

      // Date Filters (convert to start/end of day local time for accurate comparison)
      const txDate = new Date(tx.created_at).getTime()
      
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        if (txDate < start.getTime()) matches = false;
      }
      
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        if (txDate > end.getTime()) matches = false;
      }

      return matches;
    })
  }, [transactions, startDate, endDate, statusFilter])

  // Compliance-ready CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID', 
      'Date (Local)', 
      'Time (Local)', 
      'WhatsApp Number', 
      'Amount Detected', 
      'Status', 
      'Receipt URL',
      'UTC Timestamp'
    ];
    
    const rows = filteredTransactions.map(tx => {
      const d = new Date(tx.created_at);
      return [
        tx.id,
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        tx.whatsapp_number,
        tx.amount_detected || 'Not Detected',
        tx.status,
        tx.receipt_url || 'N/A',
        d.toISOString() // Audit trail requirement
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','); // Escape quotes for CSV format
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `Widpai_Transactions_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setStatusFilter('ALL')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in px-4 md:px-8 py-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Review, approve, and audit your payment pipeline.
          </p>
        </div>
        
        <Button 
          onClick={handleExportCSV}
          className="bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all"
          disabled={filteredTransactions.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* Audit & Compliance Filter Bar */}
      <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-end gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto text-sm font-medium text-muted-foreground mb-1 md:mb-0">
          <Filter className="w-4 h-4" /> Filters:
        </div>
        
        <div className="flex flex-col w-full md:w-auto">
          <label className="text-xs font-medium text-muted-foreground mb-1">Start Date</label>
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 bg-background/50"
          />
        </div>

        <div className="flex flex-col w-full md:w-auto">
          <label className="text-xs font-medium text-muted-foreground mb-1">End Date</label>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 bg-background/50"
          />
        </div>

        <div className="flex flex-col w-full md:w-auto">
          <label className="text-xs font-medium text-muted-foreground mb-1">Status</label>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full md:w-[150px] rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="DISPUTED">Disputed</option>
          </select>
        </div>

        {(startDate || endDate || statusFilter !== 'ALL') && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground">
            Clear
          </Button>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium">Date / Time</th>
                <th className="px-6 py-4 font-medium">Customer (WhatsApp)</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    {transactions.length === 0 ? "No transactions found in database." : "No transactions match your current filters."}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-accent/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{tx.whatsapp_number}</div>
                      {tx.amount_detected && (
                        <div className="text-xs text-muted-foreground">Amount: {tx.amount_detected}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        tx.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                        {tx.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        {tx.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {tx.status === 'DISPUTED' && <XCircle className="w-3.5 h-3.5" />}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-medium"
                        onClick={() => setLightboxUrl(tx.receipt_url)}
                        disabled={!tx.receipt_url}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Receipt
                      </Button>
                      
                      <Link href="/conversations">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Chat
                        </Button>
                      </Link>

                      {tx.status === 'PENDING' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                            disabled={updatingId === tx.id}
                            onClick={() => handleUpdateStatus(tx.id, 'DISPUTED')}
                          >
                            Dispute
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={updatingId === tx.id}
                            onClick={() => handleUpdateStatus(tx.id, 'COMPLETED')}
                          >
                            {updatingId === tx.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Approve'}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox for Receipt */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={lightboxUrl} 
            alt="Transaction Receipt" 
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  )
}
