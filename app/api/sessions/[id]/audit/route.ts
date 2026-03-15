import { NextRequest, NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  noStore()
  try {
    const supabase = createServiceClient()

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('session_id', params.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    return NextResponse.json({ logs: logs ?? [] }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
