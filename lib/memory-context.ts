export const memoryContextOptions = {
  season: ['spring', 'summer', 'autumn', 'winter'],
  life_context: [
    'school', 'work', 'project', 'friends', 'travel',
    'family', 'health', 'money', 'moving', 'exams',
  ],
  energy: ['low', 'okay', 'wired', 'scattered', 'unstable', 'calm'],
  moment: [
    'normal day', 'deadline', 'holiday', 'before something big',
    'after something big', 'liminal', 'unstable',
  ],
} as const

export const MAX_ERA_NAME_LENGTH = 80

export type MemoryContextSelection = {
  [Key in keyof typeof memoryContextOptions]: (typeof memoryContextOptions)[Key][number]
}

export function isMemoryContextSelection(value: unknown): value is MemoryContextSelection {
  if (!value || typeof value !== 'object') return false

  const selection = value as Record<string, unknown>
  return Object.entries(memoryContextOptions).every(([field, options]) => {
    const selected = selection[field]
    return typeof selected === 'string' && (options as readonly string[]).includes(selected)
  })
}
