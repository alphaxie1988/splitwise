import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

    const supabase = createServiceClient()

    // Check if member has any expenses
    const { data: asPayerExpenses } = await supabase
      .from('expenses')
      .select('id')
      .eq('paid_by_member_id', params.memberId)
      .eq('is_deleted', false)
      .limit(1)

    const { data: asSplitExpenses } = await supabase
      .from('expense_splits')
      .select('id')
      .eq('member_id', params.memberId)
      .limit(1)

    if ((asPayerExpenses?.length ?? 0) > 0 || (asSplitExpenses?.length ?? 0) > 0) {
      return NextResponse.json({ error: 'Cannot remove a member who has expenses.' }, { status: 400 })
    }

    await supabase.from('session_members').delete().eq('id', params.memberId).eq('session_id', params.id)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
