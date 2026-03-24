  -- credits balance (one row per user
  create table public.credits (
    id                  uuid default uuid_generate_v4() primary key,
    user_id             uuid references public.profiles(id) on delete cascade not null unique,
    balance             integer not null default 0 check (balance >= 0),
    lifetime_earned     integer not null default 0,
    ad_credits_today    integer not null default 0,
    ad_credits_reset_at date not null default current_date,
    updated_at          timestamptz not null default now()
  );

  -- full transaction history
  create table public.credit_transactions (
    id          uuid default uuid_generate_v4() primary key,
    user_id     uuid references public.profiles(id) on delete cascade not null,
    amount      integer not null,
    type        text not null check (type in (
      'signup_bonus',
      'purchase',
      'ad_reward',
      'ai_use',
      'refund',
      'manual_adjustment'
    )),
    description text,
    reference   text,
    created_at  timestamptz not null default now()
  );

  -- indexes
  create index credit_tx_user_idx
    on public.credit_transactions(user_id);
  create index credit_tx_date_idx
    on public.credit_transactions(user_id, created_at desc);

  -- RLS
  alter table public.credits enable row level security;
  alter table public.credit_transactions enable row level security;

  create policy "credits_own"
    on public.credits
    for all using (auth.uid() = user_id);

  create policy "credit_tx_own"
    on public.credit_transactions
    for all using (auth.uid() = user_id);

  -- auto-create credits on signup (10 free credits for every new user)
  create or replace function handle_new_user_credits()
  returns trigger as $$
  begin
    insert into public.credits (
      user_id,
      balance,
      lifetime_earned
    ) values (
      new.id, 10, 10
    );
    insert into public.credit_transactions (
      user_id,
      amount,
      type,
      description
    ) values (
      new.id,
      10,
      'signup_bonus',
      'Welcome to Lawket — 10 free credits'
    );
    return new;
  end;
  $$ language plpgsql security definer;

  create trigger on_profile_created
    after insert on public.profiles
    for each row
    execute function handle_new_user_credits();

  -- atomic credit deduction via RPC (prevents race conditions)
  create or replace function deduct_credits(
    p_user_id     uuid,
    p_amount      integer,
    p_description text,
    p_reference   text default null
  )
  returns jsonb as $$
  declare
    v_balance     integer;
    v_new_balance integer;
  begin
    -- lock the row for update
    select balance into v_balance
      from public.credits
      where user_id = p_user_id
      for update;

    if v_balance is null then
      return jsonb_build_object(
        'success', false,
        'error', 'No credits account found'
      );
    end if;

    if v_balance < p_amount then
      return jsonb_build_object(
        'success', false,
        'error', 'Insufficient credits',
        'balance', v_balance
      );
    end if;

    v_new_balance := v_balance - p_amount;

    update public.credits
      set balance = v_new_balance,
          updated_at = now()
      where user_id = p_user_id;

    insert into public.credit_transactions (
      user_id, amount, type,
      description, reference
    ) values (
      p_user_id, -p_amount, 'ai_use',
      p_description, p_reference
    );

    return jsonb_build_object(
      'success', true,
      'balance', v_new_balance
    );
  end;
  $$ language plpgsql security definer;

  -- updated_at trigger
  create trigger credits_updated_at
    before update on public.credits
    for each row
    execute function update_updated_at();
