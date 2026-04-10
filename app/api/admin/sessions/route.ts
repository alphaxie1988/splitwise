import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'alphaxie1988@gmail.com'

export async function GET() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createServiceClient()

  const { data: sessions, error } = await db
    .from('sessions')
    .select('id, name, created_at, session_members(count)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (sessions ?? []).map(s => ({
    id: s.id,
    name: s.name,
    created_at: s.created_at,
    member_count: (s.session_members as unknown as { count: number }[])[0]?.count ?? 0,
  }))

  return NextResponse.json({ sessions: result })
}
