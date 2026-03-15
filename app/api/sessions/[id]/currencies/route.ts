import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }

    const { currency_id, rate_to_sgd } = await request.json()
    if (!currency_id || !rate_to_sgd || isNaN(parseFloat(rate_to_sgd)) || parseFloat(rate_to_sgd) <= 0) {
      return NextResponse.json({ error: 'Invalid rate.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('session_currencies')
      .update({ rate_to_sgd: parseFloat(rate_to_sgd) })
      .eq('id', currency_id)
      .eq('session_id', params.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
