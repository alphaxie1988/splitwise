'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Calculator, Copy, LogIn, LogOut, Pencil, Trash2, ArrowLeft, CheckCircle, QrCode, Users, RotateCcw } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import type { Expense, SessionData } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'
import ExpenseModal from '@/components/ExpenseModal'
import SettlementModal from '@/components/SettlementModal'
import AuditLogSection from '@/components/AuditLogSection'
import PasscodeModal from '@/components/PasscodeModal'
import QRModal from '@/components/QRModal'

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
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
  const [exitingId, setExitingId] = useState<string | null>(null)
  const [auditKey, setAuditKey] = useState(0)
  const [editingRateId, setEditingRateId] = useState<string | null>(null)
  const [rateInput, setRateInput] = useState('')
  const [savingRate, setSavingRate] = useState(false)
  const [locked, setLocked] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [settlingSession, setSettlingSession] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${id}?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Session not found')
      const json = await res.json()
      setData(json)

      // Check passcode
      if (json.session.has_passcode && !localStorage.getItem(`unlockedSession_${id}`)) {
        setLocked(true)
        setLoading(false)
        return
      }

      // Remember session
      const entry = {
        id, name: json.session.name,
        members: json.members.map((m: { name: string }) => m.name),
        lastVisited: new Date().toISOString(),
      }
      const stored = JSON.parse(localStorage.getItem('recentSessions') ?? '[]')
      localStorage.setItem('recentSessions', JSON.stringify(
        [entry, ...stored.filter((s: { id: string }) => s.id !== id)].slice(0, 20)
      ))
      fetch('/api/user/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: id }),
      }).catch(() => {})
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
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/session/${id}` },
    })
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteExpense = async (expenseId: string) => {
    setExitingId(expenseId)
    setDeleteId(expenseId)
    await new Promise(r => setTimeout(r, 250))
    const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' })
    setDeleteId(null); setExitingId(null)
    if (res.ok) { fetchData(); setAuditKey(k => k + 1) }
  }

  const handleSaveRate = async (currencyId: string) => {
    setSavingRate(true)
    const res = await fetch(`/api/sessions/${id}/currencies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency_id: currencyId, rate_to_sgd: rateInput }),
    })
    setSavingRate(false)
    if (res.ok) { setEditingRateId(null); fetchData(); setAuditKey(k => k + 1) }
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSavingName(true)
    const res = await fetch(`/api/sessions/${id}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput }),
    })
    setSavingName(false)
    if (res.ok) { setEditingName(false); fetchData(); setAuditKey(k => k + 1) }
  }

  const handleToggleSettle = async () => {
    if (!data) return
    setSettlingSession(true)
    const method = data.session.is_settled ? 'DELETE' : 'POST'
    const res = await fetch(`/api/sessions/${id}/settle`, { method })
    setSettlingSession(false)
    if (res.ok) { fetchData(); setAuditKey(k => k + 1) }
  }

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return
    setAddingMember(true)
    const res = await fetch(`/api/sessions/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName }),
    })
    setAddingMember(false)
    if (res.ok) { setNewMemberName(''); fetchData() }
  }

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMemberId(memberId)
    const res = await fetch(`/api/sessions/${id}/members/${memberId}`, { method: 'DELETE' })
    setRemovingMemberId(null)
    if (res.ok) fetchData()
    else {
      const data = await res.json()
      alert(data.error ?? 'Could not remove member.')
    }
  }

  const openAdd = () => { setEditingExpense(null); setShowExpenseModal(true) }
  const openEdit = (expense: Expense) => { setEditingExpense(expense); setShowExpenseModal(true) }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading session…</p>
      </div>
    )
  }

  if (locked && data) {
    return <PasscodeModal sessionId={id} onUnlocked={() => { setLocked(false); setLoading(true); fetchData() }} />
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

  const { session, members, currencies, expenses, confirmedSettlements } = data

  const rateFor = (code: string) => {
    if (code === 'SGD') return 1
    return currencies.find(c => c.currency_code === code)?.rate_to_sgd ?? 1
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Settled banner */}
      {session.is_settled && (
        <div className="bg-green-600 text-white text-center text-sm py-2 flex items-center justify-center gap-2">
          <CheckCircle size={15} /> This session is marked as settled
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button onClick={() => router.push('/')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-1 transition">
                <ArrowLeft size={12} /> Home
              </button>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="text-xl font-bold border-b-2 border-blue-500 bg-transparent focus:outline-none" />
                  <button onClick={handleSaveName} disabled={savingName}
                    className="text-xs text-blue-600 font-medium disabled:opacity-50">
                    {savingName ? '…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingName(false)} className="text-xs text-gray-400">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-bold truncate">{session.name}</h1>
                  {user && (
                    <button onClick={() => { setNameInput(session.name); setEditingName(true) }}
                      className="text-gray-400 hover:text-blue-500 shrink-0">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm text-gray-500 truncate">
                {members.map(m => m.name).join(' · ')}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleCopyLink}
                className="flex items-center gap-1 text-xs text-gray-600 border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition">
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button onClick={() => setShowQR(true)}
                className="flex items-center gap-1 text-xs text-gray-600 border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition">
                <QrCode size={12} />
              </button>
              {user ? (
                <button onClick={() => supabase.auth.signOut()}
                  className="flex items-center gap-1 text-xs text-gray-600 border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition"
                  title={user.email ?? ''}>
                  <LogOut size={12} /> Sign Out
                </button>
              ) : (
                <button onClick={handleSignIn} disabled={authLoading}
                  className="flex items-center gap-1 text-xs text-white bg-blue-600 rounded-lg px-2.5 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition">
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
                      <input autoFocus type="number" step="any" min="0.000001" value={rateInput}
                        onChange={e => setRateInput(e.target.value)}
                        className="w-16 border rounded px-1 py-0 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveRate(c.id); if (e.key === 'Escape') setEditingRateId(null) }} />
                      <button onClick={() => handleSaveRate(c.id)} disabled={savingRate}
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50">
                        {savingRate ? '…' : 'Save'}
                      </button>
                      <button onClick={() => setEditingRateId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </>
                  ) : (
                    <>
                      {c.rate_to_sgd} SGD
                      {user && (
                        <button onClick={() => { setEditingRateId(c.id); setRateInput(c.rate_to_sgd.toString()) }}
                          className="ml-1 text-gray-400 hover:text-blue-500" title="Edit rate">
                          <Pencil size={10} />
                        </button>
                      )}
                    </>
                  )}
                </span>
              ))}
            </div>
          )}

          {user && <p className="text-xs text-green-600 mt-1">Editing as {user.email}</p>}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* Actions bar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Expenses ({expenses.length})
          </h2>
          <div className="flex gap-2">
            {user && (
              <button onClick={handleToggleSettle} disabled={settlingSession}
                className={`flex items-center gap-1 text-sm border rounded-lg px-3 py-1.5 transition disabled:opacity-50 ${session.is_settled ? 'border-green-400 text-green-700 hover:bg-green-50' : 'hover:bg-white'}`}>
                {session.is_settled ? <><RotateCcw size={13} /> Reopen</> : <><CheckCircle size={13} /> Mark Settled</>}
              </button>
            )}
            <button onClick={() => setShowSettlement(true)} disabled={expenses.length === 0}
              className="flex items-center gap-1 text-sm border rounded-lg px-3 py-1.5 hover:bg-white transition disabled:opacity-40">
              <Calculator size={14} /> Settle Up
            </button>
            {user && !session.is_settled && (
              <button onClick={openAdd}
                className="flex items-center gap-1 text-sm text-white bg-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-700 transition">
                <Plus size={14} /> Add Expense
              </button>
            )}
          </div>
        </div>

        {/* Expense list grouped by day */}
        {expenses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base">No expenses yet.</p>
            {!user && (
              <button onClick={handleSignIn} className="mt-2 text-sm text-blue-500 hover:underline">
                Sign in to add the first expense
              </button>
            )}
          </div>
        ) : (() => {
          // Group by expense_date, sort days descending
          const groups: Record<string, typeof expenses> = {}
          for (const e of expenses) {
            const day = e.expense_date ?? e.created_at.split('T')[0]
            if (!groups[day]) groups[day] = []
            groups[day].push(e)
          }
          const sortedDays = Object.keys(groups).sort((a, b) => b.localeCompare(a))

          function formatDay(dateStr: string) {
            const d = new Date(dateStr + 'T00:00:00')
            const today = new Date(); today.setHours(0,0,0,0)
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
            if (d.getTime() === today.getTime()) return 'Today'
            if (d.getTime() === yesterday.getTime()) return 'Yesterday'
            return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
          }

          return (
            <div className="space-y-6">
              {sortedDays.map(day => {
                const dayTotal = groups[day].reduce((sum, e) => sum + e.amount * rateFor(e.currency_code), 0)
                return (
                  <div key={day}>
                    {/* Day header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{formatDay(day)}</span>
                      <span className="text-xs text-gray-400 tabular-nums">{dayTotal.toFixed(2)} SGD</span>
                    </div>
                    <div className="space-y-2">
                      {groups[day].map(expense => {
                        const splitNames = expense.splits?.map(s => s.member?.name ?? '').filter(Boolean).join(', ')
                        const amountSGD = expense.amount * rateFor(expense.currency_code)
                        const categoryEmoji = CATEGORIES.find(c => c.id === expense.category)?.emoji ?? '📦'
                        return (
                          <div key={expense.id}
                            className={`bg-white border rounded-lg p-4 ${exitingId === expense.id ? 'expense-exit' : 'expense-enter'}`}>
                            <div className="flex items-start gap-3">
                              <div className="text-2xl leading-none pt-0.5 shrink-0">{categoryEmoji}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{expense.description}</p>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                  <span className="text-sm font-semibold text-gray-800">
                                    {expense.amount.toFixed(2)} {expense.currency_code}
                                  </span>
                                  {expense.currency_code !== 'SGD' && (
                                    <span className="text-xs text-gray-400">≈ {amountSGD.toFixed(2)} SGD</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Paid by <span className="font-medium">{expense.paid_by?.name}</span>
                                  {splitNames && <> &middot; Split: {splitNames}</>}
                                </p>
                                {expense.notes && (
                                  <p className="text-xs text-gray-400 mt-0.5 italic">"{expense.notes}"</p>
                                )}
                              </div>
                              {user && !session.is_settled && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => openEdit(expense)}
                                    className="text-gray-400 hover:text-blue-600 p-1 rounded transition" title="Edit">
                                    <Pencil size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteExpense(expense.id)} disabled={deleteId === expense.id}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded transition disabled:opacity-40" title="Delete">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Member management (logged-in only) */}
        {user && (
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Users size={12} /> Members
            </h3>
            <div className="bg-white border rounded-lg divide-y">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-700">{m.name}</span>
                  <button onClick={() => handleRemoveMember(m.id)} disabled={removingMemberId === m.id}
                    className="text-gray-300 hover:text-red-400 disabled:opacity-40 transition" title="Remove member">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 px-4 py-2.5">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddMember() }}
                  placeholder="New member name…"
                  className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleAddMember} disabled={addingMember || !newMemberName.trim()}
                  className="flex items-center gap-1 text-sm text-white bg-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition">
                  <Plus size={13} /> {addingMember ? '…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit log */}
        <div className="mt-8">
          <AuditLogSection sessionId={id} refreshKey={auditKey} />
        </div>
      </main>

      {/* Modals */}
      {showExpenseModal && (
        <ExpenseModal sessionId={id} members={members} currencies={currencies} expense={editingExpense}
          onClose={() => setShowExpenseModal(false)}
          onSaved={() => { setShowExpenseModal(false); fetchData(); setAuditKey(k => k + 1) }} />
      )}

      {showSettlement && (
        <SettlementModal
          sessionId={id} expenses={expenses} members={members} currencies={currencies}
          confirmedSettlements={confirmedSettlements} user={user}
          onClose={() => setShowSettlement(false)}
          onSettlementChange={() => { fetchData(); setAuditKey(k => k + 1) }} />
      )}

      {showQR && (
        <QRModal url={typeof window !== 'undefined' ? window.location.href : ''} onClose={() => setShowQR(false)} />
      )}
    </div>
  )
}
