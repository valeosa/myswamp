import { auth } from '@clerk/nextjs/server'

import { getOrCreateAccount } from '@/lib/account'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseLocalContext } from '@/lib/local-context'

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
    const { data, error } = await supabase.rpc('clear_tadpoles', {
      p_account_id: account.id,
      p_user_id: userId,
      p_tadpole_id: clearAll ? null : tadpoleId,
      p_clear_all: clearAll,
      p_context: parseLocalContext(body?.context),
    })
    if (error) throw error
    if (!clearAll && data.length === 0) {
      const { data: existing } = await supabase
        .from('tadpoles')
        .select('id, status')
        .eq('id', tadpoleId)
        .eq('account_id', account.id)
        .maybeSingle()

      if (existing?.status === 'cleared') {
        return Response.json({ clearedIds: [], changed: false })
      }
      return Response.json({ error: 'Tadpole not found' }, { status: 404 })
    }

    return Response.json({
      clearedIds: data.map((tadpole: { id: string }) => tadpole.id),
      changed: data.length > 0,
    })
  } catch (error) {
    console.error('tadpole clear failed', error)
    return Response.json(
      { error: 'The tadpole would not clear just yet. Please try again.' },
      { status: 503 },
    )
  }
}
