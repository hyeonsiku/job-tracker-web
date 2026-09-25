-- Job Tracker schema
-- Run this in Supabase SQL Editor.

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  title text not null default '',
  employment text not null default '正社員',
  type text not null default '不明',
  salary text not null default '',
  remote text not null default '',
  status text not null default '検討',
  fit integer not null default 3 check (fit between 1 and 5),
  applied date,
  interview_date date,
  interview_time time,
  url text,
  tech text not null default '',
  pros text not null default '',
  caution text not null default '',
  memo text not null default '',
  job_description text not null default '',
  pdf_path text,
  google_calendar_id text,
  google_calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs enable row level security;

drop policy if exists "Users can view own jobs" on public.jobs;
create policy "Users can view own jobs"
on public.jobs for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own jobs" on public.jobs;
create policy "Users can insert own jobs"
on public.jobs for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own jobs" on public.jobs;
create policy "Users can update own jobs"
on public.jobs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own jobs" on public.jobs;
create policy "Users can delete own jobs"
on public.jobs for delete
using (auth.uid() = user_id);

-- Private bucket for job description PDFs.
insert into storage.buckets (id, name, public)
values ('job-pdfs', 'job-pdfs', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own job PDFs" on storage.objects;
create policy "Users can read own job PDFs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'job-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload own job PDFs" on storage.objects;
create policy "Users can upload own job PDFs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'job-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can update own job PDFs" on storage.objects;
create policy "Users can update own job PDFs"
on storage.objects for update
to authenticated
using (
  bucket_id = 'job-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'job-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete own job PDFs" on storage.objects;
create policy "Users can delete own job PDFs"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'job-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create index if not exists jobs_user_id_created_at_idx
on public.jobs(user_id, created_at desc);
