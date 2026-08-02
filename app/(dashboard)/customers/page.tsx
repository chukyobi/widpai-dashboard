'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, Search, ShieldCheck, ShieldAlert, Clock, ShieldX,
  ExternalLink, FileText, CheckCircle2, XCircle, Loader2,
  RefreshCw, MessageSquare, AlertCircle, Eye, UserCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Customer {
  id: number
  session_id: string
  whatsapp_number: string
  full_name: string | null
  email: string | null
  country: string | null
  id_type: string | null
  id_number: string | null
  id_document_url: string | null
  selfie_url: string | null
  kyc_status: 'not_started' | 'submitted' | 'verified' | 'rejected'
  rejection_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Modal editing states
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (search.trim()) params.append('search', search.trim())

      const res = await fetch(`/api/customers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setCustomers(data)
      }
    } catch (err) {
      console.error('Failed to load customers:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const notify = (msg: string, success = true) => {
    setNotification({ msg, success })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleUpdateStatus = async (newStatus: 'verified' | 'rejected' | 'submitted') => {
    if (!selectedCustomer) return
    setActionLoading(true)

    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(selectedCustomer.session_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kyc_status: newStatus,
          rejection_reason: newStatus === 'rejected' ? rejectionReason : null,
          notes: adminNotes
        })
      })

      if (res.ok) {
        const updated = await res.json()
        setSelectedCustomer(updated)
        notify(`Customer KYC status set to ${newStatus.toUpperCase()}`)
        loadCustomers()
      } else {
        notify('Failed to update status', false)
      }
    } catch {
      notify('An error occurred while updating status', false)
    } finally {
      setActionLoading(false)
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        )
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5" />
            Pending Review
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldX className="h-3.5 w-3.5" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <ShieldAlert className="h-3.5 w-3.5" />
            Not Started
          </span>
        )
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border ${
          notification.success
            ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
            : 'bg-rose-950/80 border-rose-500/30 text-rose-200'
        }`}>
          {notification.success ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-rose-400" />}
          <span className="text-sm font-medium">{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Customers & KYC Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review identity documents, manage customer profiles, and update KYC verification statuses.
          </p>
        </div>
        <Button onClick={loadCustomers} variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center glass p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, ID number, or session ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-border/50 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['all', 'submitted', 'verified', 'rejected', 'not_started'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {status === 'all' && 'All Customers'}
              {status === 'submitted' && 'Pending Review'}
              {status === 'verified' && 'Verified'}
              {status === 'rejected' && 'Rejected'}
              {status === 'not_started' && 'Not Started'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading customer database...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center space-y-3 border border-border/50">
          <UserCheck className="h-12 w-12 text-muted-foreground/50 mx-auto" />
          <h3 className="text-lg font-semibold">No customers found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {search || statusFilter !== 'all'
              ? 'No customers match your current filter or search criteria.'
              : 'Customers will automatically appear here when they start a chat or complete KYC onboarding.'}
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl border border-border/50 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Customer Info</th>
                  <th className="px-6 py-4">Nationality</th>
                  <th className="px-6 py-4">ID Details</th>
                  <th className="px-6 py-4">KYC Status</th>
                  <th className="px-6 py-4">Last Active</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {customers.map((c) => (
                  <tr key={c.id || c.session_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{c.full_name || 'Anonymous User'}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span>📱 {c.whatsapp_number || c.session_id}</span>
                        {c.email && <span>• {c.email}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted/50 border border-border/40">
                        {c.country || 'Not specified'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {c.id_number ? (
                        <div className="text-xs space-y-0.5">
                          <div className="font-medium text-foreground uppercase">{c.id_type || 'ID Document'}</div>
                          <div className="font-mono text-muted-foreground">{c.id_number}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No ID provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatusBadge(c.kyc_status)}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(c.updated_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        href={`/conversations?session=${encodeURIComponent(c.session_id)}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Chat
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setRejectionReason(c.rejection_reason || '')
                          setAdminNotes(c.notes || '')
                        }}
                        className="text-xs gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KYC Detail & Verification Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="glass max-w-2xl w-full rounded-2xl border border-border/50 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Customer KYC Review
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Session ID: <span className="font-mono">{selectedCustomer.session_id}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCustomer(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-card/60 border border-border/40">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Current Status</span>
                {renderStatusBadge(selectedCustomer.kyc_status)}
              </div>

              {/* Personal Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-card/40 border border-border/30">
                  <div className="text-xs font-medium text-muted-foreground">Full Name</div>
                  <div className="text-sm font-semibold mt-0.5">{selectedCustomer.full_name || 'Not provided'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-card/40 border border-border/30">
                  <div className="text-xs font-medium text-muted-foreground">Phone / WhatsApp</div>
                  <div className="text-sm font-semibold mt-0.5">{selectedCustomer.whatsapp_number || selectedCustomer.session_id}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-card/40 border border-border/30">
                  <div className="text-xs font-medium text-muted-foreground">Email</div>
                  <div className="text-sm font-semibold mt-0.5">{selectedCustomer.email || 'Not provided'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-card/40 border border-border/30">
                  <div className="text-xs font-medium text-muted-foreground">Country</div>
                  <div className="text-sm font-semibold mt-0.5">{selectedCustomer.country || 'Not specified'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-card/40 border border-border/30">
                  <div className="text-xs font-medium text-muted-foreground">ID Type</div>
                  <div className="text-sm font-semibold uppercase mt-0.5">{selectedCustomer.id_type || 'Not provided'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-card/40 border border-border/30">
                  <div className="text-xs font-medium text-muted-foreground">ID Number</div>
                  <div className="text-sm font-mono font-semibold mt-0.5">{selectedCustomer.id_number || 'Not provided'}</div>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verification Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Government ID Document */}
                  <div className="p-4 rounded-xl bg-card/40 border border-border/30 space-y-2">
                    <div className="text-xs font-semibold flex items-center justify-between">
                      <span>Government ID Photo/Doc</span>
                      {selectedCustomer.id_document_url && (
                        <a
                          href={selectedCustomer.id_document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline text-[11px] flex items-center gap-1"
                        >
                          View Full <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {selectedCustomer.id_document_url ? (
                      <div className="aspect-video rounded-lg overflow-hidden border border-border/40 bg-black/40 relative group">
                        <img
                          src={selectedCustomer.id_document_url}
                          alt="Government ID"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg border border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
                        <FileText className="h-6 w-6 opacity-40" />
                        <span>No ID document uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* Selfie Photo */}
                  <div className="p-4 rounded-xl bg-card/40 border border-border/30 space-y-2">
                    <div className="text-xs font-semibold flex items-center justify-between">
                      <span>Selfie / Verification Photo</span>
                      {selectedCustomer.selfie_url && (
                        <a
                          href={selectedCustomer.selfie_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline text-[11px] flex items-center gap-1"
                        >
                          View Full <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {selectedCustomer.selfie_url ? (
                      <div className="aspect-video rounded-lg overflow-hidden border border-border/40 bg-black/40 relative group">
                        <img
                          src={selectedCustomer.selfie_url}
                          alt="Selfie Verification"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg border border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
                        <FileText className="h-6 w-6 opacity-40" />
                        <span>No selfie photo uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Rejection & Notes Form */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Rejection Reason (Required if rejecting):
                  </label>
                  <Input
                    placeholder="e.g. ID photo blurry, Name mismatch with ID..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="bg-background/50 border-border/50 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Internal Admin Notes:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add internal notes about this customer..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full rounded-xl bg-background/50 border border-border/50 p-3 text-xs focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-border/50 bg-muted/20 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={actionLoading || !rejectionReason.trim()}
                  onClick={() => handleUpdateStatus('rejected')}
                  className="gap-1 text-xs"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Reject KYC
                </Button>
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('verified')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1 text-xs shadow-md"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve & Verify
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
