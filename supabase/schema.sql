-- Job Tracker schema
-- Run this in Supabase SQL Editor.

create table if not exists public.interview_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_date date not null,
  interview_time time,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.interview_history enable row level security;

drop policy if exists "Users can view own interview history" on public.interview_history;
create policy "Users can view own interview history"
on public.interview_history for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own interview history" on public.interview_history;
create policy "Users can insert own interview history"
on public.interview_history for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own interview history" on public.interview_history;
create policy "Users can delete own interview history"
on public.interview_history for delete
using (auth.uid() = user_id);

create index if not exists interview_history_job_id_created_at_idx
on public.interview_history(job_id, created_at desc);

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

create or replace function public.log_interview_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.interview_date is not null
     and (
       old.interview_date is distinct from new.interview_date
       or old.interview_time is distinct from new.interview_time
     ) then
    insert into public.interview_history (
      job_id, user_id, interview_date, interview_time
    )
    values (
      old.id, old.user_id, old.interview_date, old.interview_time
    );
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_interview_schedule_history on public.jobs;
create trigger jobs_interview_schedule_history
after update of interview_date, interview_time on public.jobs
for each row
execute function public.log_interview_schedule_change();
