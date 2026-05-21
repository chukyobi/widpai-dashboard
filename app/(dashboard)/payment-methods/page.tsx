'use client'

import { useState, useEffect, useCallback } from 'react'
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

const METHOD_CONFIG: Record<Currency, { label: string; methods: { type: MethodType; label: string; icon: React.ReactNode; fields: { key: string; label: string; placeholder: string }[] }[] }> = {
  KES: {
    label: '🇰🇪 Kenya Shilling (KES)',
    methods: [
      {
        type: 'mpesa', label: 'M-Pesa', icon: <Smartphone className="h-4 w-4" />,
        fields: [
          { key: 'number', label: 'Number', placeholder: '07XXXXXXXX' },
          { key: 'name', label: 'Name', placeholder: 'Account holder name' },
        ]
      },
      {
        type: 'airtel', label: 'Airtel Money', icon: <Smartphone className="h-4 w-4" />,
        fields: [
          { key: 'number', label: 'Number', placeholder: '07XXXXXXXX' },
          { key: 'name', label: 'Name', placeholder: 'Account holder name' },
        ]
      },
      {
        type: 'paybill', label: 'Pay Bill', icon: <Building2 className="h-4 w-4" />,
        fields: [
          { key: 'paybill_number', label: 'Pay Bill Number', placeholder: '000000' },
          { key: 'account_number', label: 'Account Number', placeholder: 'Account number' },
          { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. KCB, Equity' },
          { key: 'name', label: 'Name', placeholder: 'Account holder name' },
        ]
      },
      {
        type: 'till', label: 'Till Number', icon: <Hash className="h-4 w-4" />,
        fields: [
          { key: 'till_number', label: 'Till Number', placeholder: '000000' },
          { key: 'business_name', label: 'Business Name', placeholder: 'Business name' },
        ]
      },
      {
        type: 'bank', label: 'Bank', icon: <Landmark className="h-4 w-4" />,
        fields: [
          { key: 'account_number', label: 'Account Number', placeholder: 'Account number' },
          { key: 'bank_name', label: 'Bank Name', placeholder: 'Bank name' },
          { key: 'name', label: 'Account Name', placeholder: 'Account holder name' },
        ]
      },
    ]
  },
  NGN: {
    label: '🇳🇬 Nigerian Naira (NGN)',
    methods: [
      {
        type: 'bank', label: 'Bank Account', icon: <Landmark className="h-4 w-4" />,
        fields: [
          { key: 'account_number', label: 'Account Number', placeholder: '0000000000' },
          { key: 'account_name', label: 'Account Name', placeholder: 'Account holder name' },
          { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. GTB, Access, Zenith' },
        ]
      },
    ]
  }
}

const METHOD_LABELS: Record<MethodType, string> = {
  mpesa: 'M-Pesa', airtel: 'Airtel Money', paybill: 'Pay Bill', till: 'Till', bank: 'Bank'
}

const METHOD_ICONS: Record<MethodType, React.ReactNode> = {
  mpesa: <Smartphone className="h-4 w-4" />,
  airtel: <Smartphone className="h-4 w-4" />,
  paybill: <Building2 className="h-4 w-4" />,
  till: <Hash className="h-4 w-4" />,
  bank: <Landmark className="h-4 w-4" />,
}

function getMethodSummary(m: PaymentMethod): string {
  const d = m.details
  if (m.method_type === 'mpesa' || m.method_type === 'airtel') return `${d.number} · ${d.name}`
  if (m.method_type === 'paybill') return `${d.paybill_number} · ${d.account_number} · ${d.bank_name}`
  if (m.method_type === 'till') return `${d.till_number} · ${d.business_name}`
  if (m.method_type === 'bank') return `${d.account_number} · ${d.account_name || d.name} · ${d.bank_name}`
  return ''
}

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCurrency, setActiveCurrency] = useState<Currency>('KES')
  const [showForm, setShowForm] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [formCurrency, setFormCurrency] = useState<Currency>('KES')
  const [formMethodType, setFormMethodType] = useState<MethodType>('mpesa')
  const [formDetails, setFormDetails] = useState<Record<string, string>>({})
  const [formActive, setFormActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadMethods = useCallback(async () => {
    try {
      const res = await fetch('/api/payment-methods')
      const data = await res.json()
      if (Array.isArray(data)) setMethods(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadMethods() }, [loadMethods])

  const openCreate = () => {
    setEditingMethod(null)
    setFormCurrency(activeCurrency)
    const firstMethod = METHOD_CONFIG[activeCurrency].methods[0]
    setFormMethodType(firstMethod.type)
    setFormDetails({})
    setFormActive(false)
    setShowForm(true)
  }

  const openEdit = (m: PaymentMethod) => {
    setEditingMethod(m)
    setFormCurrency(m.currency)
    setFormMethodType(m.method_type)
    setFormDetails({ ...m.details })
    setFormActive(m.is_active)
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = { currency: formCurrency, method_type: formMethodType, details: formDetails, is_active: formActive }
      const res = editingMethod
        ? await fetch(`/api/payment-methods/${editingMethod.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/payment-methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      showToast(editingMethod ? 'Payment method updated!' : 'Payment method added!')
      setShowForm(false)
      loadMethods()
    } catch {
      showToast('Failed to save. Please try again.', 'error')
    } finally { setSaving(false) }
  }

  const handleToggleActive = async (m: PaymentMethod) => {
    const updated = methods.map(x => x.id === m.id ? { ...x, is_active: !x.is_active } : x)
    setMethods(updated)
    try {
      await fetch(`/api/payment-methods/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !m.is_active }) })
    } catch {
      setMethods(methods) // rollback
      showToast('Failed to update status', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    setMethods(prev => prev.filter(m => m.id !== id))
    setDeleteConfirm(null)
    try {
      await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' })
      showToast('Payment method deleted')
    } catch {
      showToast('Failed to delete', 'error')
      loadMethods()
    }
  }

  const currentFields = METHOD_CONFIG[formCurrency]?.methods.find(m => m.type === formMethodType)?.fields || []
  const filteredMethods = methods.filter(m => m.currency === activeCurrency)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in-up ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 bg-background/30 backdrop-blur-md flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold">Payment Methods</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage bank accounts & wallets the AI will share with users</p>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="gap-1.5 rounded-full"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Method</span>
        </Button>
      </div>

      {/* Currency Tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-border/20 bg-background/20 flex-shrink-0">
        {(Object.keys(METHOD_CONFIG) as Currency[]).map(c => (
          <button
            key={c}
            onClick={() => setActiveCurrency(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeCurrency === c
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
            }`}
          >
            {c === 'KES' ? '🇰🇪 KES' : '🇳🇬 NGN'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredMethods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-primary/40" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">No {activeCurrency} payment methods yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Click &ldquo;Add Method&rdquo; to add one</p>
            </div>
          </div>
        ) : (
          filteredMethods.map(m => (
            <div
              key={m.id}
              className={`group rounded-2xl border p-4 bg-card/50 backdrop-blur-sm transition-all duration-200 ${
                m.is_active ? 'border-emerald-500/30 shadow-sm shadow-emerald-500/5' : 'border-border/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  m.is_active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground'
                }`}>
                  {METHOD_ICONS[m.method_type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{METHOD_LABELS[m.method_type]}</span>
                    {m.is_active && (
                      <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-500 rounded-full px-2 py-0.5">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{getMethodSummary(m)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(m)}
                    className="p-1.5 rounded-lg hover:bg-accent/30 transition-colors"
                    title={m.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {m.is_active
                      ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                      : <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    }
                  </button>
                  <button
                    onClick={() => openEdit(m)}
                    className="p-1.5 rounded-lg hover:bg-accent/30 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {deleteConfirm === m.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="px-2 py-1 text-[10px] font-bold bg-rose-500 text-white rounded-lg"
                      >Delete</button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-[10px] bg-muted rounded-lg"
                      >No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(m.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Details breakdown */}
              <div className="mt-3 grid grid-cols-2 gap-2">
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

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <h2 className="font-bold text-base">{editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-accent/30 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Currency */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Currency</label>
                <div className="flex gap-2">
                  {(Object.keys(METHOD_CONFIG) as Currency[]).map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setFormCurrency(c)
                        const first = METHOD_CONFIG[c].methods[0]
                        setFormMethodType(first.type)
                        setFormDetails({})
                      }}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        formCurrency === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:border-primary/30'
                      }`}
                    >
                      {c === 'KES' ? '🇰🇪 KES' : '🇳🇬 NGN'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Method Type */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {METHOD_CONFIG[formCurrency].methods.map(m => (
                    <button
                      key={m.type}
                      onClick={() => { setFormMethodType(m.type); setFormDetails({}) }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all ${
                        formMethodType === m.type ? 'bg-primary/10 text-primary border-primary/30 font-semibold' : 'border-border/50 hover:border-primary/20 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {m.icon}
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
                      value={formDetails[field.key] || ''}
                      onChange={e => setFormDetails(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full bg-background/60 border border-border/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder-muted-foreground"
                    />
                  </div>
                ))}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between rounded-xl bg-background/40 border border-border/30 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Set as Active</p>
                  <p className="text-xs text-muted-foreground">AI will share this account when user requests payment</p>
                </div>
                <button
                  onClick={() => setFormActive(!formActive)}
                  className={`w-11 h-6 rounded-full transition-all duration-200 ${formActive ? 'bg-emerald-500' : 'bg-muted'}`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${formActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-border/30 flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl gap-2"
                onClick={handleSave}
                disabled={saving || currentFields.some(f => !formDetails[f.key]?.trim())}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingMethod ? 'Update' : 'Add Method'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
