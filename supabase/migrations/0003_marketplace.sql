-- 0003_marketplace.sql
-- Platforms, categories, listings, images, favorites, saved searches, views.

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platforms (name, slug) values
  ('PlayStation', 'playstation'),
  ('Xbox', 'xbox'),
  ('PC', 'pc'),
  ('Mobile', 'mobile');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seller_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  description text check (char_length(description) <= 2000),
  payout_method text not null default 'mpesa' check (payout_method in ('mpesa')),
  payout_details jsonb not null default '{}'::jsonb,
  status text not null default 'unverified'
    check (status in ('unverified','pending','under_review','approved','rejected','resubmission_required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.seller_verification (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles (user_id) on delete cascade,
  document_type text not null check (document_type in ('government_id','selfie','phone','email','other')),
  document_path text not null,
  status text not null default 'pending'
    check (status in ('pending','under_review','approved','rejected','resubmission_required')),
  reviewer_id uuid references auth.users (id),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index seller_verification_seller_idx on public.seller_verification (seller_id, status);

create type public.listing_status as enum (
  'draft','pending_review','approved','rejected','published','sold','archived'
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles (user_id),
  platform_id uuid not null references public.platforms (id),
  category_id uuid references public.categories (id),
  title text not null check (char_length(title) between 5 and 140),
  description text not null check (char_length(description) >= 20),
  price_amount integer not null check (price_amount > 0),
  currency char(3) not null default 'KES',
  status public.listing_status not null default 'draft',
  -- Account attributes
  game_version text,
  region text,
  account_level integer check (account_level >= 0),
  overall_strength integer check (overall_strength between 0 and 100),
  gp_balance integer check (gp_balance >= 0),
  coin_balance integer check (coin_balance >= 0),
  ef_points integer check (ef_points >= 0),
  contract_renewal_tickets integer check (contract_renewal_tickets >= 0),
  chance_deals integer check (chance_deals >= 0),
  booster_tokens integer check (booster_tokens >= 0),
  training_programs integer check (training_programs >= 0),
  player_slots integer check (player_slots >= 0),
  legend_players integer,
  epic_players integer,
  big_time_players integer,
  highlight_players integer,
  featured_players integer,
  national_team_packs integer,
  club_packs integer,
  manager text,
  formation text,
  playstyle text,
  possession_rating integer check (possession_rating between 0 and 99),
  quick_counter_rating integer check (quick_counter_rating between 0 and 99),
  long_ball_counter_rating integer check (long_ball_counter_rating between 0 and 99),
  out_wide_rating integer check (out_wide_rating between 0 and 99),
  long_ball_rating integer check (long_ball_rating between 0 and 99),
  current_division text,
  highest_division text,
  dream_team_name text,
  matches_played integer check (matches_played >= 0),
  wins integer check (wins >= 0),
  draws integer check (draws >= 0),
  losses integer check (losses >= 0),
  goals_scored integer check (goals_scored >= 0),
  goals_conceded integer check (goals_conceded >= 0),
  account_age_days integer check (account_age_days >= 0),
  linked_email_status text check (linked_email_status in ('linked','unlinked','unknown')),
  konami_id_status text check (konami_id_status in ('linked','unlinked','unknown')),
  transferable boolean not null default true,
  -- Metrics
  views_count integer not null default 0,
  favorites_count integer not null default 0,
  shares_count integer not null default 0,
  search_rank double precision not null default 0,
  -- Review metadata
  rejection_reason text,
  featured boolean not null default false,
  -- Timestamps & soft delete
  published_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index listings_seller_idx on public.listings (seller_id, status);
create index listings_platform_idx on public.listings (platform_id);
create index listings_status_idx on public.listings (status, published_at desc);
create index listings_price_idx on public.listings (price_amount);
create index listings_title_trgm_idx on public.listings using gin (title gin_trgm_ops);
create index listings_title_fts_idx on public.listings
  using gin (to_tsvector('english', title || ' ' || description));

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index listing_images_listing_idx on public.listing_images (listing_id, sort_order);

create table public.listing_videos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create index listing_videos_listing_idx on public.listing_videos (listing_id);

create table public.listing_stats (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  views_count integer not null default 0,
  clicks_count integer not null default 0,
  favorites_count integer not null default 0,
  purchases_count integer not null default 0,
  conversion_rate numeric(6,4) not null default 0,
  updated_at timestamptz not null default now()
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index favorites_user_idx on public.favorites (user_id, created_at desc);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  query jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_searches_user_idx on public.saved_searches (user_id);

create table public.recently_viewed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index recently_viewed_user_idx on public.recently_viewed (user_id, viewed_at desc);

create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  query text not null,
  results_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index search_history_user_idx on public.search_history (user_id, created_at desc);
create index search_history_query_idx on public.search_history (query);

alter table public.platforms enable row level security;
alter table public.categories enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.seller_verification enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.listing_videos enable row level security;
alter table public.listing_stats enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.search_history enable row level security;

create policy platforms_read on public.platforms for select using (true);
create policy categories_read on public.categories for select using (true);

create policy seller_profiles_read on public.seller_profiles
  for select using (deleted_at is null);
create policy seller_profiles_self_write on public.seller_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy seller_verification_read on public.seller_verification
  for select using (auth.uid() = seller_id or public.is_moderator());
create policy seller_verification_write on public.seller_verification
  for insert with check (auth.uid() = seller_id);
create policy seller_verification_admin_update on public.seller_verification
  for update using (public.is_moderator());

create policy listings_public_read on public.listings
  for select using (
    (status = 'published' and deleted_at is null)
    or auth.uid() = seller_id
    or public.is_moderator()
  );
create policy listings_seller_insert on public.listings
  for insert with check (
    auth.uid() = seller_id
    and exists (select 1 from public.seller_profiles sp where sp.user_id = auth.uid())
  );
create policy listings_seller_update on public.listings
  for update using (auth.uid() = seller_id or public.is_moderator());
create policy listings_seller_delete on public.listings
  for delete using (auth.uid() = seller_id or public.is_admin());

create policy listing_images_read on public.listing_images
  for select using (
    exists (select 1 from public.listings l where l.id = listing_id
      and (l.status = 'published' or auth.uid() = l.seller_id or public.is_moderator()))
  );
create policy listing_images_seller_write on public.listing_images
  for all using (
    exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  ) with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

create policy listing_videos_read on public.listing_videos
  for select using (
    exists (select 1 from public.listings l where l.id = listing_id
      and (l.status = 'published' or auth.uid() = l.seller_id or public.is_moderator()))
  );
create policy listing_videos_seller_write on public.listing_videos
  for all using (
    exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  ) with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

create policy listing_stats_read on public.listing_stats for select using (true);

create policy favorites_own on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy saved_searches_own on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy recently_viewed_own on public.recently_viewed
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy search_history_own on public.search_history
  for select using (auth.uid() = user_id or public.is_admin());
create policy search_history_insert on public.search_history
  for insert with check (user_id is null or auth.uid() = user_id);

-- Keep listing_stats in sync without triggers on hot paths.
create or replace function public.increment_listing_counter(
  p_listing_id uuid, p_column text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_column not in ('views_count','favorites_count','shares_count','clicks_count','purchases_count') then
    raise exception 'invalid counter %', p_column;
  end if;
  execute format(
    'insert into public.listing_stats (listing_id, %I) values ($1, 1)
     on conflict (listing_id) do update set %I = public.listing_stats.%I + 1, updated_at = now()',
    p_column, p_column, p_column
  ) using p_listing_id;

  if p_column in ('views_count','favorites_count','shares_count') then
    execute format('update public.listings set %I = %I + 1 where id = $1', p_column, p_column)
      using p_listing_id;
  end if;
end;
$$;
