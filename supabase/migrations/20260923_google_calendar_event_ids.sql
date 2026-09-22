-- Link jobs to Google Calendar events.
alter table public.jobs
  add column if not exists google_calendar_id text;

alter table public.jobs
  add column if not exists google_calendar_event_id text;
