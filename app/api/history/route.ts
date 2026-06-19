import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: 'Not signed in' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('frogs')
      .select('id, task_dump, frog, chosen_task, status, created_at, completed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return Response.json({ frogs: data ?? [] })
  } catch (error) {
    console.error('history route failed', error)
    return Response.json(
      { error: 'The water’s memory is cloudy right now. Please try again.' },
      { status: 503 },
    )
  }
}
