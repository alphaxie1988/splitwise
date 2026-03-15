import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

    const { name } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

    const supabase = createServiceClient()
    const { data: old } = await supabase.from('sessions').select('name').eq('id', params.id).single()
    await supabase.from('sessions').update({ name: name.trim() }).eq('id', params.id)
    await supabase.from('audit_logs').insert({
      session_id: params.id, action: 'SESSION_UPDATE', changed_by_email: user.email,
      old_data: { name: old?.name }, new_data: { name: name.trim() },
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
