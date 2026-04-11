-- Sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  passcode text,
  is_settled boolean default false,
  created_at timestamptz default now()
);

-- Members of a session
create table session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- Foreign currencies used in a session (SGD is the base, always rate = 1)
create table session_currencies (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  currency_code text not null,
  rate_to_sgd numeric(12,6) not null,
  created_at timestamptz default now(),
  unique(session_id, currency_code)
);

-- Expenses
create table expenses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  description text not null,
  amount numeric(12,2) not null,
  currency_code text not null default 'SGD',
  paid_by_member_id uuid references session_members(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by_email text,
  is_deleted boolean default false
);

-- Which members split a given expense (equal split among selected members)
create table expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade not null,
  member_id uuid references session_members(id) not null,
  unique(expense_id, member_id)
);

-- Confirmed settlement payments
create table settlements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  from_member_id uuid references session_members(id) not null,
  to_member_id uuid references session_members(id) not null,
  amount numeric(12,2) not null,
  settled_at timestamptz,
  settled_by_email text,
  unique(session_id, from_member_id, to_member_id)
);

-- Audit log for all expense and session changes
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) not null,
  expense_id uuid references expenses(id),
  action text not null check (action in ('CREATE', 'UPDATE', 'DELETE', 'SESSION_UPDATE', 'SETTLE', 'UNSETTLE', 'PAYMENT_CHECK', 'PAYMENT_UNCHECK', 'RATE_CHANGE')),
  changed_by_email text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table sessions enable row level security;
alter table session_members enable row level security;
alter table session_currencies enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;
alter table audit_logs enable row level security;

-- Public read policies (URL = access control for sessions)
create policy "Public read sessions"       on sessions        for select using (true);
create policy "Public read members"        on session_members for select using (true);
create policy "Public read currencies"     on session_currencies for select using (true);
create policy "Public read expenses"       on expenses        for select using (true);
create policy "Public read splits"         on expense_splits  for select using (true);
create policy "Public read settlements"    on settlements     for select using (true);
create policy "Public read audit logs"     on audit_logs      for select using (true);

-- All writes go through API routes using the service role key,
-- which bypasses RLS automatically — no insert/update/delete policies needed.
