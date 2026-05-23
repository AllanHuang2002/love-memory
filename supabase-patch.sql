do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'allowed_users'
      and policyname = 'allowed users can read themselves'
  ) then
    create policy "allowed users can read themselves"
    on public.allowed_users
    for select
    to authenticated
    using (email = auth.jwt() ->> 'email');
  end if;
end
$$;

create table if not exists public.period_ranges (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  created_by uuid default auth.uid(),
  created_at timestamptz default now(),
  check (start_date <= end_date)
);

alter table public.period_ranges enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'period_ranges'
      and policyname = 'anyone can read period ranges'
  ) then
    create policy "anyone can read period ranges"
    on public.period_ranges
    for select
    to anon, authenticated
    using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'period_ranges'
      and policyname = 'allowed users can insert period ranges'
  ) then
    create policy "allowed users can insert period ranges"
    on public.period_ranges
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.allowed_users
        where email = auth.jwt() ->> 'email'
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'period_ranges'
      and policyname = 'allowed users can delete period ranges'
  ) then
    create policy "allowed users can delete period ranges"
    on public.period_ranges
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.allowed_users
        where email = auth.jwt() ->> 'email'
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'love_items'
      and policyname = 'anyone can read love items'
  ) then
    create policy "anyone can read love items"
    on public.love_items
    for select
    to anon
    using (true);
  end if;
end
$$;
