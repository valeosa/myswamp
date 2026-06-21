export type LocalContext = {
  timezone: string
  localHour: number
  localWeekday: number
}

export function getLocalContext(): LocalContext {
  const now = new Date()
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    localHour: now.getHours(),
    localWeekday: now.getDay(),
  }
}

export function parseLocalContext(value: unknown): LocalContext | null {
  if (!value || typeof value !== 'object') return null

  const { timezone, localHour, localWeekday } = value as Record<string, unknown>
  const timezoneIsValid = typeof timezone === 'string'
    && timezone.length <= 64
    && (timezone === 'UTC' || /^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(timezone))

  if (
    !timezoneIsValid
    || !Number.isInteger(localHour)
    || !Number.isInteger(localWeekday)
    || (localHour as number) < 0
    || (localHour as number) > 23
    || (localWeekday as number) < 0
    || (localWeekday as number) > 6
  ) return null

  return {
    timezone,
    localHour: localHour as number,
    localWeekday: localWeekday as number,
  }
}
