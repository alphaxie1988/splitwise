'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Expense, SessionMember, SessionCurrency, CategoryId } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'

interface Props {
  sessionId: string
  members: SessionMember[]
  currencies: SessionCurrency[]
  expense: Expense | null
  onClose: () => void
  onSaved: () => void
}

const INPUT = 'w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function ExpenseModal({ sessionId, members, currencies, expense, onClose, onSaved }: Props) {
  const [description, setDescription] = useState(expense?.description ?? '')
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '')
  const [currency, setCurrency] = useState(() => {
    if (expense?.currency_code) return expense.currency_code
    try {
      const recent: string[] = JSON.parse(localStorage.getItem('recentCurrencies') ?? '[]')
      const available = ['SGD', ...currencies.map(c => c.currency_code)]
      return recent.find(c => available.includes(c)) ?? 'SGD'
    } catch { return 'SGD' }
  })
  const [category, setCategory] = useState<CategoryId>(expense?.category ?? 'misc')
  const [paidBy, setPaidBy] = useState(() => {
    if (expense?.paid_by_member_id) return expense.paid_by_member_id
    const last = localStorage.getItem(`lastPaidBy_${sessionId}`)
    return (last && members.find(m => m.id === last)) ? last : members[0]?.id ?? ''
  })
  const [splitIds, setSplitIds] = useState<string[]>(
    expense?.splits?.map(s => s.member_id) ?? members.map(m => m.id)
  )
  const [transferTo, setTransferTo] = useState<string>(() => {
    if (expense?.category === 'transfer') return expense.splits?.[0]?.member_id ?? ''
    const initial = expense?.paid_by_member_id
      ? members.find(m => m.id !== expense.paid_by_member_id)?.id ?? ''
      : members.find(m => {
          const last = localStorage.getItem(`lastPaidBy_${sessionId}`)
          const payer = (last && members.find(x => x.id === last)) ? last : members[0]?.id
          return m.id !== payer
        })?.id ?? ''
    return initial
  })
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [expenseDate, setExpenseDate] = useState(
    expense?.expense_date ?? new Date().toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // #18 Recently used currencies
  const [recentCurrencies] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('recentCurrencies') ?? '[]') } catch { return [] }
  })

  const allCurrencies = ['SGD', ...currencies.map(c => c.currency_code)]

  const isTransfer = category === 'transfer'

  const handleCategoryChange = (id: CategoryId) => {
    setCategory(id)
    if (id === 'transfer') {
      const other = members.find(m => m.id !== paidBy)
      setTransferTo(other?.id ?? '')
      if (!description.trim()) setDescription('Transfer')
    }
  }

  const handlePaidByChange = (id: string) => {
    setPaidBy(id)
    if (isTransfer && transferTo === id) {
      const other = members.find(m => m.id !== id)
      setTransferTo(other?.id ?? '')
    }
  }

  const toggleSplit = (id: string) =>
    setSplitIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const rateForCurrency = (code: string) => {
    if (code === 'SGD') return 1
    return currencies.find(c => c.currency_code === code)?.rate_to_sgd ?? 1
  }

  const amountInSGD =
    amount && !isNaN(parseFloat(amount))
      ? (parseFloat(amount) * rateForCurrency(currency)).toFixed(2)
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amt = parseFloat(amount)
    if (!description.trim()) { setError('Please enter a description.'); return }
    if (isNaN(amt) || amt <= 0) { setError('Amount must be a positive number.'); return }
    if (!paidBy) { setError('Please select who paid.'); return }
    if (isTransfer && !transferTo) { setError('Please select who to transfer to.'); return }
    if (isTransfer && transferTo === paidBy) { setError('Transfer from and to cannot be the same person.'); return }
    if (!isTransfer && splitIds.length === 0) { setError('Please select at least one person to split with.'); return }

    setLoading(true)
    const finalSplitIds = isTransfer ? [transferTo] : splitIds
    try {
      const payload = { session_id: sessionId, description: description.trim(), amount: amt, currency_code: currency, category, notes: notes.trim() || null, expense_date: expenseDate, paid_by_member_id: paidBy, split_member_ids: finalSplitIds }
      const res = await fetch(expense ? `/api/expenses/${expense.id}` : '/api/expenses', {
        method: expense ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save expense.')
      localStorage.setItem(`lastPaidBy_${sessionId}`, paidBy)
      // Save recently used currency (#18)
      if (currency !== 'SGD') {
        const recent = [currency, ...recentCurrencies.filter(c => c !== currency)].slice(0, 3)
        localStorage.setItem('recentCurrencies', JSON.stringify(recent))
      }
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-gray-100">{expense ? 'Edit Expense' : isTransfer ? 'Add Transfer' : 'Add Expense'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Dinner at Maxwell" className={INPUT} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Category</label>
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => handleCategoryChange(c.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition ${
                    category === c.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-500 dark:text-gray-400'
                  }`}>
                  <span className="text-lg leading-none">{c.emoji}</span>
                  <span className="truncate w-full text-center">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Amount</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" step="any" min="0" className={INPUT} />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
                {allCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {amountInSGD && currency !== 'SGD' && (
            <p className="text-xs text-gray-400 dark:text-gray-500">≈ {amountInSGD} SGD at session rate</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Date</label>
            <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className={INPUT} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Notes <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. receipt #1234, split 3 ways..." rows={2}
              className={`${INPUT} resize-none`} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Paid by</label>
            <select value={paidBy} onChange={e => handlePaidByChange(e.target.value)} className={INPUT}>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {isTransfer ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Transfer to</label>
              <select value={transferTo} onChange={e => setTransferTo(e.target.value)} className={INPUT}>
                {members.filter(m => m.id !== paidBy).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Split among <span className="text-gray-400 font-normal ml-1 text-xs">(equal split)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={splitIds.includes(m.id)} onChange={() => toggleSplit(m.id)}
                      className="rounded border-gray-300 dark:border-gray-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{m.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? 'Saving…' : expense ? 'Save Changes' : isTransfer ? 'Add Transfer' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  )
}
