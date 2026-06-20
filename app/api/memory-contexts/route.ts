import { auth } from '@clerk/nextjs/server'

import { getOrCreateAccount } from '@/lib/account'
import { isMemoryContextSelection } from '@/lib/memory-context'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const rateLimit = checkRateLimit(`memory-context:${userId}`, 12, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'The water has enough marks for now. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const selection = await request.json()
    if (!isMemoryContextSelection(selection)) {
      return Response.json({ error: 'Choose one mark from each part of the water.' }, { status: 400 })
    }

    const account = await getOrCreateAccount(userId)
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('memory_contexts')
      .insert({
        user_id: userId,
        account_id: account.id,
        ...selection,
      })
      .select('id, season, life_context, energy, moment, created_at')
      .single()

    if (error) throw error
    return Response.json({ context: data }, { status: 201 })
  } catch (error) {
    console.error('memory context save failed', error)
    return Response.json(
      { error: 'The water could not hold that mark. Please try again.' },
      { status: 503 },
    )
  }
}
