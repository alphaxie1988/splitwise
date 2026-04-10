# Splitwise

A lightweight expense splitting app — no sign-up required. Create a session, share the link, and track who owes who.

## Features

### Sessions
- Create expense-tracking sessions instantly, no account needed
- Share sessions via URL, WhatsApp, Telegram, or QR code
- Protect sessions with an optional passcode
- Rename sessions and add or remove members
- Archive sessions to keep your home screen tidy
- Recent sessions remembered across visits

### Expenses
- Add, edit, and delete expenses
- Assign a payer and split among any subset of members
- Categorise expenses: Meal, Drink, Entertainment, Hotel, Taxi, Flight, Train, Shopping, Transfer, Misc
- Add optional notes and an expense date
- Multi-currency support with per-session exchange rates (powered by [Frankfurter](https://frankfurter.dev/))

### Settlements
- Automatic calculation of the minimum number of payments to settle all debts
- Confirm individual payments as they are made
- Mark the entire session as settled once everyone is paid up
- Reopen settled sessions if needed

### Audit Log
- Full history of every change: expenses created/edited/deleted, rates updated, payments confirmed, session settled

### Authentication (optional)
- Sign in with Google to sync your session list and archived status across devices
- All features work without signing in — auth is purely for convenience

### Other
- Dark / light theme toggle
- Installable as a PWA
- Admin dashboard for managing all sessions (restricted by email)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Google OAuth |
| Exchange Rates | Frankfurter API v2 |
| Icons | Lucide React |

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone the repo

```bash
git clone https://github.com/alphaxie1988/splitwise.git
cd splitwise
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Set up the database

Run `supabase/schema.sql` in the Supabase SQL editor to create all tables, enable RLS, and set up public read policies.

### 4. Run locally

```bash
npm run dev
```

## Database Schema

| Table | Description |
|---|---|
| `sessions` | Top-level expense groups |
| `session_members` | Members belonging to a session |
| `session_currencies` | Exchange rates used in a session |
| `expenses` | Individual expense records |
| `expense_splits` | Which members share each expense |
| `settlements` | Confirmed payment records |
| `audit_logs` | Full change history for every session |

All writes go through API routes using the Supabase service role key, which bypasses RLS. Auth checks are handled in the API layer.

## Deployment

The app is deployed on [Vercel](https://vercel.com). Set the same environment variables in your Vercel project settings.

### Keeping the deployment alive

Free-tier deployments can become slow after periods of inactivity. [UptimeRobot](https://uptimerobot.com) is used to ping the app every 5 minutes and keep it warm.

To set it up:
1. Create a free account at [uptimerobot.com](https://uptimerobot.com)
2. Add a new **HTTP(s)** monitor
3. Set the URL to your deployed app (e.g. `https://your-app.vercel.app`)
4. Set the monitoring interval to **5 minutes**

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Run ESLint
```
