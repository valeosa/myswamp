import { auth } from '@clerk/nextjs/server'
import { isFrogEventType } from '@/lib/frog-events'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getOrCreateAccount } from '@/lib/account'
import { recordFounderEvents } from '@/lib/founder-analytics'

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

    const { frogId, eventType } = await req.json()
    if (typeof frogId !== 'string' || !isFrogEventType(eventType)) {
      return Response.json({ error: 'Invalid event' }, { status: 400 })
    }

    if (!['frog_completed', 'frog_not_completed'].includes(eventType)) {
      return Response.json({ error: 'This event is recorded by the frog picker.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const account = await getOrCreateAccount(userId)
    const { data: frog, error: findError } = await supabase
      .from('frogs')
      .select('id, frog')
      .eq('id', frogId)
      .eq('account_id', account.id)
      .single()

    if (findError || !frog) {
      return Response.json({ error: 'Frog not found' }, { status: 404 })
    }

    const completed = eventType === 'frog_completed'
    const occurredAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('frogs')
      .update({
        status: completed ? 'completed' : 'not_completed',
        completed_at: completed ? occurredAt : null,
      })
      .eq('id', frogId)
      .eq('account_id', account.id)

    if (updateError) throw updateError

    const { error: eventError } = await supabase.from('frog_events').insert({
      user_id: userId,
      account_id: account.id,
      frog_id: frogId,
      event_type: eventType,
      frog_text: frog.frog,
      action_text: frog.frog,
      completed,
      completed_at: completed ? occurredAt : null,
    })

    if (eventError) throw eventError
    if (completed) await recordFounderEvents([{ event_name: 'frog_completed' }])
    return Response.json({ ok: true })
  } catch (error) {
    console.error('events route failed', error)
    return Response.json(
      { error: 'The swamp could not remember that just now. Please try again.' },
      { status: 503 },
    )
  }
}
