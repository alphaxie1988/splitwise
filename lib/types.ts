/** Currencies that have no minor units (no decimal places). */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY', 'IDR', 'KRW', 'VND', 'BIF', 'CLP', 'GNF', 'ISK',
  'KMF', 'PYG', 'RWF', 'UGX', 'XAF', 'XOF', 'XPF',
])

/** Format a currency amount, omitting decimals for zero-decimal currencies. */
export function formatAmount(amount: number, currencyCode: string): string {
  return ZERO_DECIMAL_CURRENCIES.has(currencyCode)
    ? Math.round(amount).toLocaleString()
    : amount.toFixed(2)
}

export const CATEGORIES = [
  { id: 'meal',          label: 'Meal'          },
  { id: 'drink',         label: 'Drink'         },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'hotel',         label: 'Hotel'         },
  { id: 'taxi',          label: 'Taxi'          },
  { id: 'flight',        label: 'Flight'        },
  { id: 'train',         label: 'Train'         },
  { id: 'shopping',      label: 'Shopping'      },
  { id: 'transfer',      label: 'Transfer'      },
  { id: 'misc',          label: 'Misc'          },
] as const

export type CategoryId = typeof CATEGORIES[number]['id']

export interface Session {
  id: string
  name: string
  is_settled: boolean
  has_passcode: boolean
  created_at: string
}

export interface SessionMember {
  id: string
  session_id: string
  name: string
  created_at: string
}

export interface SessionCurrency {
  id: string
  session_id: string
  currency_code: string
  rate_to_sgd: number
}

export interface ExpenseSplit {
  id: string
  expense_id: string
  member_id: string
  member?: SessionMember
}

export interface Expense {
  id: string
  session_id: string
  description: string
  amount: number
  currency_code: string
  category: CategoryId
  notes: string | null
  expense_date: string
  paid_by_member_id: string
  created_at: string
  updated_at: string
  created_by_email: string | null
  is_deleted: boolean
  paid_by?: SessionMember
  splits?: ExpenseSplit[]
}

export interface ConfirmedSettlement {
  id: string
  session_id: string
  from_member_id: string
  to_member_id: string
  amount: number
  settled_at: string
  settled_by_email: string | null
}

export interface AuditLog {
  id: string
  session_id: string
  expense_id: string | null
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RATE_CHANGE' | 'SETTLE' | 'UNSETTLE' | 'SESSION_UPDATE' | 'PAYMENT_CHECK' | 'PAYMENT_UNCHECK'
  changed_by_email: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old_data: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new_data: any
  created_at: string
}

export interface SessionData {
  session: Session
  members: SessionMember[]
  currencies: SessionCurrency[]
  expenses: Expense[]
  confirmedSettlements: ConfirmedSettlement[]
}

export interface Settlement {
  from: SessionMember
  to: SessionMember
  amount: number
}
