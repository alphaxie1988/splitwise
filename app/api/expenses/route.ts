import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Auth check — user must be signed in to create expenses
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Sign in required to add expenses.' }, { status: 401 })
    }

    const body = await request.json()
    const { session_id, description, amount, currency_code, category, paid_by_member_id, split_member_ids } = body

    if (!session_id || !description?.trim() || !amount || !paid_by_member_id || !split_member_ids?.length) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        session_id,
        description: description.trim(),
        amount,
        currency_code: currency_code || 'SGD',
        category: category || 'misc',
        paid_by_member_id,
        created_by_email: user.email,
      })
      .select()
      .single()

    if (expenseError) throw expenseError

    const { error: splitsError } = await supabase
      .from('expense_splits')
      .insert(split_member_ids.map((member_id: string) => ({ expense_id: expense.id, member_id })))

    if (splitsError) throw splitsError

    await supabase.from('audit_logs').insert({
      session_id,
      expense_id: expense.id,
      action: 'CREATE',
      changed_by_email: user.email,
      new_data: { ...expense, split_member_ids },
    })

    return NextResponse.json({ expense })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('POST /api/expenses:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
