'use client'

import { useState } from 'react'
import { X, CheckCircle, Circle } from 'lucide-react'
import type { Expense, SessionMember, SessionCurrency, Settlement, ConfirmedSettlement } from '@/lib/types'
import { calculateSettlement } from '@/lib/settlement'

interface Props {
  sessionId: string
  expenses: Expense[]
  members: SessionMember[]
  currencies: SessionCurrency[]
  confirmedSettlements: ConfirmedSettlement[]
  user: { email?: string | null } | null
  isSettled?: boolean
  onClose: () => void
  onSettlementChange: () => void
}


export default function SettlementModal({ sessionId, expenses, members, currencies, confirmedSettlements, user, isSettled, onClose, onSettlementChange }: Props) {
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
    if (isSettled && confirmed) return
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
            <h2 className="text-lg font-semibold dark:text-gray-100">Summary</h2>
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
                    const memberSettlements = settlements.filter(s => s.from.id === m.id || s.to.id === m.id)
                    const allConfirmed = memberSettlements.length > 0 && memberSettlements.every(s => isConfirmed(s))
                    return (
                      <div key={m.id} className="flex items-center justify-between">
                        <span className={`text-sm ${allConfirmed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{m.name}</span>
                        <span className={`text-sm font-medium tabular-nums ${allConfirmed ? 'line-through text-gray-400' : bal > 0.005 ? 'text-green-600' : bal < -0.005 ? 'text-red-500' : 'text-gray-400'}`}>
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
                        <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 transition ${confirmed ? 'bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                          <span className={`text-sm font-medium ${confirmed ? 'line-through text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>{s.from.name}</span>
                          <span className={`text-sm ${confirmed ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`}>→</span>
                          <span className={`text-sm font-medium ${confirmed ? 'line-through text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>{s.to.name}</span>
                          <span className={`ml-auto text-sm font-semibold tabular-nums ${confirmed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400'}`}>
                            {s.amount.toFixed(2)} SGD
                          </span>
                          {user && (
                            <button onClick={() => handleToggle(s)} disabled={loadingId === key || (isSettled && confirmed)}
                              className="ml-1 shrink-0 disabled:opacity-40 transition disabled:cursor-not-allowed">
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
                const confirmedOutgoing = confirmedSettlements
                  .filter(c => c.from_member_id === m.id)
                  .reduce((sum, c) => sum + c.amount, 0)
                const confirmedIncoming = confirmedSettlements
                  .filter(c => c.to_member_id === m.id)
                  .reduce((sum, c) => sum + c.amount, 0)
                const effectiveBal = bal + confirmedOutgoing - confirmedIncoming
                return (
                  <div key={m.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800 dark:text-gray-100">{m.name}</span>
                      <span className={`text-sm font-semibold ${effectiveBal > 0.01 ? 'text-green-600' : effectiveBal < -0.01 ? 'text-red-500' : 'text-gray-400'}`}>
                        {effectiveBal > 0.01 ? 'gets back' : effectiveBal < -0.01 ? 'owes' : 'settled'} {Math.abs(effectiveBal) > 0.01 ? `${Math.abs(effectiveBal).toFixed(2)} SGD` : ''}
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
