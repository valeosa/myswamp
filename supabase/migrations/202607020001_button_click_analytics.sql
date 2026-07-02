alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check check (
    event_name in ('visit', 'task_dumped', 'frog_generated', 'frog_completed', 'button_clicked')
  );
