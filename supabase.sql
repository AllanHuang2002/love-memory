create table public.allowed_users (
  email text primary key,
  created_at timestamptz default now()
);

create table public.love_items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('wish', 'project', 'anniversary')),
  title text not null,
  description text,
  event_date date,
  status text default 'todo' check (status in ('todo', 'doing', 'done')),
  image_url text,
  sort_order int default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.period_ranges (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  created_by uuid default auth.uid(),
  created_at timestamptz default now(),
  check (start_date <= end_date)
);

alter table public.allowed_users enable row level security;
alter table public.love_items enable row level security;
alter table public.period_ranges enable row level security;

create policy "allowed users can read themselves"
on public.allowed_users
for select
to authenticated
using (email = auth.jwt() ->> 'email');

create policy "allowed users can read love items"
on public.love_items
for select
to authenticated
using (
  exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  )
);

create policy "anyone can read love items"
on public.love_items
for select
to anon
using (true);

create policy "allowed users can insert love items"
on public.love_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  )
);

create policy "allowed users can update love items"
on public.love_items
for update
to authenticated
using (
  exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  )
)
with check (
  exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  )
);

create policy "allowed users can delete love items"
on public.love_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.allowed_users
    where email = auth.jwt() ->> 'email'
  )
);

create policy "anyone can read period ranges"
on public.period_ranges
for select
to anon, authenticated
using (true);

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

-- Replace these with the email addresses that may manage the page.
insert into public.allowed_users (email)
values
  ('you@example.com'),
  ('partner@example.com');
