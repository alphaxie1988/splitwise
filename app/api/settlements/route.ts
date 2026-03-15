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
    return NextResponse.json({ settlement: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
