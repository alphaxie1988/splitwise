'use client'

import { X } from 'lucide-react'
import type { Expense, SessionMember, SessionCurrency, Settlement } from '@/lib/types'

interface Props {
  expenses: Expense[]
  members: SessionMember[]
  currencies: SessionCurrency[]
  onClose: () => void
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

  const balances: Record<string, number> = {}
  members.forEach(m => { balances[m.id] = 0 })

  for (const expense of expenses) {
    const splits = expense.splits ?? []
    if (splits.length === 0) continue

    const amountSGD = expense.amount * rateFor(expense.currency_code)
    const perPerson = amountSGD / splits.length

    // Payer is credited the full amount
    balances[expense.paid_by_member_id] = (balances[expense.paid_by_member_id] ?? 0) + amountSGD
    // Each split member is debited their share
    for (const split of splits) {
      balances[split.member_id] = (balances[split.member_id] ?? 0) - perPerson
    }
  }

  // Greedy debt simplification
  const pos = members.filter(m => balances[m.id] > 0.005).map(m => ({ ...m, bal: balances[m.id] })).sort((a, b) => b.bal - a.bal)
  const neg = members.filter(m => balances[m.id] < -0.005).map(m => ({ ...m, bal: -balances[m.id] })).sort((a, b) => b.bal - a.bal)

  const settlements: Settlement[] = []
  let ci = 0, di = 0

  while (ci < pos.length && di < neg.length) {
    const amount = Math.min(pos[ci].bal, neg[di].bal)
    settlements.push({ from: neg[di], to: pos[ci], amount: Math.round(amount * 100) / 100 })
    pos[ci].bal -= amount
    neg[di].bal -= amount
    if (pos[ci].bal < 0.005) ci++
    if (neg[di].bal < 0.005) di++
  }

  return { balances, settlements }
}

export default function SettlementModal({ expenses, members, currencies, onClose }: Props) {
  const { balances, settlements } = calculateSettlement(expenses, members, currencies)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold">Settle Up</h2>
            <p className="text-xs text-gray-400 mt-0.5">All amounts in SGD</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Net balances */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Net Balances</h3>
            <div className="space-y-1.5">
              {members.map(m => {
                const bal = balances[m.id] ?? 0
                return (
                  <div key={m.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{m.name}</span>
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
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Who Pays Who</h3>
            {settlements.length > 0 ? (
              <div className="space-y-2">
                {settlements.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                    <span className="text-sm font-medium">{s.from.name}</span>
                    <span className="text-gray-400 text-sm">pays</span>
                    <span className="text-sm font-medium">{s.to.name}</span>
                    <span className="ml-auto text-sm font-semibold text-blue-600 tabular-nums">
                      {s.amount.toFixed(2)} SGD
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm py-3">All settled up!</p>
            )}
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
