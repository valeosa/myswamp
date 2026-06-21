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
    const regularPreferences = Object.fromEntries(
      Object.entries(preferences).filter(([key]) => key !== 'deep_swamp_analysis'),
    )
    const supabase = getSupabaseAdmin()
    if (Object.keys(regularPreferences).length > 0) {
      const { error } = await supabase
        .from('app_users')
        .update({
          ...regularPreferences,
          email_preferences_updated_at: now,
          updated_at: now,
        })
        .eq('id', account.id)
      if (error) throw error
    }

    if (typeof analysisPreference === 'boolean') {
      const { error } = await supabase.rpc('set_deep_swamp_consent', {
        p_account_id: account.id,
        p_user_id: userId,
        p_enabled: analysisPreference,
      })
      if (error) throw error
    }

    const { data, error } = await supabase
      .from('app_users')
      .select('id, clerk_user_id, email_updates, deep_swamp_notifications, deep_swamp_analysis, deep_swamp_consent_at, feedback_contact, email_preferences_updated_at, created_at')
      .eq('id', account.id)
      .single()
    if (error) throw error

    return Response.json({ profile: data })
  } catch (error) {
    console.error('profile update failed', error)
    return Response.json({ error: 'The swamp could not save that preference. Please try again.' }, { status: 503 })
  }
}
