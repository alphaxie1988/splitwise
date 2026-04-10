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

  // Delete in dependency order to avoid FK violations:
  // 1. settlements references session_members (no cascade)
  await db.from('settlements').delete().eq('session_id', id)
  // 2. audit_logs references sessions (no cascade)
  await db.from('audit_logs').delete().eq('session_id', id)
  // 3. user_sessions references sessions (no cascade)
  await db.from('user_sessions').delete().eq('session_id', id)
  // 4. expense_splits.member_id references session_members (no cascade) —
  //    deleting expenses first cascades expense_splits via expense_id
  await db.from('expenses').delete().eq('session_id', id)

  // Now safe to delete the session (cascades session_members, session_currencies)
  const { error } = await db.from('sessions').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
