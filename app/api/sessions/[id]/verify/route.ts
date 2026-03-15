import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { passcode } = await request.json()
    const supabase = createServiceClient()
    const { data } = await supabase.from('sessions').select('passcode').eq('id', params.id).single()
    if (!data) return NextResponse.json({ ok: false })
    return NextResponse.json({ ok: data.passcode === passcode })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
