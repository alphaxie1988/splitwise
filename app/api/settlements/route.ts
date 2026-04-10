import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

    const { session_id, from_member_id, to_member_id, amount } = await request.json()
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('settlements')
      .upsert(
        { session_id, from_member_id, to_member_id, amount, settled_by_email: user.email, settled_at: new Date().toISOString() },
        { onConflict: 'session_id,from_member_id,to_member_id' }
      )
      .select()
      .single()

    if (error) throw error

    const { data: members } = await supabase
      .from('session_members')
      .select('id, name')
      .in('id', [from_member_id, to_member_id])

    const fromMember = members?.find((m: { id: string; name: string }) => m.id === from_member_id)
    const toMember = members?.find((m: { id: string; name: string }) => m.id === to_member_id)

    await supabase.from('audit_logs').insert({
      session_id,
      action: 'PAYMENT_CHECK',
      changed_by_email: user.email,
      new_data: {
        from_member_id,
        to_member_id,
        from_member: fromMember?.name ?? from_member_id,
        to_member: toMember?.name ?? to_member_id,
        amount,
      },
    })

    return NextResponse.json({ settlement: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
