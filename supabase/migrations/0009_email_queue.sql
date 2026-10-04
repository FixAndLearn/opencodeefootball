-- 0009_email_queue.sql
-- Async email delivery queue; a worker (cron/edge function) processes rows.

create table public.email_queue (
  id uuid primary key default gen_random_uuid(),
  to_address text not null,
  subject text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','sending','sent','failed','dead')),
  attempts integer not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_queue_status_idx on public.email_queue (status, scheduled_for);

alter table public.email_queue enable row level security;
create policy email_queue_admin_read on public.email_queue for select using (public.is_admin());
