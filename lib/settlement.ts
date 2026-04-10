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

  const balances: Record<string, number> = {}
  members.forEach(m => { balances[m.id] = 0 })

  for (const expense of expenses) {
    const splits = expense.splits ?? []
    if (splits.length === 0) continue
    const amountSGD = expense.amount * rateFor(expense.currency_code)
    const sharePerPerson = amountSGD / splits.length
    balances[expense.paid_by_member_id] = (balances[expense.paid_by_member_id] ?? 0) + amountSGD
    for (const split of splits) {
      balances[split.member_id] = (balances[split.member_id] ?? 0) - sharePerPerson
    }
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
