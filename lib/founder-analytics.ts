import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type FounderEventName = 'visit' | 'task_dumped' | 'frog_generated' | 'frog_completed' | 'button_clicked'

export async function recordFounderEvents(events: Array<{ event_name: FounderEventName; path?: string }>) {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('analytics_events').insert(events)
    if (error) throw error
  } catch (error) {
    // Analytics must never interrupt the product experience, including during
    // the short deploy window before the migration has been applied.
    console.warn('founder analytics event skipped', error)
  }
}
