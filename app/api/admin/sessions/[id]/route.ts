import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'alphaxie1988@gmail.com'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const db = createServiceClient()

  // Delete tables without ON DELETE CASCADE before deleting the session
  await db.from('settlements').delete().eq('session_id', id)
  await db.from('audit_logs').delete().eq('session_id', id)
  await db.from('user_sessions').delete().eq('session_id', id)

  const { error } = await db.from('sessions').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
