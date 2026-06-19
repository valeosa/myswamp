export const frogEventTypes = [
  'swamp_dumped',
  'frog_assigned',
  'frog_completed',
  'frog_not_completed',
] as const

export type FrogEventType = (typeof frogEventTypes)[number]

export function isFrogEventType(value: unknown): value is FrogEventType {
  return frogEventTypes.includes(value as FrogEventType)
}
