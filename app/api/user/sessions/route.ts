import { NextRequest, NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  noStore()
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ sessions: [] })

    const supabase = createServiceClient()
    const { data: rows } = await supabase
      .from('user_sessions')
      .select('session_id, last_visited, is_archived')
      .eq('user_email', user.email)
      .order('last_visited', { ascending: false })
      .limit(50)

    if (!rows?.length) return NextResponse.json({ sessions: [] })

    const sessionIds = rows.map(r => r.session_id)
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name')
      .in('id', sessionIds)

    const { data: members } = await supabase
      .from('session_members')
      .select('session_id, name')
      .in('session_id', sessionIds)

    const sessionsMap = Object.fromEntries((sessions ?? []).map(s => [s.id, s]))
    const membersMap: Record<string, string[]> = {}
    for (const m of members ?? []) {
      if (!membersMap[m.session_id]) membersMap[m.session_id] = []
      membersMap[m.session_id].push(m.name)
    }

    const result = rows
      .filter(r => sessionsMap[r.session_id])
      .map(r => ({
        id: r.session_id,
        name: sessionsMap[r.session_id].name,
        members: membersMap[r.session_id] ?? [],
        lastVisited: r.last_visited,
        isArchived: r.is_archived ?? false,
      }))

    return NextResponse.json(
      { sessions: result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false })

    const { session_id } = await request.json()
    const supabase = createServiceClient()

    await supabase.from('user_sessions').upsert(
      { user_email: user.email, session_id, last_visited: new Date().toISOString() },
      { onConflict: 'user_email,session_id' }
    )

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

    const { session_id, is_archived } = await request.json()
    const supabase = createServiceClient()

    await supabase
      .from('user_sessions')
      .update({ is_archived })
      .eq('user_email', user.email)
      .eq('session_id', session_id)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
