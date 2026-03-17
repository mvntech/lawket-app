-- migration 001 — initial schema

-- extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "pg_net";

-- enums

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

-- updated_at trigger function

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- profiles

create table public.profiles (
  id                uuid references auth.users(id) on delete cascade primary key,
  full_name         text not null,
  email             text not null unique,
  bar_number        text,
  phone             text,
  avatar_url        text,
  push_subscription jsonb,
  timezone          text not null default 'Asia/Karachi',
  org_id            uuid,
  is_active         boolean not null default true,
  last_seen_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

-- cases

create table public.cases (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  org_id          uuid,
  case_number     text not null,
  title           text not null,
  client_name     text not null,
  client_contact  text,
  opposing_party  text,
  court_name      text,
  judge_name      text,
  case_type       case_type not null default 'other',
  status          case_status not null default 'active',
  description     text,
  notes           text,
  filed_date      date,
  is_deleted      boolean not null default false,
  deleted_at      timestamptz,
  deleted_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index cases_user_id_idx on public.cases(user_id) where not is_deleted;
create index cases_status_idx  on public.cases(status)  where not is_deleted;
create index cases_search_idx  on public.cases using gin(
  to_tsvector('english', title || ' ' || client_name || ' ' || coalesce(case_number,''))
);

create trigger cases_updated_at
  before update on public.cases
  for each row execute function update_updated_at();

-- hearings

create table public.hearings (
  id                  uuid default uuid_generate_v4() primary key,
  case_id             uuid references public.cases(id) on delete cascade not null,
  user_id             uuid references public.profiles(id) on delete cascade not null,
  title               text not null,
  hearing_date        date not null,
  hearing_time        time,
  court_name          text,
  court_room          text,
  judge_name          text,
  notes               text,
  reminder_24h_sent   boolean not null default false,
  reminder_1h_sent    boolean not null default false,
  is_deleted          boolean not null default false,
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index hearings_case_id_idx on public.hearings(case_id)      where not is_deleted;
create index hearings_date_idx    on public.hearings(hearing_date) where not is_deleted;
create index hearings_user_id_idx on public.hearings(user_id)      where not is_deleted;

create trigger hearings_updated_at
  before update on public.hearings
  for each row execute function update_updated_at();

-- ─── DEADLINES ───────────────────────────────────────────────────

create table public.deadlines (
  id              uuid default uuid_generate_v4() primary key,
  case_id         uuid references public.cases(id) on delete cascade not null,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  title           text not null,
  due_date        date not null,
  due_time        time,
  priority        deadline_priority not null default 'medium',
  is_completed    boolean not null default false,
  completed_at    timestamptz,
  notes           text,
  reminder_sent   boolean not null default false,
  is_deleted      boolean not null default false,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index deadlines_case_id_idx  on public.deadlines(case_id)  where not is_deleted;
create index deadlines_due_date_idx on public.deadlines(due_date) where not is_deleted;
create index deadlines_user_id_idx  on public.deadlines(user_id)  where not is_deleted;

create trigger deadlines_updated_at
  before update on public.deadlines
  for each row execute function update_updated_at();

-- ─── DOCUMENTS ───────────────────────────────────────────────────

create table public.documents (
  id              uuid default uuid_generate_v4() primary key,
  case_id         uuid references public.cases(id) on delete cascade not null,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  name            text not null,
  file_path       text not null,
  file_size       bigint,
  mime_type       text,
  doc_type        document_type not null default 'other',
  notes           text,
  is_deleted      boolean not null default false,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index documents_case_id_idx on public.documents(case_id) where not is_deleted;
create index documents_user_id_idx on public.documents(user_id) where not is_deleted;

-- ─── CONTACTS ────────────────────────────────────────────────────

create table public.contacts (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  full_name       text not null,
  role            contact_role not null default 'other',
  email           text,
  phone           text,
  organization    text,
  notes           text,
  is_deleted      boolean not null default false,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function update_updated_at();

-- ─── CASE_CONTACTS (junction) ────────────────────────────────────

create table public.case_contacts (
  case_id         uuid references public.cases(id) on delete cascade,
  contact_id      uuid references public.contacts(id) on delete cascade,
  primary key (case_id, contact_id)
);

-- ─── NOTIFICATION_LOGS ───────────────────────────────────────────

create table public.notification_logs (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  case_id         uuid references public.cases(id) on delete set null,
  title           text not null,
  body            text not null,
  type            notification_type not null,
  reference_id    uuid,
  is_read         boolean not null default false,
  read_at         timestamptz,
  sent_at         timestamptz not null default now()
);

create index notif_user_id_idx on public.notification_logs(user_id);
create index notif_unread_idx  on public.notification_logs(user_id, is_read);
