'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Calculator, LogIn, LogOut, Pencil, Trash2, ArrowLeft, CheckCircle, Share2, Users, RotateCcw, Download } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import type { Expense, SessionData } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'
import ExpenseModal from '@/components/ExpenseModal'
import SettlementModal from '@/components/SettlementModal'
import AuditLogSection from '@/components/AuditLogSection'
import PasscodeModal from '@/components/PasscodeModal'
import ShareModal from '@/components/ShareModal'
import SessionSkeleton from '@/components/SessionSkeleton'
import UndoToast from '@/components/UndoToast'
import ThemeToggle from '@/components/ThemeToggle'

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
  const [showShare, setShowShare] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [exitingId, setExitingId] = useState<string | null>(null)
  const [auditKey, setAuditKey] = useState(0)
  const [editingRateId, setEditingRateId] = useState<string | null>(null)
  const [rateInput, setRateInput] = useState('')
  const [savingRate, setSavingRate] = useState(false)
  const [locked, setLocked] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [settlingSession, setSettlingSession] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  // Undo delete state
  const [pendingDelete, setPendingDelete] = useState<{ expense: Expense; index: number } | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${id}?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Session not found')
      const json = await res.json()
      setData(json)

      if (json.session.has_passcode && !localStorage.getItem(`unlockedSession_${id}`)) {
        setLocked(true)
        setLoading(false)
        return
      }

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

  const handleDeleteExpense = async (expenseId: string) => {
    setExitingId(expenseId)
    setDeleteId(expenseId)
    await new Promise(r => setTimeout(r, 250))

    // Snapshot the expense and its position before removing
    const idx = (data?.expenses ?? []).findIndex(e => e.id === expenseId)
    const expense = data?.expenses[idx]
    if (!expense) { setDeleteId(null); setExitingId(null); return }

    // Optimistically remove
    setData(d => d ? { ...d, expenses: d.expenses.filter(e => e.id !== expenseId) } : d)
    setDeleteId(null); setExitingId(null)

    // Commit the previous pending delete (if any) before showing new toast
    if (pendingDelete) {
      await fetch(`/api/expenses/${pendingDelete.expense.id}`, { method: 'DELETE' })
    }

    // Show undo toast — actual delete is handled by onExpire in UndoToast
    setPendingDelete({ expense, index: idx })
  }

  const handleUndoDelete = () => {
    if (pendingDelete) {
      setData(d => {
        if (!d) return d
        const expenses = [...d.expenses]
        expenses.splice(pendingDelete.index, 0, pendingDelete.expense)
        return { ...d, expenses }
      })
      setPendingDelete(null)
    }
  }

  const handleSaveRate = async (currencyId: string) => {
    const rate = parseFloat(rateInput)
    if (isNaN(rate) || rate <= 0) return
    const snapshot = data
    setData(d => d ? { ...d, currencies: d.currencies.map(c => c.id === currencyId ? { ...c, rate_to_sgd: rate } : c) } : d)
    setEditingRateId(null)
    setSavingRate(true)
    const res = await fetch(`/api/sessions/${id}/currencies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency_id: currencyId, rate_to_sgd: rateInput }),
    })
    setSavingRate(false)
    if (res.ok) { setAuditKey(k => k + 1) }
    else { setData(snapshot); setEditingRateId(currencyId) }
  }

  const handleSaveName = async () => {
    const newName = nameInput.trim()
    if (!newName) return
    const snapshot = data
    setData(d => d ? { ...d, session: { ...d.session, name: newName } } : d)
    setEditingName(false)
    setSavingName(true)
    const res = await fetch(`/api/sessions/${id}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    setSavingName(false)
    if (res.ok) { setAuditKey(k => k + 1) }
    else { setData(snapshot); setEditingName(true) }
  }

  const handleToggleSettle = async () => {
    if (!data) return
    const wasSettled = data.session.is_settled
    setData(d => d ? { ...d, session: { ...d.session, is_settled: !wasSettled } } : d)
    setSettlingSession(true)
    const res = await fetch(`/api/sessions/${id}/settle`, { method: wasSettled ? 'DELETE' : 'POST' })
    setSettlingSession(false)
    if (res.ok) { setAuditKey(k => k + 1) }
    else { setData(d => d ? { ...d, session: { ...d.session, is_settled: wasSettled } } : d) }
  }

  const handleAddMember = async () => {
    const name = newMemberName.trim()
    if (!name) return
    const tempId = `temp-${Date.now()}`
    setData(d => d ? { ...d, members: [...d.members, { id: tempId, session_id: id, name, created_at: new Date().toISOString() }] } : d)
    setNewMemberName('')
    setAddingMember(true)
    const res = await fetch(`/api/sessions/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setAddingMember(false)
    if (res.ok) {
      const json = await res.json()
      setData(d => d ? { ...d, members: d.members.map(m => m.id === tempId ? json.member : m) } : d)
    } else {
      setData(d => d ? { ...d, members: d.members.filter(m => m.id !== tempId) } : d)
      setNewMemberName(name)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    const snapshot = data
    setData(d => d ? { ...d, members: d.members.filter(m => m.id !== memberId) } : d)
    setRemovingMemberId(memberId)
    const res = await fetch(`/api/sessions/${id}/members/${memberId}`, { method: 'DELETE' })
    setRemovingMemberId(null)
    if (!res.ok) {
      setData(snapshot)
      const json = await res.json()
      alert(json.error ?? 'Could not remove member.')
    }
  }

  const openAdd = () => { setEditingExpense(null); setShowExpenseModal(true) }
  const openEdit = (expense: Expense) => { setEditingExpense(expense); setShowExpenseModal(true) }

  if (loading) return <SessionSkeleton />

  if (locked && data) {
    return <PasscodeModal sessionId={id} onUnlocked={() => { setLocked(false); setLoading(true); fetchData() }} />
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <img src="/icon.svg" alt="Splitwise" className="w-16 h-16 rounded-2xl shadow-md opacity-40" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Session not found</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            {error && error !== 'Session not found.'
              ? error
              : "This session may have been deleted or the link is invalid."}
          </p>
          <a href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition">
            <ArrowLeft size={14} /> Back to Home
          </a>
        </div>
      </div>
    )
  }

  const { session, members, currencies, expenses, confirmedSettlements } = data

  const rateFor = (code: string) => {
    if (code === 'SGD') return 1
    return currencies.find(c => c.currency_code === code)?.rate_to_sgd ?? 1
  }

  const handleExportCSV = () => {
    const escapeCell = (val: string | number) => {
      const str = String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }

    const headers = ['Date', 'Description', 'Category', 'Cost', 'Currency', 'Cost in SGD', ...members.map(m => m.name)]
    const memberTotals = new Array(members.length).fill(0)
    let totalCostSGD = 0

    const dataRows = expenses.map(expense => {
      const amountSGD = expense.amount * rateFor(expense.currency_code)
      const splitIds = new Set(expense.splits?.map(s => s.member_id) ?? members.map(m => m.id))
      const splitCount = splitIds.size
      const sharePerPerson = splitCount > 0 ? amountSGD / splitCount : 0
      totalCostSGD += amountSGD

      const memberValues = members.map((m, i) => {
        const paid = expense.paid_by_member_id === m.id
        const inSplit = splitIds.has(m.id)
        let val = 0
        if (paid) val += amountSGD
        if (inSplit) val -= sharePerPerson
        memberTotals[i] += val
        return val !== 0 ? val : ''
      })

      return [
        expense.expense_date ?? expense.created_at.split('T')[0],
        expense.description,
        CATEGORIES.find(c => c.id === expense.category)?.label ?? expense.category,
        expense.amount,
        expense.currency_code,
        amountSGD,
        ...memberValues,
      ]
    })

    const totalRow = ['Total', '', '', '', '', totalCostSGD, ...memberTotals]

    const csv = [headers, ...dataRows, totalRow]
      .map(row => row.map(escapeCell).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.name.replace(/[^a-z0-9]/gi, '_')}_expenses.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Settled banner */}
      {session.is_settled && (
        <div className="bg-green-600 text-white text-center text-sm py-2 flex items-center justify-center gap-2">
          <CheckCircle size={15} /> This session is marked as settled
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Row 1: back + buttons */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <button onClick={() => router.push('/')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
              <ArrowLeft size={12} /> Home
            </button>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button onClick={() => setShowShare(true)}
                className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 border dark:border-gray-600 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <Share2 size={12} />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button onClick={handleExportCSV} disabled={expenses.length === 0}
                className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 border dark:border-gray-600 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40"
                title="Export to CSV">
                <Download size={12} />
              </button>
              {user ? (
                <button onClick={() => supabase.auth.signOut()}
                  className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 border dark:border-gray-600 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  title={user.email ?? ''}>
                  <LogOut size={12} /> <span className="hidden sm:inline">Sign Out</span>
                </button>
              ) : (
                <button onClick={handleSignIn} disabled={authLoading}
                  className="flex items-center gap-1 text-xs text-white bg-blue-600 rounded-lg px-2.5 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition">
                  <LogIn size={12} />
                  <span>Sign In to Edit</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: session name (full width) */}
          {editingName ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                className="text-xl font-bold border-b-2 border-blue-500 bg-transparent dark:text-gray-100 focus:outline-none flex-1 min-w-0" />
              <button onClick={handleSaveName} disabled={savingName}
                className="text-xs text-blue-600 font-medium disabled:opacity-50 shrink-0">
                {savingName ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditingName(false)} className="text-xs text-gray-400 shrink-0">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold dark:text-gray-100">{session.name}</h1>
              {user && (
                <button onClick={() => { setNameInput(session.name); setEditingName(true) }}
                  className="text-gray-400 hover:text-blue-500 shrink-0">
                  <Pencil size={13} />
                </button>
              )}
            </div>
          )}

          {/* Row 3: members full width */}
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug mt-0.5 w-full">
            {members.map(m => m.name).join(' · ')}
          </p>

          {/* Exchange rates strip */}
          {currencies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currencies.map(c => (
                <span key={c.id} className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded">
                  1 {c.currency_code} =&nbsp;
                  {editingRateId === c.id ? (
                    <>
                      <input autoFocus type="number" step="any" min="0.000001" value={rateInput}
                        onChange={e => setRateInput(e.target.value)}
                        className="w-16 border dark:border-gray-600 rounded px-1 py-0 text-xs bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
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
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Expenses ({expenses.length})
          </h2>
          <div className="flex gap-2">
            {user && (
              <button onClick={handleToggleSettle} disabled={settlingSession}
                className={`flex items-center gap-1 text-sm border dark:border-gray-600 rounded-lg px-3 py-1.5 transition disabled:opacity-50 ${session.is_settled ? 'border-green-400 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'}`}>
                {session.is_settled ? <><RotateCcw size={13} /> Reopen</> : <><CheckCircle size={13} /> Mark Settled</>}
              </button>
            )}
            <button onClick={() => setShowSettlement(true)} disabled={expenses.length === 0}
              className="flex items-center gap-1 text-sm border dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 hover:bg-white dark:hover:bg-gray-700 transition disabled:opacity-40">
              <Calculator size={14} /> Summary
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
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{formatDay(day)}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{dayTotal.toFixed(2)} SGD</span>
                    </div>
                    <div className="space-y-2">
                      {groups[day].map(expense => {
                        const splitIds = expense.splits?.map(s => s.member_id) ?? []
                        const splitAll = splitIds.length === members.length && members.every(m => splitIds.includes(m.id))
                        const splitNames = splitAll ? 'All' : expense.splits?.map(s => s.member?.name ?? '').filter(Boolean).join(', ')
                        const amountSGD = expense.amount * rateFor(expense.currency_code)
                        const categoryEmoji = CATEGORIES.find(c => c.id === expense.category)?.emoji ?? '📦'
                        return (
                          <div key={expense.id}
                            className={`bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4 ${exitingId === expense.id ? 'expense-exit' : 'expense-enter'}`}>
                            <div className="flex items-start gap-3">
                              <div className="text-2xl leading-none pt-0.5 shrink-0">{categoryEmoji}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{expense.description}</p>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    {expense.amount.toFixed(2)} {expense.currency_code}
                                  </span>
                                  {expense.currency_code !== 'SGD' && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">≈ {amountSGD.toFixed(2)} SGD</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {expense.category === 'transfer' ? (
                                    <>Paid by <span className="font-medium">{expense.paid_by?.name}</span> → <span className="font-medium">{splitNames}</span></>
                                  ) : (
                                    <>Paid by <span className="font-medium">{expense.paid_by?.name}</span>{splitNames && <> &middot; Split: {splitNames}</>}</>
                                  )}
                                </p>
                                {expense.notes && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">"{expense.notes}"</p>
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

        {/* Member management */}
        {user && (
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Users size={12} /> Members
            </h3>
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{m.name}</span>
                  <button onClick={() => handleRemoveMember(m.id)} disabled={removingMemberId === m.id}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-400 disabled:opacity-40 transition" title="Remove member">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 px-4 py-2.5">
                <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddMember() }}
                  placeholder="New member name…"
                  className="flex-1 text-sm border dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

      {showShare && (
        <ShareModal url={typeof window !== 'undefined' ? window.location.href : ''} onClose={() => setShowShare(false)} />
      )}

      {/* Undo delete toast */}
      {pendingDelete && (
        <UndoToast
          key={pendingDelete.expense.id}
          message={`"${pendingDelete.expense.description}" deleted`}
          onUndo={handleUndoDelete}
          onExpire={async () => {
            setPendingDelete(null)
            await fetch(`/api/expenses/${pendingDelete.expense.id}`, { method: 'DELETE' })
            setAuditKey(k => k + 1)
          }}
        />
      )}
    </div>
  )
}
