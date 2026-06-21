import { auth } from '@clerk/nextjs/server'

import { getOrCreateAccount } from '@/lib/account'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const rateLimit = checkRateLimit(`tadpoles:${userId}`, 60, 60 * 1000)
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'The water needs a moment. Try again soon.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const body = await request.json()
    const clearAll = body?.clearAll === true
    const tadpoleId = typeof body?.tadpoleId === 'string' ? body.tadpoleId : ''

    if (!clearAll && !uuidPattern.test(tadpoleId)) {
      return Response.json({ error: 'Invalid tadpole' }, { status: 400 })
    }

    const account = await getOrCreateAccount(userId)
    const supabase = getSupabaseAdmin()
    const clearedAt = new Date().toISOString()
    let update = supabase
      .from('tadpoles')
      .update({
        status: 'cleared',
        cleared_at: clearedAt,
        clear_method: clearAll ? 'clear_all' : 'individual',
      })
      .eq('account_id', account.id)
      .eq('status', 'active')

    if (!clearAll) update = update.eq('id', tadpoleId)

    const { data, error } = await update.select('id')
    if (error) throw error
    if (!clearAll && data.length === 0) {
      return Response.json({ error: 'Tadpole not found' }, { status: 404 })
    }

    return Response.json({ clearedIds: data.map((tadpole) => tadpole.id) })
  } catch (error) {
    console.error('tadpole clear failed', error)
    return Response.json(
      { error: 'The tadpole would not clear just yet. Please try again.' },
      { status: 503 },
    )
  }
}
