import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from')
  if (!from) return NextResponse.json({ error: 'Missing from parameter' }, { status: 400 })

  const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=SGD`)
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch rate' }, { status: 502 })

  const data = await res.json()
  return NextResponse.json(data)
}
