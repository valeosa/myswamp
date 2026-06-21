import { auth } from '@clerk/nextjs/server'
import { isFrogEventType } from '@/lib/frog-events'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getOrCreateAccount } from '@/lib/account'
import { recordFounderEvents } from '@/lib/founder-analytics'
import { parseLocalContext } from '@/lib/local-context'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: 'Not signed in' }, { status: 401 })
    }

    const rateLimit = checkRateLimit(`events:${userId}`, 30, 60 * 1000)
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'The swamp needs a moment. Try again soon.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const { frogId, eventType, context } = await req.json()
    if (typeof frogId !== 'string' || !isFrogEventType(eventType)) {
      return Response.json({ error: 'Invalid event' }, { status: 400 })
    }

    if (!['frog_completed', 'frog_not_completed'].includes(eventType)) {
      return Response.json({ error: 'This event is recorded by the frog picker.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const account = await getOrCreateAccount(userId)
    const { data, error } = await supabase.rpc('settle_frog', {
      p_account_id: account.id,
      p_user_id: userId,
      p_frog_id: frogId,
      p_event_type: eventType,
      p_context: parseLocalContext(context),
    })

    if (error) {
      if (error.code === 'P0002') {
        return Response.json({ error: 'Frog not found' }, { status: 404 })
      }
      if (error.code === '22023') {
        return Response.json({ error: 'That frog has already settled.' }, { status: 409 })
      }
      throw error
    }

    const result = data?.[0]
    if (eventType === 'frog_completed' && result?.changed) {
      await recordFounderEvents([{ event_name: 'frog_completed' }])
    }
    return Response.json({ ok: true, changed: result?.changed ?? false, status: result?.status })
  } catch (error) {
    console.error('events route failed', error)
    return Response.json(
      { error: 'The swamp could not remember that just now. Please try again.' },
      { status: 503 },
    )
  }
}
