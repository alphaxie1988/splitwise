import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from')
  if (!from) return NextResponse.json({ error: 'Missing from parameter' }, { status: 400 })

  const res = await fetch(`https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(from)}&quotes=SGD`)
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch rate' }, { status: 502 })

  const data = await res.json()
  return NextResponse.json(data)
}
