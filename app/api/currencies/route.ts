import { NextResponse } from 'next/server'

// Cache in-memory for the lifetime of the server instance
let cache: Record<string, string> | null = null

export async function GET() {
  if (cache) return NextResponse.json(cache)

  const res = await fetch('https://api.frankfurter.dev/v2/currencies')
  if (!res.ok) return NextResponse.json({}, { status: 502 })

  cache = await res.json()
  return NextResponse.json(cache)
}
