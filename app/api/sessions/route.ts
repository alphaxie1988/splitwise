import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, members, currencies, passcode } = body

    const validMembers: string[] = (members ?? []).filter((m: string) => m?.trim())
    if (validMembers.length < 2) {
      return NextResponse.json({ error: 'Please add at least 2 members.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({ name: name?.trim() || 'My Session', passcode: passcode?.trim() || null })
      .select()
      .single()

    if (sessionError) throw sessionError

    const { error: membersError } = await supabase
      .from('session_members')
      .insert(validMembers.map((n: string) => ({ session_id: session.id, name: n.trim() })))

    if (membersError) throw membersError

    const validCurrencies = (currencies ?? []).filter(
      (c: { code: string; rate: number }) => c.code?.trim() && c.rate > 0
    )
    if (validCurrencies.length > 0) {
      const { error: currenciesError } = await supabase
        .from('session_currencies')
        .insert(
          validCurrencies.map((c: { code: string; rate: number }) => ({
            session_id: session.id,
            currency_code: c.code.trim().toUpperCase(),
            rate_to_sgd: c.rate,
          }))
        )
      if (currenciesError) throw currenciesError
    }

    return NextResponse.json({ id: session.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('POST /api/sessions:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
