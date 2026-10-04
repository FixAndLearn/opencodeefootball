-- 0004_orders_escrow_payments.sql
-- Orders, escrow, M-Pesa payments, withdrawals. Financial records are immutable.

create type public.order_status as enum (
  'pending_payment','payment_received','waiting_seller','seller_delivered',
  'buyer_reviewing','completed','disputed','refunded','cancelled','expired'
);

create type public.escrow_status as enum (
  'pending','payment_initiated','payment_received','waiting_seller',
  'seller_delivered','buyer_reviewing','completed','refund_pending',
  'refunded','disputed','cancelled','expired'
);

create type public.payment_status as enum (
  'initiated','stk_sent','pending','success','failed','cancelled','refunded'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  listing_id uuid not null references public.listings (id),
  buyer_id uuid not null references auth.users (id),
  seller_id uuid not null references auth.users (id),
  status public.order_status not null default 'pending_payment',
  amount_total integer not null check (amount_total > 0),
  currency char(3) not null default 'KES',
  platform_fee integer not null default 0 check (platform_fee >= 0),
  processing_fee integer not null default 0 check (processing_fee >= 0),
  seller_net integer not null,
  delivery_payload jsonb,
  delivered_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  ip inet,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (seller_id <> buyer_id)
);

create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);
create index orders_status_idx on public.orders (status);
create unique index orders_active_listing_idx
  on public.orders (listing_id)
  where status in ('pending_payment','payment_received','waiting_seller','seller_delivered','buyer_reviewing','disputed');

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  listing_id uuid not null references public.listings (id),
  title text not null,
  unit_price integer not null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

create table public.escrow_accounts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id),
  buyer_id uuid not null references auth.users (id),
  seller_id uuid not null references auth.users (id),
  status public.escrow_status not null default 'pending',
  amount integer not null check (amount > 0),
  currency char(3) not null default 'KES',
  review_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index escrow_buyer_idx on public.escrow_accounts (buyer_id, created_at desc);
create index escrow_seller_idx on public.escrow_accounts (seller_id, created_at desc);
create index escrow_status_idx on public.escrow_accounts (status);

create table public.escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  escrow_id uuid not null references public.escrow_accounts (id) on delete cascade,
  kind text not null check (kind in (
    'payment_in','release','refund','partial_refund','fee_deduction'
  )),
  amount integer not null,
  currency char(3) not null default 'KES',
  reference text,
  actor_id uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now()
);

create index escrow_transactions_escrow_idx on public.escrow_transactions (escrow_id, created_at);

create table public.escrow_status_history (
  id uuid primary key default gen_random_uuid(),
  escrow_id uuid not null references public.escrow_accounts (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now()
);

create index escrow_status_history_idx on public.escrow_status_history (escrow_id, created_at);

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  buyer_id uuid not null references auth.users (id),
  amount integer not null check (amount > 0),
  currency char(3) not null default 'KES',
  phone text not null,
  merchant_reference text not null unique,
  checkout_request_id text unique,
  merchant_request_id text,
  status public.payment_status not null default 'initiated',
  raw_callback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index payment_requests_order_idx on public.payment_requests (order_id);
create index payment_requests_buyer_idx on public.payment_requests (buyer_id, created_at desc);

create table public.payment_verifications (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests (id),
  transaction_id text,
  receipt_number text unique,
  phone text,
  amount integer,
  currency char(3),
  verified boolean not null default false,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  receipt_number text not null unique,
  amount integer not null,
  currency char(3) not null default 'KES',
  phone text,
  transaction_time timestamptz,
  created_at timestamptz not null default now()
);

create table public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid references public.payment_requests (id),
  event text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index payment_logs_request_idx on public.payment_logs (payment_request_id, created_at);

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users (id),
  amount integer not null check (amount > 0),
  currency char(3) not null default 'KES',
  payout_method text not null default 'mpesa',
  payout_destination text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','processing','completed','failed','cancelled')),
  processed_by uuid references auth.users (id),
  processed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index withdrawals_seller_idx on public.withdrawals (seller_id, created_at desc);

-- Prevent duplicate active payment for the same order.
create unique index payment_requests_active_order_idx
  on public.payment_requests (order_id)
  where status in ('initiated','stk_sent','pending','success');

alter table public.orders enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_items enable row level security;
alter table public.escrow_accounts enable row level security;
alter table public.escrow_transactions enable row level security;
alter table public.escrow_status_history enable row level security;
alter table public.payment_requests enable row level security;
alter table public.payment_verifications enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.payment_logs enable row level security;
alter table public.withdrawals enable row level security;

create policy orders_read on public.orders
  for select using (auth.uid() in (buyer_id, seller_id) or public.is_admin());
create policy order_status_history_read on public.order_status_history
  for select using (
    exists (select 1 from public.orders o where o.id = order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid() or public.is_admin()))
  );
create policy order_items_read on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid() or public.is_admin()))
  );

create policy escrow_read on public.escrow_accounts
  for select using (auth.uid() in (buyer_id, seller_id) or public.is_admin());
create policy escrow_transactions_read on public.escrow_transactions
  for select using (
    exists (select 1 from public.escrow_accounts e where e.id = escrow_id
      and (e.buyer_id = auth.uid() or e.seller_id = auth.uid() or public.is_admin()))
  );
create policy escrow_status_history_read on public.escrow_status_history
  for select using (
    exists (select 1 from public.escrow_accounts e where e.id = escrow_id
      and (e.buyer_id = auth.uid() or e.seller_id = auth.uid() or public.is_admin()))
  );

create policy payment_requests_read on public.payment_requests
  for select using (auth.uid() = buyer_id or public.is_admin());
create policy payment_verifications_read on public.payment_verifications
  for select using (
    exists (select 1 from public.payment_requests pr where pr.id = payment_request_id
      and (pr.buyer_id = auth.uid() or public.is_admin()))
  );
create policy payment_receipts_read on public.payment_receipts
  for select using (
    exists (select 1 from public.orders o where o.id = order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid() or public.is_admin()))
  );
create policy payment_logs_admin on public.payment_logs
  for select using (public.is_admin());

create policy withdrawals_read on public.withdrawals
  for select using (auth.uid() = seller_id or public.is_admin());
create policy withdrawals_insert on public.withdrawals
  for insert with check (auth.uid() = seller_id);
create policy withdrawals_admin_update on public.withdrawals
  for update using (public.is_admin());
