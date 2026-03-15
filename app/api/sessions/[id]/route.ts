import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient()
    const { id } = params

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const [{ data: members }, { data: currencies }, { data: rawExpenses }, { data: splits }] = await Promise.all([
      supabase
        .from('session_members')
        .select('*')
        .eq('session_id', id)
        .order('created_at'),
      supabase
        .from('session_currencies')
        .select('*')
        .eq('session_id', id)
        .order('currency_code'),
      supabase
        .from('expenses')
        .select('*')
        .eq('session_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('expense_splits')
        .select('*')
        .in('expense_id', (await supabase.from('expenses').select('id').eq('session_id', id).eq('is_deleted', false)).data?.map(e => e.id) ?? []),
    ])

    const membersMap = Object.fromEntries((members ?? []).map(m => [m.id, m]))
    const expenses = (rawExpenses ?? []).map(expense => ({
      ...expense,
      paid_by: membersMap[expense.paid_by_member_id] ?? null,
      splits: (splits ?? [])
        .filter(s => s.expense_id === expense.id)
        .map(s => ({ ...s, member: membersMap[s.member_id] ?? null })),
    }))

    return NextResponse.json({
      session,
      members: members ?? [],
      currencies: currencies ?? [],
      expenses: expenses ?? [],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
