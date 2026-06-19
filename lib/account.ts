import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type Account = {
  id: string
  clerk_user_id: string
  email_updates: boolean
  deep_swamp_notifications: boolean
  feedback_contact: boolean
  email_preferences_updated_at: string | null
  created_at: string
}

export async function getOrCreateAccount(clerkUserId: string): Promise<Account> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('app_users')
    .upsert(
      { clerk_user_id: clerkUserId },
      { onConflict: 'clerk_user_id' },
    )
    .select('id, clerk_user_id, email_updates, deep_swamp_notifications, feedback_contact, email_preferences_updated_at, created_at')
    .single()

  if (error) throw error
  return data
}
