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
