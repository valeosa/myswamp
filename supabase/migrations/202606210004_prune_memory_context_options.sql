alter table public.memory_contexts
  drop constraint if exists memory_contexts_life_context_check,
  drop constraint if exists memory_contexts_moment_check;

-- NOT VALID preserves any historical marks made with retired options while
-- still enforcing the sharper vocabulary for every new mark.
alter table public.memory_contexts
  add constraint memory_contexts_life_context_check check (
    life_context in (
      'school', 'work', 'project', 'friends', 'travel',
      'family', 'health', 'money', 'moving', 'exams'
    )
  ) not valid,
  add constraint memory_contexts_moment_check check (
    moment in (
      'normal day', 'deadline', 'holiday',
      'before something big', 'after something big', 'liminal', 'unstable'
    )
  ) not valid;
