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
