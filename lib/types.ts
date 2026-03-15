export interface Session {
  id: string
  name: string
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

export const CATEGORIES = [
  { id: 'meal',          label: 'Meal',          emoji: '🍽️' },
  { id: 'drink',         label: 'Drink',         emoji: '🍹' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎉' },
  { id: 'hotel',         label: 'Hotel',         emoji: '🏨' },
  { id: 'taxi',          label: 'Taxi',          emoji: '🚕' },
  { id: 'flight',        label: 'Flight',        emoji: '✈️' },
  { id: 'train',         label: 'Train',         emoji: '🚆' },
  { id: 'shopping',      label: 'Shopping',      emoji: '🛍️' },
  { id: 'misc',          label: 'Misc',          emoji: '📦' },
] as const

export type CategoryId = typeof CATEGORIES[number]['id']

export interface Expense {
  id: string
  session_id: string
  description: string
  amount: number
  currency_code: string
  paid_by_member_id: string
  category: CategoryId
  created_at: string
  updated_at: string
  created_by_email: string | null
  is_deleted: boolean
  paid_by?: SessionMember
  splits?: ExpenseSplit[]
}

export interface AuditLog {
  id: string
  session_id: string
  expense_id: string | null
  action: 'CREATE' | 'UPDATE' | 'DELETE'
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
}

export interface Settlement {
  from: SessionMember
  to: SessionMember
  amount: number
}
