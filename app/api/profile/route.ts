import { auth } from '@clerk/nextjs/server'
import { getOrCreateAccount } from '@/lib/account'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const preferenceKeys = [
  'email_updates',
  'deep_swamp_notifications',
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
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('app_users')
      .update({
        ...preferences,
        email_preferences_updated_at: now,
        updated_at: now,
      })
      .eq('id', account.id)
      .select('id, clerk_user_id, email_updates, deep_swamp_notifications, feedback_contact, email_preferences_updated_at, created_at')
      .single()

    if (error) throw error
    return Response.json({ profile: data })
  } catch (error) {
    console.error('profile update failed', error)
    return Response.json({ error: 'The swamp could not save that preference. Please try again.' }, { status: 503 })
  }
}
