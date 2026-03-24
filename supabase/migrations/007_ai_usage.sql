create table public.ai_usage (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  feature     text not null,
  tokens_used integer,
  created_at  timestamptz not null default now()
);

create index ai_usage_user_date
  on public.ai_usage(user_id, created_at desc);

alter table public.ai_usage
  enable row level security;

create policy "ai_usage_own"
  on public.ai_usage
  for all using (auth.uid() = user_id);
