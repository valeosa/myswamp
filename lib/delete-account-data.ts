import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function deleteAccountData(clerkUserId: string) {
  const { error } = await getSupabaseAdmin().rpc('delete_my_swamp_account_data', {
    p_clerk_user_id: clerkUserId,
  })

  if (error) throw error
}
