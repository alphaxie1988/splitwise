import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

async function getAuthUser() {
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  return user
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required to edit expenses.' }, { status: 401 })
    }

    const body = await request.json()
    const { description, amount, currency_code, category, notes, expense_date, paid_by_member_id, split_member_ids } = body

    const supabase = createServiceClient()

    // Capture old state for audit log
    const { data: oldExpense } = await supabase
      .from('expenses')
      .select('*, splits:expense_splits(*)')
      .eq('id', params.id)
      .single()

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .update({
        description: description.trim(),
        amount,
        currency_code,
        category: category || 'misc',
        notes: notes?.trim() || null,
        expense_date: expense_date || new Date().toISOString().split('T')[0],
        paid_by_member_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (expenseError) throw expenseError

    // Replace splits
    await supabase.from('expense_splits').delete().eq('expense_id', params.id)
    await supabase.from('expense_splits').insert(
      split_member_ids.map((member_id: string) => ({ expense_id: params.id, member_id }))
    )

    await supabase.from('audit_logs').insert({
      session_id: expense.session_id,
      expense_id: params.id,
      action: 'UPDATE',
      changed_by_email: user.email,
      old_data: {
        ...oldExpense,
        split_member_ids: oldExpense?.splits?.map((s: { member_id: string }) => s.member_id) ?? [],
      },
      new_data: { ...expense, split_member_ids },
    })

    return NextResponse.json({ expense })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required to delete expenses.' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const { data: oldExpense } = await supabase
      .from('expenses')
      .select('*, splits:expense_splits(*)')
      .eq('id', params.id)
      .single()

    await supabase
      .from('expenses')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', params.id)

    if (oldExpense) {
      await supabase.from('audit_logs').insert({
        session_id: oldExpense.session_id,
        expense_id: params.id,
        action: 'DELETE',
        changed_by_email: user.email,
        old_data: {
          ...oldExpense,
          split_member_ids: oldExpense.splits?.map((s: { member_id: string }) => s.member_id) ?? [],
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
