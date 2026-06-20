import { auth } from '@clerk/nextjs/server'
import { getOrCreateAccount } from '@/lib/account'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const preferenceKeys = [
  'email_updates',
  'deep_swamp_notifications',
  'deep_swamp_analysis',
  'feedback_contact',
] as const

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const account = await getOrCreateAccount(userId)
    return Response.json({ profile: account })
  } catch (error) {
    console.error('profile route failed', error)
    return Response.json({ error: 'Your account is resting beneath the surface. Please try again.' }, { status: 503 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const body = await req.json()
    const preferences = Object.fromEntries(
      preferenceKeys
        .filter((key) => typeof body[key] === 'boolean')
        .map((key) => [key, body[key]]),
    )

    if (Object.keys(preferences).length === 0) {
      return Response.json({ error: 'No valid preferences supplied' }, { status: 400 })
    }

    const account = await getOrCreateAccount(userId)
    const now = new Date().toISOString()
    const analysisPreference = preferences.deep_swamp_analysis
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('app_users')
      .update({
        ...preferences,
        ...(typeof analysisPreference === 'boolean'
          ? { deep_swamp_consent_at: analysisPreference ? now : null }
          : {}),
        email_preferences_updated_at: now,
        updated_at: now,
      })
      .eq('id', account.id)
      .select('id, clerk_user_id, email_updates, deep_swamp_notifications, deep_swamp_analysis, deep_swamp_consent_at, feedback_contact, email_preferences_updated_at, created_at')
      .single()

    if (error) throw error

    if (analysisPreference === false) {
      const [itemsResult, frogsResult] = await Promise.all([
        supabase.from('deep_swamp_task_items').delete().eq('account_id', account.id),
        supabase
          .from('frogs')
          .update({
            local_timezone: null,
            local_hour: null,
            local_weekday: null,
            task_count: null,
            deep_swamp_capture_version: null,
          })
          .eq('account_id', account.id),
      ])

      if (itemsResult.error || frogsResult.error) {
        console.warn('Deep Swamp data cleanup was incomplete', itemsResult.error ?? frogsResult.error)
      }
    }

    return Response.json({ profile: data })
  } catch (error) {
    console.error('profile update failed', error)
    return Response.json({ error: 'The swamp could not save that preference. Please try again.' }, { status: 503 })
  }
}
