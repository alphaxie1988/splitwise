import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

    const supabase = createServiceClient()
    await supabase.from('sessions').update({ is_settled: true }).eq('id', params.id)
    await supabase.from('audit_logs').insert({
      session_id: params.id, action: 'SETTLE', changed_by_email: user.email,
      new_data: { is_settled: true },
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

    const supabase = createServiceClient()
    await supabase.from('sessions').update({ is_settled: false }).eq('id', params.id)
    await supabase.from('audit_logs').insert({
      session_id: params.id, action: 'UNSETTLE', changed_by_email: user.email,
      new_data: { is_settled: false },
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
