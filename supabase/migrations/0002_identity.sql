-- 0002_identity.sql
-- Identity, roles, sessions, and audit: the source of all authorization.

create type public.app_role as enum (
  'buyer',
  'seller',
  'verified_seller',
  'moderator',
  'customer_support',
  'administrator',
  'super_administrator'
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name public.app_role not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.roles (name, description) values
  ('buyer', 'Default marketplace buyer'),
  ('seller', 'Unverified seller'),
  ('verified_seller', 'Seller who passed verification'),
  ('moderator', 'Content moderator'),
  ('customer_support', 'Support agent'),
  ('administrator', 'Platform administrator'),
  ('super_administrator', 'Full platform control');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,24}$'),
  first_name text not null check (char_length(first_name) <= 80),
  last_name text not null check (char_length(last_name) <= 80),
  display_name text generated always as (first_name || ' ' || last_name) stored,
  bio text check (char_length(bio) <= 1000),
  country_code char(2),
  phone text,
  avatar_path text,
  language text not null default 'en',
  timezone text not null default 'Africa/Nairobi',
  marketing_opt_in boolean not null default false,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  status text not null default 'active'
    check (status in ('active','suspended','banned','deactivated','pending_deletion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index profiles_phone_unique
  on public.profiles (phone) where phone is not null;

create index profiles_country_idx on public.profiles (country_code);
create index profiles_status_idx on public.profiles (status);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, role_id)
);

create index user_roles_user_idx on public.user_roles (user_id);
create index user_roles_role_idx on public.user_roles (role_id);

create table public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  ip inet,
  user_agent text,
  success boolean not null,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index login_history_user_idx on public.login_history (user_id, created_at desc);
create index login_history_ip_idx on public.login_history (ip);

create table public.security_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event text not null,
  severity text not null default 'info'
    check (severity in ('debug','info','warn','error','critical')),
  ip inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index security_logs_user_idx on public.security_logs (user_id, created_at desc);
create index security_logs_event_idx on public.security_logs (event, created_at desc);

create table public.device_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_agent text not null,
  ip inet,
  country_code char(2),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, user_agent)
);

create index device_history_user_idx on public.device_history (user_id, last_seen_at desc);

-- Single role-bearing profile row backing RLS lookups.
create or replace view public.current_profile as
  select p.* from public.profiles p where p.id = auth.uid();

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.login_history enable row level security;
alter table public.security_logs enable row level security;
alter table public.device_history enable row level security;

create policy roles_read_all on public.roles
  for select using (true);

create policy profiles_read_public on public.profiles
  for select using (deleted_at is null);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy user_roles_read_own on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin());

create policy user_roles_admin_write on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

create policy login_history_read on public.login_history
  for select using (auth.uid() = user_id or public.is_admin());

create policy security_logs_read on public.security_logs
  for select using (auth.uid() = user_id or public.is_admin());

create policy device_history_read on public.device_history
  for select using (auth.uid() = user_id or public.is_admin());

-- Auto-provision profile + default buyer role on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer_role_id uuid;
begin
  insert into public.profiles (id, username, first_name, last_name, country_code, phone, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.raw_user_meta_data ->> 'country_code',
    new.raw_user_meta_data ->> 'phone',
    now(), now()
  )
  on conflict (id) do nothing;

  select id into buyer_role_id from public.roles where name = 'buyer';
  insert into public.user_roles (user_id, role_id) values (new.id, buyer_role_id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger set_updated_at_profiles before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at_user_roles before update on public.user_roles
  for each row execute function public.set_updated_at();
