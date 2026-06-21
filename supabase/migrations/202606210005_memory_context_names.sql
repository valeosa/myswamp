alter table public.memory_contexts
add column if not exists era_name text;

alter table public.memory_contexts
drop constraint if exists memory_contexts_era_name_length_check;

alter table public.memory_contexts
add constraint memory_contexts_era_name_length_check check (
  era_name is null or char_length(era_name) between 1 and 80
);
