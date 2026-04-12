# Splitwise — Project Memory

## What This Is

A lightweight expense-splitting PWA. No sign-up required — users create a session, share the link, and track debts. Google OAuth is optional (syncs session list across devices). Deployed on Vercel.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL) — all writes go through API routes using the service role key (bypasses RLS); auth is enforced in the API layer
- **Auth**: Supabase Auth — Google OAuth only
- **Exchange rates**: Frankfurter API v2
- **Icons**: Lucide React

## Project Structure

```
app/               # Next.js App Router pages + API routes
  admin/           # Admin dashboard (restricted by email)
  api/             # All DB writes go through here
  auth/            # Supabase auth callbacks
  session/         # Per-session expense view
  page.tsx         # Home page (session list)
  layout.tsx       # Root layout

components/        # UI components (modals, toasts, etc.)
lib/               # Shared utilities and types
  types.ts         # Core TypeScript types
  supabase-browser.ts / supabase-server.ts
  settlement.ts    # Debt minimisation logic

supabase/
  schema.sql       # Full DB schema + RLS setup
  migrations/      # Incremental schema changes
```

## Database Tables

| Table | Purpose |
|---|---|
| `sessions` | Top-level expense groups |
| `session_members` | Members per session |
| `session_currencies` | Per-session exchange rates |
| `expenses` | Individual expense records |
| `expense_splits` | Which members share each expense |
| `settlements` | Confirmed payment records |
| `audit_logs` | Full change history |

## Key Features to Keep in Mind

- Sessions work without any account (anonymous-first)
- PWA installable — manifest + PNG icons + `beforeinstallprompt` captured early in layout
- Dark/light theme toggle
- Settlement algorithm minimises number of payments (see `lib/settlement.ts`)
- Audit log tracks every change (expenses, rates, payments, session status)
- Multi-currency with Frankfurter exchange rates stored per session
- Recent sessions persisted locally (no login needed)

## Dev Commands

```bash
npm run dev     # Local dev server
npm run build   # Production build
npm run lint    # ESLint
```

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Deployment

Vercel. UptimeRobot pings every 12 hours to keep the free-tier warm.

## Recent Work (as of 2026-04-12)

- Added PNG icons and fixed PWA installability
- `beforeinstallprompt` captured early in layout to avoid missing the browser event
- PWA install banner added with spacing above Recent Sessions panel
- Android manual install guide added as fallback when native prompt is unavailable
- Header wallpaper animation replaced with a simple fade-in
- Homepage messaging updated to clarify account requirements
