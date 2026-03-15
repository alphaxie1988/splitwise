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

    // Fetch old rate for audit
    const { data: oldCurrency } = await supabase
      .from('session_currencies')
      .select('currency_code, rate_to_sgd')
      .eq('id', currency_id)
      .eq('session_id', params.id)
      .single()

    const { error } = await supabase
      .from('session_currencies')
      .update({ rate_to_sgd: parseFloat(rate_to_sgd) })
      .eq('id', currency_id)
      .eq('session_id', params.id)

    if (error) throw error

    await supabase.from('audit_logs').insert({
      session_id: params.id,
      action: 'RATE_CHANGE',
      changed_by_email: user.email,
      old_data: { currency_code: oldCurrency?.currency_code, rate_to_sgd: oldCurrency?.rate_to_sgd },
      new_data: { currency_code: oldCurrency?.currency_code, rate_to_sgd: parseFloat(rate_to_sgd) },
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
