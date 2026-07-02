import { checkRateLimit } from '@/lib/rate-limit'
import { recordFounderEvents, type FounderEventName } from '@/lib/founder-analytics'

const publicEvents = new Set<FounderEventName>(['visit', 'frog_completed', 'button_clicked'])

export async function POST(req: Request) {
  try {
    const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateLimit = checkRateLimit(`analytics:${forwardedFor}`, 120, 60 * 1000)
    if (!rateLimit.allowed) return new Response(null, { status: 204 })

    const { eventName, path } = await req.json()
    if (typeof eventName !== 'string' || !publicEvents.has(eventName as FounderEventName)) {
      return Response.json({ error: 'Invalid event' }, { status: 400 })
    }

    const cleanPath = typeof path === 'string' && path.startsWith('/') ? path.slice(0, 200) : undefined
    await recordFounderEvents([{ event_name: eventName as FounderEventName, path: cleanPath }])
    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 204 })
  }
}
