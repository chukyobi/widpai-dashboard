'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Loader2, CheckCircle2, AlertCircle, Landmark, Smartphone, Building2, Hash, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Currency = 'KES' | 'NGN'
type MethodType = 'mpesa' | 'airtel' | 'paybill' | 'till' | 'bank'

interface PaymentMethod {
  id: number
  currency: Currency
  method_type: MethodType
  details: Record<string, string>
  is_active: boolean
  updated_at: string
}

interface FieldDef { key: string; label: string; placeholder: string }
interface MethodDef { type: MethodType; label: string; fields: FieldDef[] }
interface CurrencyDef { methods: MethodDef[] }

const METHOD_CONFIG: Record<Currency, CurrencyDef> = {
  KES: {
    methods: [
      { type: 'mpesa', label: 'M-Pesa', fields: [
        { key: 'number', label: 'Number', placeholder: '07XXXXXXXX' },
        { key: 'name', label: 'Name', placeholder: 'Account holder name' },
      ]},
      { type: 'airtel', label: 'Airtel Money', fields: [
        { key: 'number', label: 'Number', placeholder: '07XXXXXXXX' },
        { key: 'name', label: 'Name', placeholder: 'Account holder name' },
      ]},
      { type: 'paybill', label: 'Pay Bill', fields: [
        { key: 'paybill_number', label: 'Pay Bill Number', placeholder: '000000' },
        { key: 'account_number', label: 'Account Number', placeholder: 'Account number' },
        { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. KCB, Equity' },
        { key: 'name', label: 'Name', placeholder: 'Account holder name' },
      ]},
      { type: 'till', label: 'Till Number', fields: [
        { key: 'till_number', label: 'Till Number', placeholder: '000000' },
        { key: 'business_name', label: 'Business Name', placeholder: 'Business name' },
      ]},
      { type: 'bank', label: 'Bank', fields: [
        { key: 'account_number', label: 'Account Number', placeholder: 'Account number' },
        { key: 'bank_name', label: 'Bank Name', placeholder: 'Bank name' },
        { key: 'name', label: 'Account Name', placeholder: 'Account holder name' },
      ]},
    ]
  },
  NGN: {
    methods: [
      { type: 'bank', label: 'Bank Account', fields: [
        { key: 'account_number', label: 'Account Number', placeholder: '0000000000' },
        { key: 'account_name', label: 'Account Name', placeholder: 'Account holder name' },
        { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. GTB, Access, Zenith' },
      ]},
    ]
  }
}

const METHOD_ICON: Record<MethodType, JSX.Element> = {
  mpesa: <Smartphone className="h-4 w-4" />,
  airtel: <Smartphone className="h-4 w-4" />,
  paybill: <Building2 className="h-4 w-4" />,
  till: <Hash className="h-4 w-4" />,
  bank: <Landmark className="h-4 w-4" />,
}

const METHOD_LABEL: Record<MethodType, string> = {
  mpesa: 'M-Pesa', airtel: 'Airtel Money', paybill: 'Pay Bill', till: 'Till', bank: 'Bank'
}

function getSummary(m: PaymentMethod): string {
  const d = m.details
  if (m.method_type === 'mpesa' || m.method_type === 'airtel') return `${d.number} · ${d.name}`
  if (m.method_type === 'paybill') return `${d.paybill_number} · ${d.account_number} · ${d.bank_name}`
  if (m.method_type === 'till') return `${d.till_number} · ${d.business_name}`
  if (m.method_type === 'bank') return `${d.account_number} · ${d.account_name || d.name} · ${d.bank_name}`
  return ''
}

export default function PaymentMethodsPage() {
  const [mounted, setMounted] = useState(false)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCurrency, setActiveCurrency] = useState<Currency>('KES')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [formCurrency, setFormCurrency] = useState<Currency>('KES')
  const [formType, setFormType] = useState<MethodType>('mpesa')
  const [formDetails, setFormDetails] = useState<Record<string, string>>({})
  const [formActive, setFormActive] = useState(false)
  const [saving, setSaving] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [delConfirm, setDelConfirm] = useState<number | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const loadMethods = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payment-methods')
      const data = await res.json()
      if (Array.isArray(data)) setMethods(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadMethods() }, [loadMethods])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [showModal])

  const openAdd = () => {
    const first = METHOD_CONFIG[activeCurrency].methods[0]
    setEditing(null)
    setFormCurrency(activeCurrency)
    setFormType(first.type)
    setFormDetails({})
    setFormActive(false)
    setShowModal(true)
  }

  const openEdit = (m: PaymentMethod) => {
    setEditing(m)
    setFormCurrency(m.currency)
    setFormType(m.method_type)
    setFormDetails({ ...m.details })
    setFormActive(m.is_active)
    setShowModal(true)
  }

  const closeModal = () => setShowModal(false)

  const switchCurrency = (c: Currency) => {
    setFormCurrency(c)
    const first = METHOD_CONFIG[c].methods[0]
    setFormType(first.type)
    setFormDetails({})
  }

  const switchType = (t: MethodType) => {
    setFormType(t)
    setFormDetails({})
  }

  const currentFields = METHOD_CONFIG[formCurrency]?.methods.find(m => m.type === formType)?.fields ?? []
  const allFilled = currentFields.every(f => formDetails[f.key]?.trim())

  const handleSave = async () => {
    if (!allFilled || saving) return
    setSaving(true)
    try {
      const body = { currency: formCurrency, method_type: formType, details: formDetails, is_active: formActive }
      const url = editing ? `/api/payment-methods/${editing.id}` : '/api/payment-methods'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      notify(editing ? 'Payment method updated!' : 'Payment method added!')
      closeModal()
      loadMethods()
    } catch {
      notify('Failed to save. Please try again.', false)
    } finally { setSaving(false) }
  }

  const handleToggle = async (m: PaymentMethod) => {
    setMethods(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !x.is_active } : x))
    try {
      await fetch(`/api/payment-methods/${m.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !m.is_active })
      })
    } catch { notify('Failed to update status', false); loadMethods() }
  }

  const handleDelete = async (id: number) => {
    setMethods(prev => prev.filter(m => m.id !== id))
    setDelConfirm(null)
    try {
      await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' })
      notify('Payment method deleted')
    } catch { notify('Failed to delete', false); loadMethods() }
  }

  const filtered = methods.filter(m => m.currency === activeCurrency)

  // Modal rendered via portal to escape overflow/stacking context issues
  const modal = mounted && showModal ? createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-4"
      style={{ zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up"
        style={{ maxHeight: '90vh', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border) / 0.3)' }}>
          <h2 className="font-bold text-base">{editing ? 'Edit Payment Method' : 'Add Payment Method'}</h2>
          <button onClick={closeModal} className="p-1.5 rounded-full hover:bg-accent/30 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Currency */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Currency</label>
            <div className="flex gap-2">
              {(['KES', 'NGN'] as Currency[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => switchCurrency(c)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    formCurrency === c
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {c === 'KES' ? '🇰🇪 KES' : '🇳🇬 NGN'}
                </button>
              ))}
            </div>
          </div>

          {/* Method Type */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Payment Type</label>
            <div className="grid grid-cols-2 gap-2">
              {METHOD_CONFIG[formCurrency].methods.map(m => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => switchType(m.type)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                    formType === m.type
                      ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                      : 'border-border/50 text-muted-foreground hover:border-primary/20 hover:text-foreground'
                  }`}
                >
                  {METHOD_ICON[m.type]}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Fields */}
          <div className="space-y-3">
            {currentFields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{field.label}</label>
                <input
                  type="text"
                  value={formDetails[field.key] ?? ''}
                  onChange={e => setFormDetails(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full bg-background/60 border border-border/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-colors placeholder-muted-foreground"
                />
              </div>
            ))}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'hsl(var(--background) / 0.4)', border: '1px solid hsl(var(--border) / 0.3)' }}>
            <div>
              <p className="text-sm font-semibold">Set as Active</p>
              <p className="text-xs text-muted-foreground">AI will use this when user requests payment info</p>
            </div>
            <button
              type="button"
              onClick={() => setFormActive(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 ${formActive ? 'bg-emerald-500' : 'bg-muted'}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${formActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-2" style={{ borderTop: '1px solid hsl(var(--border) / 0.3)' }}>
          <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-xl gap-2"
            onClick={handleSave}
            disabled={!allFilled || saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? 'Save Changes' : 'Add Method'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Toast — also via portal */}
      {mounted && toast && createPortal(
        <div className={`fixed top-4 right-4 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in-up ${toast.ok ? 'bg-emerald-500' : 'bg-rose-500'} text-white`} style={{ zIndex: 10000 }}>
          {toast.ok ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {toast.msg}
        </div>,
        document.body
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 bg-background/30 backdrop-blur-md flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold">Payment Methods</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage accounts the AI shares with users</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5 rounded-full">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Method</span>
        </Button>
      </div>

      {/* Currency Tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-border/20 bg-background/20 flex-shrink-0">
        {(['KES', 'NGN'] as Currency[]).map(c => (
          <button
            key={c}
            onClick={() => setActiveCurrency(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeCurrency === c ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
            }`}
          >
            {c === 'KES' ? '🇰🇪 KES' : '🇳🇬 NGN'}
          </button>
        ))}
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-primary/30" />
            </div>
            <div>
              <p className="font-semibold text-sm">No {activeCurrency} methods yet</p>
              <p className="text-xs text-muted-foreground mt-1">Tap &ldquo;Add Method&rdquo; to get started</p>
            </div>
            <Button size="sm" onClick={openAdd} className="gap-1.5 rounded-full mt-2">
              <Plus className="h-4 w-4" /> Add Method
            </Button>
          </div>
        ) : (
          filtered.map(m => (
            <div
              key={m.id}
              className={`rounded-2xl border p-4 bg-card/60 backdrop-blur-sm transition-all ${
                m.is_active ? 'border-emerald-500/40 shadow-sm shadow-emerald-500/10' : 'border-border/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  m.is_active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground'
                }`}>
                  {METHOD_ICON[m.method_type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{METHOD_LABEL[m.method_type]}</span>
                    {m.is_active && (
                      <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-500 rounded-full px-2 py-0.5">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{getSummary(m)}</p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => handleToggle(m)} className="p-1.5 rounded-lg hover:bg-accent/30 transition-colors" title={m.is_active ? 'Deactivate' : 'Activate'}>
                    {m.is_active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-accent/30 text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  {delConfirm === m.id ? (
                    <div className="flex gap-1 ml-1">
                      <button onClick={() => handleDelete(m.id)} className="px-2 py-1 text-[10px] font-bold bg-rose-500 text-white rounded-lg">Yes</button>
                      <button onClick={() => setDelConfirm(null)} className="px-2 py-1 text-[10px] bg-muted rounded-lg">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDelConfirm(m.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Field breakdown */}
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {Object.entries(m.details).map(([k, v]) => (
                  <div key={k} className="bg-background/40 rounded-lg px-2.5 py-1.5">
                    <p className="text-[10px] text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p>
                    <p className="text-xs font-semibold truncate">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal rendered via portal — bypasses all CSS overflow/stacking constraints */}
      {modal}
    </div>
  )
}
