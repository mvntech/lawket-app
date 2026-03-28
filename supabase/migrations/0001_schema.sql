-- =============================================================================
-- lawket – complete database schema
-- apply once to a fresh database with: supabase db reset
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. extensions
-- ---------------------------------------------------------------------------

create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "pg_net";


-- ---------------------------------------------------------------------------
-- 1. enums
-- ---------------------------------------------------------------------------

create type case_status as enum ('active', 'pending', 'closed', 'archived');

create type case_type as enum (
  'civil', 'criminal', 'family', 'corporate',
  'property', 'constitutional', 'tax', 'labour', 'other'
);

create type deadline_priority as enum ('low', 'medium', 'high', 'critical');

create type contact_role as enum (
  'client', 'opposing_counsel', 'judge',
  'witness', 'expert', 'court_staff', 'other'
);

create type document_type as enum (
  'petition', 'affidavit', 'evidence', 'order',
  'judgment', 'correspondence', 'contract', 'other'
);

create type notification_type as enum (
  'hearing_reminder', 'deadline_reminder', 'case_update', 'system'
);


-- ---------------------------------------------------------------------------
-- 2. shared trigger function – keeps updated_at current on every write
-- ---------------------------------------------------------------------------

create or replace function update_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. core tables  (in FK-dependency order)
-- ---------------------------------------------------------------------------

-- profiles  (one row per auth.users row; created automatically via trigger)
create table public.profiles (
  id                uuid        references auth.users(id) on delete cascade primary key,
  full_name         text        not null,
  email             text        not null unique,
  bar_number        text,
  phone             text,
  avatar_url        text,
  push_subscription jsonb,
  timezone          text        not null default 'Asia/Karachi',
  org_id            uuid,
  is_active         boolean     not null default true,
  last_seen_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

-- cases
create table public.cases (
  id             uuid        default uuid_generate_v4() primary key,
  user_id        uuid        references public.profiles(id) on delete cascade not null,
  org_id         uuid,
  case_number    text        not null,
  title          text        not null,
  client_name    text        not null,
  client_contact text,
  opposing_party text,
  court_name     text,
  judge_name     text,
  case_type      case_type   not null default 'other',
  status         case_status not null default 'active',
  description    text,
  notes          text,
  filed_date     date,
  is_deleted     boolean     not null default false,
  deleted_at     timestamptz,
  deleted_by     uuid        references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index cases_user_id_idx on public.cases(user_id) where not is_deleted;
create index cases_status_idx  on public.cases(status)  where not is_deleted;
create index cases_search_idx  on public.cases using gin(
  to_tsvector('english', title || ' ' || client_name || ' ' || coalesce(case_number, ''))
);

create trigger cases_updated_at
  before update on public.cases
  for each row execute function update_updated_at();

-- hearings
create table public.hearings (
  id                uuid        default uuid_generate_v4() primary key,
  case_id           uuid        references public.cases(id) on delete cascade not null,
  user_id           uuid        references public.profiles(id) on delete cascade not null,
  title             text        not null,
  hearing_date      date        not null,
  hearing_time      time,
  court_name        text,
  court_room        text,
  judge_name        text,
  notes             text,
  reminder_24h_sent boolean     not null default false,
  reminder_1h_sent  boolean     not null default false,
  is_deleted        boolean     not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index hearings_case_id_idx on public.hearings(case_id)      where not is_deleted;
create index hearings_date_idx    on public.hearings(hearing_date) where not is_deleted;
create index hearings_user_id_idx on public.hearings(user_id)      where not is_deleted;

create trigger hearings_updated_at
  before update on public.hearings
  for each row execute function update_updated_at();

-- deadlines
create table public.deadlines (
  id            uuid              default uuid_generate_v4() primary key,
  case_id       uuid              references public.cases(id) on delete cascade not null,
  user_id       uuid              references public.profiles(id) on delete cascade not null,
  title         text              not null,
  due_date      date              not null,
  due_time      time,
  priority      deadline_priority not null default 'medium',
  is_completed  boolean           not null default false,
  completed_at  timestamptz,
  notes         text,
  reminder_sent boolean           not null default false,
  is_deleted    boolean           not null default false,
  deleted_at    timestamptz,
  created_at    timestamptz       not null default now(),
  updated_at    timestamptz       not null default now()
);

create index deadlines_case_id_idx  on public.deadlines(case_id)  where not is_deleted;
create index deadlines_due_date_idx on public.deadlines(due_date) where not is_deleted;
create index deadlines_user_id_idx  on public.deadlines(user_id)  where not is_deleted;

create trigger deadlines_updated_at
  before update on public.deadlines
  for each row execute function update_updated_at();

-- documents
create table public.documents (
  id         uuid          default uuid_generate_v4() primary key,
  case_id    uuid          references public.cases(id) on delete cascade not null,
  user_id    uuid          references public.profiles(id) on delete cascade not null,
  name       text          not null,
  file_path  text          not null,
  file_size  bigint,
  mime_type  text,
  doc_type   document_type not null default 'other',
  notes      text,
  is_deleted boolean       not null default false,
  deleted_at timestamptz,
  created_at timestamptz   not null default now()
);

create index documents_case_id_idx on public.documents(case_id) where not is_deleted;
create index documents_user_id_idx on public.documents(user_id) where not is_deleted;

-- contacts
create table public.contacts (
  id           uuid         default uuid_generate_v4() primary key,
  user_id      uuid         references public.profiles(id) on delete cascade not null,
  full_name    text         not null,
  role         contact_role not null default 'other',
  email        text,
  phone        text,
  organization text,
  notes        text,
  is_deleted   boolean      not null default false,
  deleted_at   timestamptz,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function update_updated_at();

-- case_contacts  (many-to-many junction)
create table public.case_contacts (
  case_id    uuid references public.cases(id)    on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  primary key (case_id, contact_id)
);

-- notification_logs
create table public.notification_logs (
  id           uuid              default uuid_generate_v4() primary key,
  user_id      uuid              references public.profiles(id) on delete cascade not null,
  case_id      uuid              references public.cases(id) on delete set null,
  title        text              not null,
  body         text              not null,
  type         notification_type not null,
  reference_id uuid,
  is_read      boolean           not null default false,
  read_at      timestamptz,
  sent_at      timestamptz       not null default now()
);

create index notif_user_id_idx on public.notification_logs(user_id);
create index notif_unread_idx  on public.notification_logs(user_id, is_read);

-- audit_logs  (append-only; written by triggers, not application code)
create table public.audit_logs (
  id         bigserial   primary key,
  user_id    uuid        references public.profiles(id),
  action     text        not null,
  table_name text        not null,
  record_id  uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_user_id_idx    on public.audit_logs(user_id);
create index audit_record_id_idx  on public.audit_logs(record_id);
create index audit_created_at_idx on public.audit_logs(created_at desc);

-- ai_conversations
-- case_id is nullable: null = general (no-case) conversation
create table public.ai_conversations (
  id         uuid        default uuid_generate_v4() primary key,
  case_id    uuid        references public.cases(id) on delete cascade, -- nullable
  user_id    uuid        references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- one conversation per case per user  (case-scoped)
create unique index ai_conv_case_user_idx
  on public.ai_conversations(case_id, user_id)
  where case_id is not null;

-- one general conversation per user
create unique index ai_conv_general_user_idx
  on public.ai_conversations(user_id)
  where case_id is null;

create trigger ai_conv_updated_at
  before update on public.ai_conversations
  for each row execute function update_updated_at();

-- ai_messages
create table public.ai_messages (
  id              uuid        default uuid_generate_v4() primary key,
  conversation_id uuid        references public.ai_conversations(id) on delete cascade not null,
  role            text        not null check (role in ('user', 'assistant')),
  content         text        not null,
  type            text        not null default 'text'
                              check (type in ('text', 'prompt_trigger', 'document_ref', 'file_upload')),
  metadata        jsonb,
  credits_used    integer     default 0,
  created_at      timestamptz not null default now()
);

create index ai_messages_conv_idx on public.ai_messages(conversation_id, created_at asc);

-- ai_usage  (per-request token tracking for rate-limiting)
create table public.ai_usage (
  id          uuid        default uuid_generate_v4() primary key,
  user_id     uuid        references public.profiles(id) on delete cascade not null,
  feature     text        not null,
  tokens_used integer,
  created_at  timestamptz not null default now()
);

create index ai_usage_user_date on public.ai_usage(user_id, created_at desc);

-- credits  (one row per user, balance enforced >= 0)
create table public.credits (
  id                  uuid        default uuid_generate_v4() primary key,
  user_id             uuid        references public.profiles(id) on delete cascade not null unique,
  balance             integer     not null default 0 check (balance >= 0),
  lifetime_earned     integer     not null default 0,
  ad_credits_today    integer     not null default 0,
  ad_credits_reset_at date        not null default current_date,
  updated_at          timestamptz not null default now()
);

create trigger credits_updated_at
  before update on public.credits
  for each row execute function update_updated_at();

-- credit_transactions  (immutable ledger)
create table public.credit_transactions (
  id          uuid        default uuid_generate_v4() primary key,
  user_id     uuid        references public.profiles(id) on delete cascade not null,
  amount      integer     not null,
  type        text        not null check (type in (
                            'signup_bonus', 'purchase', 'ad_reward',
                            'ai_use', 'refund', 'manual_adjustment'
                          )),
  description text,
  reference   text,
  created_at  timestamptz not null default now()
);

create index credit_tx_user_idx on public.credit_transactions(user_id);
create index credit_tx_date_idx on public.credit_transactions(user_id, created_at desc);


-- ---------------------------------------------------------------------------
-- 4. row level security
-- ---------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.cases               enable row level security;
alter table public.hearings            enable row level security;
alter table public.deadlines           enable row level security;
alter table public.documents           enable row level security;
alter table public.contacts            enable row level security;
alter table public.case_contacts       enable row level security;
alter table public.notification_logs   enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.ai_conversations    enable row level security;
alter table public.ai_messages         enable row level security;
alter table public.ai_usage            enable row level security;
alter table public.credits             enable row level security;
alter table public.credit_transactions enable row level security;

-- profiles
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- cases
create policy "cases_select" on public.cases
  for select using (auth.uid() = user_id and not is_deleted);

create policy "cases_insert" on public.cases
  for insert with check (auth.uid() = user_id);

-- single update policy: application code controls which fields are written
create policy "cases_update" on public.cases
  for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- hard-delete is only allowed on rows already soft-deleted
create policy "cases_perm_delete" on public.cases
  for delete using (auth.uid() = user_id and is_deleted = true);

-- hearings
create policy "hearings_select" on public.hearings
  for select using (auth.uid() = user_id and not is_deleted);

create policy "hearings_insert" on public.hearings
  for insert with check (auth.uid() = user_id);

create policy "hearings_update" on public.hearings
  for update using (auth.uid() = user_id);

-- deadlines
create policy "deadlines_select" on public.deadlines
  for select using (auth.uid() = user_id and not is_deleted);

create policy "deadlines_insert" on public.deadlines
  for insert with check (auth.uid() = user_id);

create policy "deadlines_update" on public.deadlines
  for update using (auth.uid() = user_id);

-- documents
create policy "documents_select" on public.documents
  for select using (auth.uid() = user_id and not is_deleted);

create policy "documents_insert" on public.documents
  for insert with check (auth.uid() = user_id);

create policy "documents_update" on public.documents
  for update using (auth.uid() = user_id);

-- contacts
create policy "contacts_select" on public.contacts
  for select using (auth.uid() = user_id and not is_deleted);

create policy "contacts_insert" on public.contacts
  for insert with check (auth.uid() = user_id);

create policy "contacts_update" on public.contacts
  for update using (auth.uid() = user_id);

-- case_contacts  (access derived from parent case ownership)
create policy "case_contacts_select" on public.case_contacts
  for select using (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.user_id = auth.uid() and not c.is_deleted
    )
  );

create policy "case_contacts_insert" on public.case_contacts
  for insert with check (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.user_id = auth.uid() and not c.is_deleted
    )
  );

create policy "case_contacts_delete" on public.case_contacts
  for delete using (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.user_id = auth.uid() and not c.is_deleted
    )
  );

-- notification_logs
create policy "notif_own" on public.notification_logs
  for all using (auth.uid() = user_id);

-- audit_logs  (read-only for the owning user; written only by server triggers)
create policy "audit_select" on public.audit_logs
  for select using (auth.uid() = user_id);

-- ai_conversations
create policy "ai_conv_own" on public.ai_conversations
  for all using (auth.uid() = user_id);

-- ai_messages  (access via parent conversation ownership)
create policy "ai_msg_own" on public.ai_messages
  for all using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- ai_usage
create policy "ai_usage_own" on public.ai_usage
  for all using (auth.uid() = user_id);

-- credits
create policy "credits_own" on public.credits
  for all using (auth.uid() = user_id);

-- credit_transactions
create policy "credit_tx_own" on public.credit_transactions
  for all using (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 5. audit trigger  (case inserts and updates → audit_logs)
-- ---------------------------------------------------------------------------

create or replace function audit_case_changes()
returns trigger
language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_logs(user_id, action, table_name, record_id, new_values)
    values (new.user_id, 'case.created', 'cases', new.id, to_jsonb(new));
  elsif TG_OP = 'UPDATE' then
    insert into public.audit_logs(user_id, action, table_name, record_id, old_values, new_values)
    values (new.user_id, 'case.updated', 'cases', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger audit_cases
  after insert or update on public.cases
  for each row execute function audit_case_changes();


-- ---------------------------------------------------------------------------
-- 6. auth trigger  (auto-create profile row on sign-up)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
    set email     = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant usage         on schema public     to supabase_auth_admin;
grant insert, update on public.profiles  to supabase_auth_admin;


-- ---------------------------------------------------------------------------
-- 7. credits functions
-- ---------------------------------------------------------------------------

-- grant 10 free credits when a profile row is first created
create or replace function handle_new_user_credits()
returns trigger
language plpgsql security definer as $$
begin
  insert into public.credits (user_id, balance, lifetime_earned)
  values (new.id, 10, 10);

  insert into public.credit_transactions (user_id, amount, type, description)
  values (new.id, 10, 'signup_bonus', 'Welcome to Lawket - 10 free credits');

  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function handle_new_user_credits();

-- atomic deduction via row-level lock (prevents race conditions)
create or replace function deduct_credits(
  p_user_id     uuid,
  p_amount      integer,
  p_description text,
  p_reference   text default null
)
returns jsonb
language plpgsql security definer as $$
declare
  v_balance     integer;
  v_new_balance integer;
begin
  select balance into v_balance
    from public.credits
    where user_id = p_user_id
    for update;

  if v_balance is null then
    return jsonb_build_object('success', false, 'error', 'No credits account found');
  end if;

  if v_balance < p_amount then
    return jsonb_build_object('success', false, 'error', 'Insufficient credits', 'balance', v_balance);
  end if;

  v_new_balance := v_balance - p_amount;

  update public.credits
    set balance    = v_new_balance,
        updated_at = now()
    where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, type, description, reference)
  values (p_user_id, -p_amount, 'ai_use', p_description, p_reference);

  return jsonb_build_object('success', true, 'balance', v_new_balance);
end;
$$;


-- ---------------------------------------------------------------------------
-- 8. storage buckets
-- ---------------------------------------------------------------------------

-- private bucket for legal documents  (50 MB per file)
-- file path convention: {user_id}/{case_id}/{timestamp}_{filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lawket-documents',
  'lawket-documents',
  false,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

create policy "storage_own_folder" on storage.objects
  for all
  using (
    bucket_id = 'lawket-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'lawket-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- public bucket for user avatars  (2 MB per file)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- users manage only their own folder; the bucket is public so anyone can read
create policy "avatars_own_folder" on storage.objects
  for all
  using  (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');


-- ---------------------------------------------------------------------------
-- 9. cron  (daily hearing/deadline reminders – 04:00 UTC = 09:00 PKT)
-- ---------------------------------------------------------------------------

select cron.schedule(
  'daily-reminders',
  '0 4 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.supabase_functions_url') || '/send-reminders',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || current_setting('app.service_role_key')
               ),
    body    := '{}'::jsonb
  )
  $$
);
