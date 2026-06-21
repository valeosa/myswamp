import { auth } from '@clerk/nextjs/server'

import { getOrCreateAccount } from '@/lib/account'
import { isMemoryContextSelection, MAX_ERA_NAME_LENGTH } from '@/lib/memory-context'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const account = await getOrCreateAccount(userId)
    const { data, error } = await getSupabaseAdmin()
      .from('memory_contexts')
      .select('id, era_name, created_at')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return Response.json({ context: data })
  } catch (error) {
    console.error('memory context lookup failed', error)
    return Response.json(
      { error: 'The water could not recall its latest mark.' },
      { status: 503 },
    )
  }
}

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

    const payload: unknown = await request.json()
    const eraName = payload && typeof payload === 'object' && 'era_name' in payload && typeof payload.era_name === 'string'
      ? payload.era_name.trim()
      : ''
    const selection = payload
    if (!isMemoryContextSelection(selection)) {
      return Response.json({ error: 'Choose one mark from each part of the water.' }, { status: 400 })
    }

    if (eraName.length > MAX_ERA_NAME_LENGTH) {
      return Response.json(
        { error: `Keep the era name to ${MAX_ERA_NAME_LENGTH} characters or fewer.` },
        { status: 400 },
      )
    }

    const account = await getOrCreateAccount(userId)
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('memory_contexts')
      .insert({
        user_id: userId,
        account_id: account.id,
        season: selection.season,
        life_context: selection.life_context,
        energy: selection.energy,
        moment: selection.moment,
        era_name: eraName || null,
      })
      .select('id, era_name, season, life_context, energy, moment, created_at')
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
