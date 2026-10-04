-- 0006_notifications_disputes_reviews_reports.sql

create type public.notification_type as enum (
  'message','listing_approved','listing_rejected','listing_sold','order_created',
  'order_updated','escrow_created','payment_received','payment_failed',
  'delivery_submitted','buyer_confirmation','funds_released','refund_issued',
  'withdrawal_completed','verification_approved','verification_rejected',
  'review_received','account_warning','system_announcement'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_alerts boolean not null default true,
  message_alerts boolean not null default true,
  sales_alerts boolean not null default true,
  purchase_alerts boolean not null default true,
  review_alerts boolean not null default true,
  promotion_alerts boolean not null default false,
  security_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id),
  buyer_id uuid not null references auth.users (id),
  seller_id uuid not null references auth.users (id),
  reason text not null check (reason in (
    'incorrect_account','wrong_details','account_recovered','missing_players',
    'fake_screenshots','unauthorized_changes','other'
  )),
  description text not null,
  status text not null default 'open'
    check (status in ('open','under_review','resolved_refund','resolved_release','closed')),
  resolution_note text,
  handled_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index disputes_status_idx on public.disputes (status);

create table public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  uploader_id uuid not null references auth.users (id),
  kind text not null check (kind in ('image','video','document','text')),
  storage_path text,
  body text,
  created_at timestamptz not null default now()
);

create index dispute_evidence_dispute_idx on public.dispute_evidence (dispute_id);

create table public.dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  sender_id uuid not null references auth.users (id),
  body text not null,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index dispute_messages_dispute_idx on public.dispute_messages (dispute_id, created_at);

create table public.dispute_decisions (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  admin_id uuid not null references auth.users (id),
  outcome text not null check (outcome in ('refund','partial_refund','release_funds','rejected','escalated')),
  amount integer,
  note text,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id),
  reviewer_id uuid not null references auth.users (id),
  seller_id uuid not null references auth.users (id),
  rating integer not null check (rating between 1 and 5),
  title text check (char_length(title) <= 140),
  body text check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index reviews_seller_idx on public.reviews (seller_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id),
  target_type text not null check (target_type in ('listing','user','message','conversation','review')),
  target_id uuid not null,
  reason text not null check (reason in (
    'fraud','spam','fake_screenshots','incorrect_info','copyright',
    'scam','abusive','harassment','other'
  )),
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  handled_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_evidence enable row level security;
alter table public.dispute_messages enable row level security;
alter table public.dispute_decisions enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;

create policy notifications_own on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notification_preferences_own on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy disputes_read on public.disputes
  for select using (auth.uid() in (buyer_id, seller_id) or public.is_moderator());
create policy disputes_insert on public.disputes
  for insert with check (auth.uid() = buyer_id);
create policy disputes_admin_update on public.disputes
  for update using (public.is_moderator());

create policy dispute_evidence_read on public.dispute_evidence
  for select using (
    exists (select 1 from public.disputes d where d.id = dispute_id
      and (d.buyer_id = auth.uid() or d.seller_id = auth.uid() or public.is_moderator()))
  );
create policy dispute_evidence_insert on public.dispute_evidence
  for insert with check (auth.uid() = uploader_id);

create policy dispute_messages_read on public.dispute_messages
  for select using (
    (not internal and exists (select 1 from public.disputes d where d.id = dispute_id
      and (d.buyer_id = auth.uid() or d.seller_id = auth.uid())))
    or public.is_moderator()
  );
create policy dispute_messages_insert on public.dispute_messages
  for insert with check (
    auth.uid() = sender_id and exists (select 1 from public.disputes d where d.id = dispute_id
      and (d.buyer_id = auth.uid() or d.seller_id = auth.uid() or public.is_moderator()))
  );

create policy dispute_decisions_read on public.dispute_decisions
  for select using (
    exists (select 1 from public.disputes d where d.id = dispute_id
      and (d.buyer_id = auth.uid() or d.seller_id = auth.uid() or public.is_moderator()))
  );
create policy dispute_decisions_admin_write on public.dispute_decisions
  for insert with check (public.is_moderator());

create policy reviews_read on public.reviews for select using (true);
create policy reviews_insert on public.reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (select 1 from public.orders o where o.id = order_id
      and o.buyer_id = auth.uid() and o.status = 'completed')
  );

create policy reports_insert on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy reports_read on public.reports
  for select using (auth.uid() = reporter_id or public.is_moderator());
create policy reports_admin_update on public.reports
  for update using (public.is_moderator());
