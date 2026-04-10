import type { Expense, SessionMember, SessionCurrency, Settlement } from '@/lib/types'

export function calculateSettlement(
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
