-- migration 003 — audit log

create table public.audit_logs (
  id              bigserial primary key,
  user_id         uuid references public.profiles(id),
  action          text not null,
  table_name      text not null,
  record_id       uuid,
  old_values      jsonb,
  new_values      jsonb,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index audit_user_id_idx    on public.audit_logs(user_id);
create index audit_record_id_idx  on public.audit_logs(record_id);
create index audit_created_at_idx on public.audit_logs(created_at desc);

-- audit_case_changes trigger function

create or replace function audit_case_changes()
returns trigger as $$
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
$$ language plpgsql security definer;

create trigger audit_cases
  after insert or update on public.cases
  for each row execute function audit_case_changes();
