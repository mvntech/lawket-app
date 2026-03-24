-- one conversation per case per user
create table public.ai_conversations (
  id          uuid default uuid_generate_v4() primary key,
  case_id     uuid references public.cases(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(case_id, user_id)
);

create trigger ai_conv_updated_at
  before update on public.ai_conversations
  for each row execute function update_updated_at();

-- individual messages
create table public.ai_messages (
  id              uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.ai_conversations(id) on delete cascade not null,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  type            text not null default 'text' check (type in ('text', 'prompt_trigger', 'document_ref', 'file_upload')),
  metadata        jsonb,
  credits_used    integer default 0,
  created_at      timestamptz not null default now()
);

create index ai_messages_conv_idx on public.ai_messages(conversation_id, created_at asc);

-- RLS
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy "ai_conv_own"
  on public.ai_conversations
  for all using (auth.uid() = user_id);

create policy "ai_msg_own"
  on public.ai_messages
  for all using (
    exists (
      select 1 from public.ai_conversations
      where id = conversation_id
      and user_id = auth.uid()
    )
  );
