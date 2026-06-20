export const memoryContextOptions = {
  season: ['spring', 'summer', 'autumn', 'winter'],
  life_context: ['school', 'work', 'travel', 'family', 'health', 'money', 'moving', 'exams', 'other'],
  energy: ['low', 'okay', 'wired', 'scattered', 'calm'],
  moment: ['normal day', 'transition', 'deadline', 'holiday', 'after something big'],
} as const

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
