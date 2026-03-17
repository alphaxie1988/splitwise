'use client'

import { useState } from 'react'
import { X, CheckCircle, Circle } from 'lucide-react'
import type { Expense, SessionMember, SessionCurrency, Settlement, ConfirmedSettlement } from '@/lib/types'

interface Props {
  sessionId: string
  expenses: Expense[]
  members: SessionMember[]
  currencies: SessionCurrency[]
  confirmedSettlements: ConfirmedSettlement[]
  user: { email?: string | null } | null
  onClose: () => void
  onSettlementChange: () => void
}

function calculateSettlement(
  expenses: Expense[],
  members: SessionMember[],
  currencies: SessionCurrency[]
): { balances: Record<string, number>; settlements: Settlement[] } {
  const rateFor = (code: string) => {
    if (code === 'SGD') return 1
    return currencies.find(c => c.currency_code === code)?.rate_to_sgd ?? 1
  }

  const totalPaid: Record<string, number> = {}
  const balances: Record<string, number> = {}
  members.forEach(m => { balances[m.id] = 0; totalPaid[m.id] = 0 })

  for (const expense of expenses) {
    const splits = expense.splits ?? []
    if (splits.length === 0) continue
    const amountSGD = expense.amount * rateFor(expense.currency_code)
    // Work in integer cents to avoid floating-point rounding errors
    const totalCents = Math.round(amountSGD * 100)
    const perPersonCents = Math.floor(totalCents / splits.length)
    const remainderCents = totalCents % splits.length
    // Sort by member_id so remainder-cent assignment is deterministic regardless of DB query order
    const sortedSplits = [...splits].sort((a, b) => a.member_id.localeCompare(b.member_id))
    balances[expense.paid_by_member_id] = (balances[expense.paid_by_member_id] ?? 0) + totalCents
    totalPaid[expense.paid_by_member_id] = (totalPaid[expense.paid_by_member_id] ?? 0) + totalCents
    for (let i = 0; i < sortedSplits.length; i++) {
      const splitCents = perPersonCents + (i < remainderCents ? 1 : 0)
      balances[sortedSplits[i].member_id] = (balances[sortedSplits[i].member_id] ?? 0) - splitCents
    }
  }
  // Convert cents back to dollars
  for (const key of Object.keys(balances)) {
    balances[key] = balances[key] / 100
    totalPaid[key] = totalPaid[key] / 100
  }

  const pos = members.filter(m => balances[m.id] > 0.005).map(m => ({ ...m, bal: balances[m.id] })).sort((a, b) => b.bal - a.bal)
  const neg = members.filter(m => balances[m.id] < -0.005).map(m => ({ ...m, bal: -balances[m.id] })).sort((a, b) => b.bal - a.bal)

  const settlements: Settlement[] = []
  let ci = 0, di = 0
  while (ci < pos.length && di < neg.length) {
    const amount = Math.min(pos[ci].bal, neg[di].bal)
    settlements.push({ from: neg[di], to: pos[ci], amount: Math.round(amount * 100) / 100 })
    pos[ci].bal -= amount; neg[di].bal -= amount
    if (pos[ci].bal < 0.005) ci++
    if (neg[di].bal < 0.005) di++
  }

  return { balances, settlements }
}

export default function SettlementModal({ sessionId, expenses, members, currencies, confirmedSettlements, user, onClose, onSettlementChange }: Props) {
  const { balances, settlements } = calculateSettlement(expenses, members, currencies)
  const [tab, setTab] = useState<'settle' | 'summary'>('settle')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const isConfirmed = (s: Settlement) =>
    confirmedSettlements.some(c => c.from_member_id === s.from.id && c.to_member_id === s.to.id)

  const getConfirmed = (s: Settlement) =>
    confirmedSettlements.find(c => c.from_member_id === s.from.id && c.to_member_id === s.to.id)

  const handleToggle = async (s: Settlement) => {
    if (!user) return
    const confirmed = getConfirmed(s)
    const key = `${s.from.id}-${s.to.id}`
    setLoadingId(key)
    try {
      if (confirmed) {
        await fetch(`/api/settlements/${confirmed.id}`, { method: 'DELETE' })
      } else {
        await fetch('/api/settlements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, from_member_id: s.from.id, to_member_id: s.to.id, amount: s.amount }),
        })
      }
      onSettlementChange()
    } finally {
      setLoadingId(null)
    }
  }

  const totalExpensesSGD = expenses.reduce((sum, e) => {
    if (e.category === 'transfer') return sum
    const rate = e.currency_code === 'SGD' ? 1 : currencies.find(c => c.currency_code === e.currency_code)?.rate_to_sgd ?? 1
    return sum + e.amount * rate
  }, 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold dark:text-gray-100">Settle Up</h2>
            <p className="text-xs text-gray-400 mt-0.5">All amounts in SGD</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700 shrink-0">
          {(['settle', 'summary'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {t === 'settle' ? 'Who Pays Who' : 'Per Person Summary'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {tab === 'settle' && (
            <>
              {/* Net balances */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Net Balances</h3>
                <div className="space-y-1.5">
                  {members.map(m => {
                    const bal = balances[m.id] ?? 0
                    return (
                      <div key={m.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{m.name}</span>
                        <span className={`text-sm font-medium tabular-nums ${bal > 0.005 ? 'text-green-600' : bal < -0.005 ? 'text-red-500' : 'text-gray-400'}`}>
                          {bal > 0.005 ? '+' : ''}{bal.toFixed(2)} SGD
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Who pays who */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Payments</h3>
                {settlements.length > 0 ? (
                  <div className="space-y-2">
                    {settlements.map((s, i) => {
                      const confirmed = isConfirmed(s)
                      const key = `${s.from.id}-${s.to.id}`
                      return (
                        <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 transition ${confirmed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                          <span className={`text-sm font-medium dark:text-gray-300 ${confirmed ? 'line-through text-gray-400' : ''}`}>{s.from.name}</span>
                          <span className="text-gray-400 text-sm">→</span>
                          <span className={`text-sm font-medium dark:text-gray-300 ${confirmed ? 'line-through text-gray-400' : ''}`}>{s.to.name}</span>
                          <span className={`ml-auto text-sm font-semibold tabular-nums ${confirmed ? 'text-gray-400' : 'text-blue-600'}`}>
                            {s.amount.toFixed(2)} SGD
                          </span>
                          {user && (
                            <button onClick={() => handleToggle(s)} disabled={loadingId === key}
                              className="ml-1 shrink-0 disabled:opacity-40 transition">
                              {confirmed
                                ? <CheckCircle size={18} className="text-green-500" />
                                : <Circle size={18} className="text-gray-300 hover:text-green-400" />}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-sm py-3">All settled up! 🎉</p>
                )}
                {user && settlements.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">Tap the circle to mark a payment as done.</p>
                )}
              </div>
            </>
          )}

          {tab === 'summary' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Total Session Amount: <span className="font-medium text-gray-700 dark:text-gray-200">{totalExpensesSGD.toFixed(2)} SGD</span></p>
              {members.map(m => {
                const paid = expenses.reduce((sum, e) => {
                  if (e.paid_by_member_id !== m.id) return sum
                  const rate = e.currency_code === 'SGD' ? 1 : currencies.find(c => c.currency_code === e.currency_code)?.rate_to_sgd ?? 1
                  return sum + e.amount * rate
                }, 0)
                const share = expenses.reduce((sum, e) => {
                  const splits = e.splits ?? []
                  if (!splits.some(s => s.member_id === m.id)) return sum
                  const rate = e.currency_code === 'SGD' ? 1 : currencies.find(c => c.currency_code === e.currency_code)?.rate_to_sgd ?? 1
                  return sum + (e.amount * rate) / splits.length
                }, 0)
                const bal = balances[m.id] ?? 0
                return (
                  <div key={m.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800 dark:text-gray-100">{m.name}</span>
                      <span className={`text-sm font-semibold ${bal > 0.005 ? 'text-green-600' : bal < -0.005 ? 'text-red-500' : 'text-gray-400'}`}>
                        {bal > 0.005 ? 'gets back' : bal < -0.005 ? 'owes' : 'settled'} {Math.abs(bal) > 0.005 ? `${Math.abs(bal).toFixed(2)} SGD` : ''}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Paid: <span className="font-medium text-gray-700 dark:text-gray-200">{paid.toFixed(2)}</span></span>
                      <span>Share: <span className="font-medium text-gray-700 dark:text-gray-200">{share.toFixed(2)}</span></span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 shrink-0">
          <button onClick={onClose}
            className="w-full border dark:border-gray-600 rounded-lg py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
