-- 0005_messaging.sql
-- Conversations, members, messages, attachments, reactions, read receipts.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct','support','order','group')),
  order_id uuid references public.orders (id),
  last_message_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index conversations_kind_idx on public.conversations (kind);
create index conversations_order_idx on public.conversations (order_id);

create table public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('member','support_agent','admin')),
  pinned boolean not null default false,
  archived boolean not null default false,
  blocked boolean not null default false,
  last_read_message_id uuid,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id),
  kind text not null default 'text' check (kind in (
    'text','image','video','document','voice','system','order','escrow','payment','dispute'
  )),
  body text check (char_length(body) <= 8000),
  reply_to_id uuid references public.messages (id),
  forwarded_from_id uuid references public.messages (id),
  edited_at timestamptz,
  deleted_for_everyone_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id);
create index messages_body_fts_idx on public.messages
  using gin (to_tsvector('english', coalesce(body, '')));

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  kind text not null check (kind in ('image','video','document','voice')),
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index message_attachments_message_idx on public.message_attachments (message_id);

create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 16),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create table public.read_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table public.typing_status (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.online_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'offline' check (status in ('online','offline','away','invisible')),
  last_seen_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reactions enable row level security;
alter table public.read_receipts enable row level security;
alter table public.typing_status enable row level security;
alter table public.online_status enable row level security;

create policy conversations_read on public.conversations
  for select using (
    exists (select 1 from public.conversation_members cm
      where cm.conversation_id = id and cm.user_id = auth.uid())
    or public.is_admin()
  );

create policy conversation_members_read on public.conversation_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.conversation_members cm2
      where cm2.conversation_id = conversation_id and cm2.user_id = auth.uid())
    or public.is_admin()
  );

create policy messages_read on public.messages
  for select using (
    exists (select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid())
    or public.is_admin()
  );
create policy messages_insert on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid())
  );
create policy messages_update_own on public.messages
  for update using (auth.uid() = sender_id);

create policy message_attachments_read on public.message_attachments
  for select using (
    exists (select 1 from public.messages m
      join public.conversation_members cm on cm.conversation_id = m.conversation_id
      where m.id = message_id and cm.user_id = auth.uid())
  );
create policy message_attachments_write on public.message_attachments
  for insert with check (
    exists (select 1 from public.messages m where m.id = message_id and m.sender_id = auth.uid())
  );

create policy reactions_own on public.message_reactions
  for all using (
    exists (select 1 from public.messages m
      join public.conversation_members cm on cm.conversation_id = m.conversation_id
      where m.id = message_id and cm.user_id = auth.uid())
  );

create policy read_receipts_own on public.read_receipts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy typing_members on public.typing_status
  for all using (
    exists (select 1 from public.conversation_members cm
      where cm.conversation_id = typing_status.conversation_id and cm.user_id = auth.uid())
  );

create policy online_status_read on public.online_status for select using (true);
create policy online_status_self_write on public.online_status
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
