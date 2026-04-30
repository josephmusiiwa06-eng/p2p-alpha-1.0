-- ============================================================
-- P2P Alpha — Initial Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- SCHOOLS
-- ─────────────────────────────────────────
create table public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  contact_email text,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- COACHES (extends Supabase auth.users)
-- ─────────────────────────────────────────
create table public.coaches (
  id          uuid primary key references auth.users(id) on delete cascade,
  school_id   uuid references public.schools(id),
  full_name   text not null,
  email       text not null,
  role        text default 'coach',
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- CHILDREN
-- ─────────────────────────────────────────
create table public.children (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references public.schools(id) on delete cascade,
  full_name     text not null,
  date_of_birth date not null,
  gender        text check (gender in ('male','female','other')),
  unique_code   text unique not null,
  notes         text,
  created_at    timestamptz default now()
);

-- Auto-generate unique code trigger
create or replace function generate_child_code()
returns trigger as $$
declare
  code text;
  exists boolean;
begin
  loop
    code := 'P2P-' || lpad(floor(random() * 1000)::text, 3, '0');
    select count(*) > 0 into exists from public.children where unique_code = code;
    exit when not exists;
  end loop;
  new.unique_code := code;
  return new;
end;
$$ language plpgsql;

create trigger set_child_code
  before insert on public.children
  for each row
  when (new.unique_code is null or new.unique_code = '')
  execute function generate_child_code();

-- ─────────────────────────────────────────
-- ASSESSMENTS
-- ─────────────────────────────────────────
create table public.assessments (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid references public.children(id) on delete cascade,
  coach_id        uuid references public.coaches(id),
  assessed_on     date not null default current_date,
  session_label   text,
  motor_score     int check (motor_score between 0 and 100),
  overall_rating  text check (overall_rating in ('Excellent','On track','Developing')),
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- ASSESSMENT RESULTS (one row per test)
-- ─────────────────────────────────────────
create table public.assessment_results (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   uuid references public.assessments(id) on delete cascade,
  test_name       text not null check (test_name in ('balance','shuttle','throw_catch','jump')),
  raw_value       numeric not null,
  unit            text not null,
  score_points    int check (score_points between 1 and 3),
  rating          text check (rating in ('Good','Average','Needs work'))
);

-- ─────────────────────────────────────────
-- REPORTS
-- ─────────────────────────────────────────
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  assessment_id    uuid references public.assessments(id) on delete cascade,
  strengths_text   text,
  improve_text     text,
  recommendations  text,
  share_token      text unique default encode(gen_random_bytes(16), 'hex'),
  generated_at     timestamptz default now()
);

-- ─────────────────────────────────────────
-- USEFUL VIEWS
-- ─────────────────────────────────────────

-- Latest assessment per child with test breakdown
create or replace view public.child_latest_assessment as
select
  c.id           as child_id,
  c.full_name,
  c.date_of_birth,
  c.unique_code,
  c.school_id,
  a.id           as assessment_id,
  a.assessed_on,
  a.motor_score,
  a.overall_rating,
  extract(year from age(a.assessed_on, c.date_of_birth)) as age_years
from public.children c
left join lateral (
  select * from public.assessments
  where child_id = c.id
  order by assessed_on desc
  limit 1
) a on true;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table public.schools           enable row level security;
alter table public.coaches           enable row level security;
alter table public.children          enable row level security;
alter table public.assessments       enable row level security;
alter table public.assessment_results enable row level security;
alter table public.reports           enable row level security;

-- Coaches can read/write their own school's data
create policy "coaches_own_school" on public.children
  for all using (
    school_id = (select school_id from public.coaches where id = auth.uid())
  );

create policy "coaches_own_assessments" on public.assessments
  for all using (
    child_id in (
      select id from public.children
      where school_id = (select school_id from public.coaches where id = auth.uid())
    )
  );

create policy "coaches_own_results" on public.assessment_results
  for all using (
    assessment_id in (
      select a.id from public.assessments a
      join public.children c on c.id = a.child_id
      where c.school_id = (select school_id from public.coaches where id = auth.uid())
    )
  );

-- Reports are readable via share_token (no auth required)
create policy "public_report_read" on public.reports
  for select using (true);

create policy "coaches_write_reports" on public.reports
  for insert with check (
    assessment_id in (
      select a.id from public.assessments a
      join public.children c on c.id = a.child_id
      where c.school_id = (select school_id from public.coaches where id = auth.uid())
    )
  );

create policy "coaches_read_own" on public.coaches
  for select using (id = auth.uid());

create policy "schools_read" on public.schools
  for select using (true);

-- ─────────────────────────────────────────
-- SEED: Demo school + coach (optional)
-- Update email to your Supabase auth user
-- ─────────────────────────────────────────
insert into public.schools (id, name, location, contact_email)
values (
  '00000000-0000-0000-0000-000000000001',
  'Sunflower Pre-Primary',
  'Johannesburg, Gauteng',
  'admin@sunflower.co.za'
) on conflict do nothing;
