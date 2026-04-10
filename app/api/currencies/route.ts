import { NextResponse } from 'next/server'

// Cache in-memory for the lifetime of the server instance
let cache: Record<string, string> | null = null

export async function GET() {
  if (cache) return NextResponse.json(cache)

  const res = await fetch('https://api.frankfurter.dev/v2/currencies')
  if (!res.ok) return NextResponse.json({}, { status: 502 })

  const raw = await res.json()

  // Normalize to Record<string, string> regardless of response shape:
  // - v1 object format: { "USD": "US Dollar", ... }
  // - v2 array format:  [{ "iso_code": "USD", "name": "US Dollar", ... }, ...]
  let normalized: Record<string, string> = {}
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const code = item.iso_code ?? item.code ?? item.currency_code
      const name = item.name ?? item.description ?? item.currency_name
      if (code && name) normalized[String(code).toUpperCase()] = String(name)
    }
  } else if (raw && typeof raw === 'object') {
    normalized = raw as Record<string, string>
  }

  cache = normalized
  return NextResponse.json(cache)
}
