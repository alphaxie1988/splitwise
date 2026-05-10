# Splitwise — Expense Splitting PWA

## What
Next.js 14 PWA for splitting group expenses without sign-up.
- Stack: Next.js 14, TypeScript, Tailwind CSS, Supabase (PostgreSQL), Google OAuth, Frankfurter API (exchange rates)
- DB tables: `sessions`, `session_members`, `session_currencies`, `expenses`, `expense_splits`, `settlements`, `audit_logs`
- Structure: `app/` (App Router + API routes), `components/`, `lib/` (`settlement.ts`, `types.ts`, Supabase clients), `supabase/` (schema + migrations)

## Why
Lightweight expense tracker — users create a named session, share a link, and track debts. No account needed; Google OAuth unlocks session history across devices.

## How
```bash
npm run dev      # http://localhost:3000
npm run build
npm run lint
```
Credentials in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). All DB writes go through API routes using the service role key; RLS is enforced in the API layer. Deployed on Vercel (UptimeRobot keeps free tier warm).

## Notes
- No entry animations — only exit fades where needed.
- Multi-currency: always store amounts with their original currency code; rates stored per session via Frankfurter.
- Settlement algorithm minimises number of payments — see `lib/settlement.ts` before modifying.
- PWA: manifest + PNG icons; `beforeinstallprompt` captured early in root layout to avoid missing the browser event.
- Admin dashboard (`app/admin/`) shows settled sessions and editor emails from `audit_logs`.
