-- 0007_admin_analytics_cms.sql
-- Admin audit, feature flags, system settings, CMS, analytics event store.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  action text not null,
  target_type text,
  target_id uuid,
  previous_value jsonb,
  new_value jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs (action, created_at desc);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value) values
  ('platform_fee_percent', '5'::jsonb),
  ('processing_fee_flat', '0'::jsonb),
  ('review_period_hours', '72'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('max_withdrawal_amount', '5000000'::jsonb);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null,
  author_id uuid references auth.users (id),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index articles_slug_idx on public.articles (slug);

create table public.article_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  author_id uuid not null references auth.users (id),
  body text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  event text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_event_idx on public.analytics_events (event, created_at desc);
create index analytics_events_user_idx on public.analytics_events (user_id, created_at desc);

alter table public.audit_logs enable row level security;
alter table public.feature_flags enable row level security;
alter table public.system_settings enable row level security;
alter table public.articles enable row level security;
alter table public.article_categories enable row level security;
alter table public.article_comments enable row level security;
alter table public.analytics_events enable row level security;

create policy audit_logs_admin_read on public.audit_logs for select using (public.is_admin());
create policy audit_logs_insert on public.audit_logs for insert with check (auth.uid() = actor_id);

create policy feature_flags_read on public.feature_flags for select using (true);
create policy feature_flags_admin_write on public.feature_flags
  for all using (public.is_admin()) with check (public.is_admin());

create policy system_settings_read on public.system_settings for select using (true);
create policy system_settings_admin_write on public.system_settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy articles_read on public.articles
  for select using (published_at is not null and deleted_at is null or public.is_admin());
create policy articles_admin_write on public.articles
  for all using (public.is_admin()) with check (public.is_admin());

create policy article_categories_read on public.article_categories for select using (true);

create policy article_comments_read on public.article_comments for select using (true);
create policy article_comments_insert on public.article_comments
  for insert with check (auth.uid() = author_id);

create policy analytics_insert on public.analytics_events
  for insert with check (user_id is null or auth.uid() = user_id);
create policy analytics_admin_read on public.analytics_events
  for select using (public.is_admin());
