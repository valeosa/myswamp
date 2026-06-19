import { auth } from '@clerk/nextjs/server'
import { getOrCreateAccount } from '@/lib/account'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const account = await getOrCreateAccount(userId)
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('frogs')
      .select('id, task_dump, frog, chosen_task, status, created_at')
      .eq('account_id', account.id)
      .in('status', ['active', 'not_completed'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const frogs = data ?? []
    return Response.json({
      active: frogs.find((frog) => frog.status === 'active') ?? null,
      pending: frogs.filter((frog) => frog.status === 'not_completed'),
    })
  } catch (error) {
    console.error('current frogs route failed', error)
    return Response.json(
      { error: 'The swamp could not see what is still in the water. Please try again.' },
      { status: 503 },
    )
  }
}
