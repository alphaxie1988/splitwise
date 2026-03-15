import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

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

    const [{ data: members }, { data: currencies }, { data: expenses }] = await Promise.all([
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
        .select(`
          *,
          paid_by:session_members!paid_by_member_id(*),
          splits:expense_splits(*, member:session_members(*))
        `)
        .eq('session_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
    ])

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
