alter table public.memory_contexts
  drop constraint if exists memory_contexts_life_context_check,
  drop constraint if exists memory_contexts_energy_check,
  drop constraint if exists memory_contexts_moment_check;

alter table public.memory_contexts
  add constraint memory_contexts_life_context_check check (
    life_context in (
      'school', 'work', 'project', 'friends', 'outreach', 'travel',
      'family', 'health', 'money', 'moving', 'exams', 'other'
    )
  ),
  add constraint memory_contexts_energy_check check (
    energy in ('low', 'okay', 'wired', 'scattered', 'unstable', 'calm')
  ),
  add constraint memory_contexts_moment_check check (
    moment in (
      'normal day', 'transition', 'deadline', 'holiday',
      'before something big', 'after something big', 'liminal', 'unstable'
    )
  );
