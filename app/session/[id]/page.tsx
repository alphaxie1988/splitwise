'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Calculator, Copy, LogIn, LogOut, Pencil, Trash2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import type { Expense, SessionData } from '@/lib/types'
import ExpenseModal from '@/components/ExpenseModal'
import SettlementModal from '@/components/SettlementModal'
import AuditLogSection from '@/components/AuditLogSection'

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showSettlement, setShowSettlement] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingRateId, setEditingRateId] = useState<string | null>(null)
  const [rateInput, setRateInput] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${id}?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Session not found')
      setData(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load session.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignIn = async () => {
    setAuthLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/session/${id}`,
      },
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteExpense = async (expenseId: string) => {
    setDeleteId(expenseId)
    const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' })
    setDeleteId(null)
    if (res.ok) fetchData()
  }

  const handleSaveRate = async (currencyId: string) => {
    setSavingRate(true)
    const res = await fetch(`/api/sessions/${id}/currencies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency_id: currencyId, rate_to_sgd: rateInput }),
    })
    setSavingRate(false)
    if (res.ok) { setEditingRateId(null); fetchData() }
  }

  const openAdd = () => { setEditingExpense(null); setShowExpenseModal(true) }
  const openEdit = (expense: Expense) => { setEditingExpense(expense); setShowExpenseModal(true) }

  // ── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading session…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-sm mb-2">{error || 'Session not found.'}</p>
          <a href="/" className="text-blue-600 text-sm hover:underline">Go home</a>
        </div>
      </div>
    )
  }

  const { session, members, currencies, expenses } = data

  const rateFor = (code: string) => {
    if (code === 'SGD') return 1
    return currencies.find(c => c.currency_code === code)?.rate_to_sgd ?? 1
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{session.name}</h1>
              <p className="text-sm text-gray-500 truncate">
                {members.map(m => m.name).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-xs text-gray-600 border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition"
              >
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-xs text-gray-600 border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition"
                  title={user.email ?? ''}
                >
                  <LogOut size={12} />
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  disabled={authLoading}
                  className="flex items-center gap-1 text-xs text-white bg-blue-600 rounded-lg px-2.5 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <LogIn size={12} />
                  Sign In to Edit
                </button>
              )}
            </div>
          </div>

          {/* Exchange rates strip */}
          {currencies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currencies.map(c => (
                <span key={c.id} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                  1 {c.currency_code} =&nbsp;
                  {editingRateId === c.id ? (
                    <>
                      <input
                        autoFocus
                        type="number"
                        step="any"
                        min="0.000001"
                        value={rateInput}
                        onChange={e => setRateInput(e.target.value)}
                        className="w-16 border rounded px-1 py-0 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveRate(c.id); if (e.key === 'Escape') setEditingRateId(null) }}
                      />
                      <button
                        onClick={() => handleSaveRate(c.id)}
                        disabled={savingRate}
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                      >
                        {savingRate ? '…' : 'Save'}
                      </button>
                      <button onClick={() => setEditingRateId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </>
                  ) : (
                    <>
                      {c.rate_to_sgd} SGD
                      {user && (
                        <button
                          onClick={() => { setEditingRateId(c.id); setRateInput(c.rate_to_sgd.toString()) }}
                          className="ml-1 text-gray-400 hover:text-blue-500"
                          title="Edit rate"
                        >
                          <Pencil size={10} />
                        </button>
                      )}
                    </>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Signed-in indicator */}
          {user && (
            <p className="text-xs text-green-600 mt-1">Editing as {user.email}</p>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Actions bar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Expenses ({expenses.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettlement(true)}
              disabled={expenses.length === 0}
              className="flex items-center gap-1 text-sm border rounded-lg px-3 py-1.5 hover:bg-white transition disabled:opacity-40"
            >
              <Calculator size={14} />
              Settle Up
            </button>
            {user && (
              <button
                onClick={openAdd}
                className="flex items-center gap-1 text-sm text-white bg-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-700 transition"
              >
                <Plus size={14} />
                Add Expense
              </button>
            )}
          </div>
        </div>

        {/* Expense list */}
        {expenses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base">No expenses yet.</p>
            {!user && (
              <button onClick={handleSignIn} className="mt-2 text-sm text-blue-500 hover:underline">
                Sign in to add the first expense
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(expense => {
              const splitNames = expense.splits?.map(s => s.member?.name ?? '').filter(Boolean).join(', ')
              const amountSGD = expense.amount * rateFor(expense.currency_code)

              return (
                <div key={expense.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{expense.description}</p>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-gray-800">
                          {expense.amount.toFixed(2)} {expense.currency_code}
                        </span>
                        {expense.currency_code !== 'SGD' && (
                          <span className="text-xs text-gray-400">
                            ≈ {amountSGD.toFixed(2)} SGD
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Paid by <span className="font-medium">{expense.paid_by?.name}</span>
                        {splitNames && (
                          <> &middot; Split: {splitNames}</>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(expense.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {user && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(expense)}
                          className="text-gray-400 hover:text-blue-600 p-1 rounded transition"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          disabled={deleteId === expense.id}
                          className="text-gray-400 hover:text-red-500 p-1 rounded transition disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Audit log */}
        <div className="mt-8">
          <AuditLogSection sessionId={id} />
        </div>
      </main>

      {/* ── Modals ── */}
      {showExpenseModal && (
        <ExpenseModal
          sessionId={id}
          members={members}
          currencies={currencies}
          expense={editingExpense}
          onClose={() => setShowExpenseModal(false)}
          onSaved={() => { setShowExpenseModal(false); fetchData() }}
        />
      )}

      {showSettlement && (
        <SettlementModal
          expenses={expenses}
          members={members}
          currencies={currencies}
          onClose={() => setShowSettlement(false)}
        />
      )}
    </div>
  )
}
