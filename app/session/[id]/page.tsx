'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Calculator, LogIn, LogOut, Pencil, Trash2, ArrowLeft, CheckCircle, Share2, Users, RotateCcw, Download, Search, X as XIcon } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import type { Expense, SessionData } from '@/lib/types'
import { CATEGORIES, formatAmount } from '@/lib/types'
import { calculateSettlement } from '@/lib/settlement'
import ExpenseModal from '@/components/ExpenseModal'
import SettlementModal from '@/components/SettlementModal'
import AuditLogSection from '@/components/AuditLogSection'
import PasscodeModal from '@/components/PasscodeModal'
import ShareModal from '@/components/ShareModal'
import SessionSkeleton from '@/components/SessionSkeleton'
import UndoToast from '@/components/UndoToast'
import ThemeToggle from '@/components/ThemeToggle'
import { detectCity, fetchCityImage } from '@/lib/city-images'

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
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [settlingSession, setSettlingSession] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  const [showPaidWarning, setShowPaidWarning] = useState(false)
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null)

  // Undo delete state
  const [pendingDelete, setPendingDelete] = useState<{ expense: Expense; index: number } | null>(null)

  // City wallpaper
  const [headerImage, setHeaderImage] = useState<string | null>(null)

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
      // Remove stale session from localStorage if it no longer exists
      const stored = JSON.parse(localStorage.getItem('recentSessions') ?? '[]')
      localStorage.setItem('recentSessions', JSON.stringify(
        stored.filter((s: { id: string }) => s.id !== id)
      ))
      localStorage.removeItem(`unlockedSession_${id}`)
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

  const effectiveName = editingName ? nameInput : (data?.session.name ?? '')

  useEffect(() => {
    if (!effectiveName) return
    const city = detectCity(effectiveName)
    if (!city) { setHeaderImage(null); return }
    const cacheKey = `city-img-${city.toLowerCase()}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { setHeaderImage(cached); return }
    fetchCityImage(city).then(url => {
      setHeaderImage(url)
    })
  }, [effectiveName])

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
      setRemoveMemberError(json.error ?? 'Could not remove member.')
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
      <div className="min-h-screen dot-grid-bg bg-gray-50 dark:bg-[#111111] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-sm p-10 text-center max-w-sm w-full">
          <img src="/icon.svg" alt="Splitwise" className="w-12 h-12 rounded-xl mx-auto mb-5 opacity-30 dark:opacity-20" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Session not found</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-7 leading-relaxed">
            {error && error !== 'Session not found.'
              ? error
              : 'This session may have been deleted or the link is invalid.'}
          </p>
          <a href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-500/20">
            <ArrowLeft size={14} /> Back to Home
          </a>
        </div>
      </div>
    )
  }

  const { session, members, currencies, expenses, confirmedSettlements } = data

  const { settlements: requiredSettlements } = calculateSettlement(expenses, members, currencies)
  const allSettlementsConfirmed = requiredSettlements.every(s =>
    confirmedSettlements.some(c => c.from_member_id === s.from.id && c.to_member_id === s.to.id)
  )

  const visibleExpenses = expenses.filter(e => {
    if (filterMemberId && e.paid_by_member_id !== filterMemberId && !e.splits?.some(s => s.member_id === filterMemberId)) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!e.description.toLowerCase().includes(q) && !(e.notes ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

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
    <div className="min-h-screen dot-grid-bg bg-gray-50 dark:bg-[#111111]">
      {/* Sticky top: settled banner + header */}
      <div className="sticky top-0 z-10">
      {session.is_settled && (
        <div className="bg-green-600 text-white text-center text-sm py-2 flex items-center justify-center gap-2">
          <CheckCircle size={15} /> This session is marked as settled
        </div>
      )}

      {/* Header */}
      <header
        className="relative border-b dark:border-gray-700 transition-all duration-500"
        style={headerImage ? {
          backgroundImage: `url(${headerImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {/* Overlay when city photo is active — white-wash in light mode, dark in dark mode */}
        {headerImage && (
          <div className="absolute inset-0 bg-white/70 dark:bg-black/70 pointer-events-none" />
        )}

        <div className={`relative z-10 max-w-2xl mx-auto px-4 py-4 ${!headerImage ? 'bg-white dark:bg-gray-800' : ''}`}>
          {/* Row 1: back + buttons */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <button onClick={() => router.push('/')}
              className={`flex items-center gap-1 text-xs transition ${headerImage ? 'text-gray-600 hover:text-gray-900 dark:text-white/80 dark:hover:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              <ArrowLeft size={12} /> Home
            </button>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <ThemeToggle className={headerImage ? 'text-gray-600 border-gray-300 bg-gray-100 hover:bg-gray-200 dark:text-white dark:border-white/40 dark:bg-white/10 dark:hover:bg-white/20' : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/50 dark:hover:bg-gray-700'} />
                <button onClick={() => setShowShare(true)}
                  className={`flex items-center gap-1 text-xs rounded-lg px-2.5 py-1.5 transition border ${headerImage ? 'text-gray-600 border-gray-300 bg-gray-100 hover:bg-gray-200 dark:text-white dark:border-white/40 dark:bg-white/10 dark:hover:bg-white/20' : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/50 dark:hover:bg-gray-700'}`}>
                  <Share2 size={12} />
                  <span className="hidden sm:inline">Share</span>
                </button>
                <button onClick={handleExportCSV} disabled={expenses.length === 0}
                  className={`flex items-center gap-1 text-xs rounded-lg px-2.5 py-1.5 transition border disabled:opacity-40 ${headerImage ? 'text-gray-600 border-gray-300 bg-gray-100 hover:bg-gray-200 dark:text-white dark:border-white/40 dark:bg-white/10 dark:hover:bg-white/20' : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/50 dark:hover:bg-gray-700'}`}
                  title="Export to CSV">
                  <Download size={12} />
                </button>
                {user ? (
                  <button onClick={() => supabase.auth.signOut()}
                    className={`flex items-center gap-1 text-xs rounded-lg px-2.5 py-1.5 transition border ${headerImage ? 'text-gray-600 border-gray-300 bg-gray-100 hover:bg-gray-200 dark:text-white dark:border-white/40 dark:bg-white/10 dark:hover:bg-white/20' : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/50 dark:hover:bg-gray-700'}`}
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
              {user && (
                <span className={`text-xs px-2 py-0.5 rounded ${headerImage ? 'bg-white/50 text-gray-600 dark:bg-black/30 dark:text-gray-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  Editing as {user.email}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: session name (full width) */}
          {editingName ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                className="text-xl font-bold border-b-2 border-blue-400 bg-transparent text-gray-900 dark:text-white focus:outline-none flex-1 min-w-0" />
              <button onClick={handleSaveName} disabled={savingName}
                className="text-xs text-blue-300 font-medium disabled:opacity-50 shrink-0">
                {savingName ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditingName(false)} className={`text-xs shrink-0 ${headerImage ? 'text-gray-500 dark:text-white/60' : 'text-gray-500'}`}>Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <h1 className={`text-xl font-bold ${headerImage ? 'text-gray-900 drop-shadow dark:text-white' : 'dark:text-gray-100'}`}>{session.name}</h1>
              {user && (
                <button onClick={() => { setNameInput(session.name); setEditingName(true) }}
                  className={`shrink-0 ${headerImage ? 'text-gray-500 hover:text-gray-800 dark:text-white/60 dark:hover:text-white' : 'text-gray-500 hover:text-blue-500'}`}>
                  <Pencil size={13} />
                </button>
              )}
            </div>
          )}

          {/* Row 3: member filter pills */}
          <div className="flex flex-wrap gap-1.5 mt-1 w-full">
            {members.length > 1 && (
              <button
                onClick={() => setFilterMemberId(null)}
                className={`text-xs px-2.5 py-0.5 rounded-full border transition ${
                  !filterMemberId
                    ? 'bg-blue-600 text-white border-blue-600'
                    : headerImage
                      ? 'border-gray-400 text-gray-700 bg-gray-100 hover:bg-gray-200 hover:border-gray-500 dark:border-white/40 dark:text-white/80 dark:bg-white/10 dark:hover:bg-white/20 dark:hover:border-white/70'
                      : 'border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-400 bg-gray-100 hover:bg-gray-200 hover:border-gray-500 dark:bg-gray-700/50 dark:hover:border-gray-500'
                }`}>
                All
              </button>
            )}
            {members.map(m => (
              <button key={m.id}
                onClick={() => setFilterMemberId(prev => prev === m.id ? null : m.id)}
                className={`text-xs px-2.5 py-0.5 rounded-full border transition ${
                  filterMemberId === m.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : headerImage
                      ? 'border-gray-400 text-gray-700 bg-gray-100 hover:bg-gray-200 hover:border-gray-500 dark:border-white/40 dark:text-white/80 dark:bg-white/10 dark:hover:bg-white/20 dark:hover:border-white/70'
                      : 'border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-400 bg-gray-100 hover:bg-gray-200 hover:border-gray-500 dark:bg-gray-700/50 dark:hover:border-gray-500'
                }`}>
                {m.name}
              </button>
            ))}
          </div>

          {/* Exchange rates strip */}
          {currencies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currencies.map(c => (
                <span key={c.id} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${headerImage ? 'bg-white/50 text-gray-700 dark:bg-black/30 dark:text-white/80' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
                  1 {c.currency_code} =&nbsp;
                  {editingRateId === c.id ? (
                    <>
                      <input autoFocus type="number" step="any" min="0.000001" value={rateInput}
                        onChange={e => setRateInput(e.target.value)}
                        className="w-16 border dark:border-gray-600 rounded px-1 py-0 text-xs bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveRate(c.id); if (e.key === 'Escape') setEditingRateId(null) }} />
                      <button onClick={() => handleSaveRate(c.id)} disabled={savingRate}
                        className="text-blue-400 hover:text-blue-300 font-medium disabled:opacity-50">
                        {savingRate ? '…' : 'Save'}
                      </button>
                      <button onClick={() => setEditingRateId(null)} className="text-gray-500 hover:text-gray-800 dark:text-white/60 dark:hover:text-white">✕</button>
                    </>
                  ) : (
                    <>
                      {c.rate_to_sgd} SGD
                      {user && (
                        <button onClick={() => {
                          if (confirmedSettlements.length > 0) { setShowPaidWarning(true); return }
                          setEditingRateId(c.id); setRateInput(c.rate_to_sgd.toString())
                        }}
                          className={`ml-1 ${headerImage ? 'text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white' : 'text-gray-500 hover:text-blue-500'}`} title="Edit rate">
                          <Pencil size={10} />
                        </button>
                      )}
                    </>
                  )}
                </span>
              ))}
            </div>
          )}

        </div>
      </header>
      </div>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* Actions bar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Expenses ({(filterMemberId || searchQuery) ? `${visibleExpenses.length} of ${expenses.length}` : expenses.length})
          </h2>
          <div className="flex gap-2">
            {user && (session.is_settled || (allSettlementsConfirmed && expenses.length > 0)) && (
              <button onClick={handleToggleSettle} disabled={settlingSession}
                className={`flex items-center gap-1 text-sm border dark:border-gray-600 rounded-lg px-3 py-1.5 transition disabled:opacity-50 ${session.is_settled ? 'border-green-400 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'}`}>
                {session.is_settled ? <><RotateCcw size={13} /> Reopen</> : <><CheckCircle size={13} /> Mark Settled</>}
              </button>
            )}
            {expenses.length > 0 && (
              <button onClick={() => setShowSettlement(true)}
                className="flex items-center gap-1 text-sm border dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 hover:bg-white dark:hover:bg-gray-700 transition">
                <Calculator size={14} /> Summary
              </button>
            )}
            {user && !session.is_settled && (
              <button
                onClick={() => {
                  if (confirmedSettlements.length > 0) {
                    setShowPaidWarning(true)
                    return
                  }
                  openAdd()
                }}
                className="flex items-center gap-1 text-sm text-white bg-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-700 transition">
                <Plus size={14} /> Add Expense
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {expenses.length > 0 && (
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search expenses…"
              className="w-full border dark:border-gray-600 rounded-lg pl-8 pr-8 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <XIcon size={14} />
              </button>
            )}
          </div>
        )}

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
          if (visibleExpenses.length === 0) return (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">
              {searchQuery ? `No expenses matching "${searchQuery}".` : `No expenses for ${members.find(m => m.id === filterMemberId)?.name}.`}
            </p>
          )
          const groups: Record<string, typeof visibleExpenses> = {}
          for (const e of visibleExpenses) {
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
                                    {formatAmount(expense.amount, expense.currency_code)} {expense.currency_code}
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
              {!session.is_settled && (
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
              )}
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
          confirmedSettlements={confirmedSettlements} user={user} isSettled={session.is_settled}
          onClose={() => setShowSettlement(false)}
          onSettlementChange={() => { fetchData(); setAuditKey(k => k + 1) }} />
      )}

      {showShare && (
        <ShareModal url={typeof window !== 'undefined' ? window.location.href : ''} onClose={() => setShowShare(false)} />
      )}

      {showPaidWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Action Not Allowed</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              One or more payments have already been marked as paid. Uncheck them in the Summary first.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPaidWarning(false); setShowSettlement(true) }}
                className="flex-1 text-sm bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition">
                Open Summary
              </button>
              <button
                onClick={() => setShowPaidWarning(false)}
                className="flex-1 text-sm border dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {removeMemberError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Cannot Remove Member</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">{removeMemberError}</p>
            <button
              onClick={() => setRemoveMemberError(null)}
              className="w-full text-sm border dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Dismiss
            </button>
          </div>
        </div>
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
