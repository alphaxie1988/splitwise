import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

    const supabase = createServiceClient()

    const { data: settlement } = await supabase
      .from('settlements')
      .select('session_id, from_member_id, to_member_id, amount')
      .eq('id', params.id)
      .single()

    await supabase.from('settlements').delete().eq('id', params.id)

    if (settlement) {
      const { from_member_id, to_member_id, session_id, amount } = settlement

      const { data: members } = await supabase
        .from('session_members')
        .select('id, name')
        .in('id', [from_member_id, to_member_id])

      const fromMember = members?.find((m: { id: string; name: string }) => m.id === from_member_id)
      const toMember = members?.find((m: { id: string; name: string }) => m.id === to_member_id)

      await supabase.from('audit_logs').insert({
        session_id,
        action: 'PAYMENT_UNCHECK',
        changed_by_email: user.email,
        old_data: {
          from_member_id,
          to_member_id,
          from_member: fromMember?.name ?? from_member_id,
          to_member: toMember?.name ?? to_member_id,
          amount,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
