alter table public.jobs
add column if not exists job_description text not null default '';
