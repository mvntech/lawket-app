-- migration 002 — row level security policies

-- enable RLS on all tables
alter table public.profiles          enable row level security;
alter table public.cases             enable row level security;
alter table public.hearings          enable row level security;
alter table public.deadlines         enable row level security;
alter table public.documents         enable row level security;
alter table public.contacts          enable row level security;
alter table public.case_contacts     enable row level security;
alter table public.notification_logs enable row level security;
alter table public.audit_logs        enable row level security;

-- profiles

create policy "profiles_own" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- cases
-- no delete policy - soft delete only (is_deleted = true)

create policy "cases_select" on public.cases
  for select
  using (auth.uid() = user_id and not is_deleted);

create policy "cases_insert" on public.cases
  for insert
  with check (auth.uid() = user_id);

create policy "cases_update" on public.cases
  for update
  using (auth.uid() = user_id and not is_deleted);

-- hearings

create policy "hearings_select" on public.hearings
  for select
  using (auth.uid() = user_id and not is_deleted);

create policy "hearings_insert" on public.hearings
  for insert
  with check (auth.uid() = user_id);

create policy "hearings_update" on public.hearings
  for update
  using (auth.uid() = user_id);

-- deadlines

create policy "deadlines_select" on public.deadlines
  for select
  using (auth.uid() = user_id and not is_deleted);

create policy "deadlines_insert" on public.deadlines
  for insert
  with check (auth.uid() = user_id);

create policy "deadlines_update" on public.deadlines
  for update
  using (auth.uid() = user_id);

-- documents

create policy "documents_select" on public.documents
  for select
  using (auth.uid() = user_id and not is_deleted);

create policy "documents_insert" on public.documents
  for insert
  with check (auth.uid() = user_id);

create policy "documents_update" on public.documents
  for update
  using (auth.uid() = user_id);

-- contacts

create policy "contacts_select" on public.contacts
  for select
  using (auth.uid() = user_id and not is_deleted);

create policy "contacts_insert" on public.contacts
  for insert
  with check (auth.uid() = user_id);

create policy "contacts_update" on public.contacts
  for update
  using (auth.uid() = user_id);

-- case_contacts
-- access controlled through the parent case ownership

create policy "case_contacts_select" on public.case_contacts
  for select
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_id
        and c.user_id = auth.uid()
        and not c.is_deleted
    )
  );

create policy "case_contacts_insert" on public.case_contacts
  for insert
  with check (
    exists (
      select 1 from public.cases c
      where c.id = case_id
        and c.user_id = auth.uid()
        and not c.is_deleted
    )
  );

create policy "case_contacts_delete" on public.case_contacts
  for delete
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_id
        and c.user_id = auth.uid()
        and not c.is_deleted
    )
  );

-- notification_logs

create policy "notif_own" on public.notification_logs
  for all
  using (auth.uid() = user_id);

-- audit_logs

create policy "audit_select" on public.audit_logs
  for select
  using (auth.uid() = user_id);
