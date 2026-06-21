import { auth } from '@clerk/nextjs/server'
import { getOrCreateAccount } from '@/lib/account'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getTadpoleItems } from '@/lib/tasks'

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
    const legacyTadpoles = frogs.flatMap((frog) =>
      getTadpoleItems(frog.task_dump, frog.chosen_task, frog.frog).map((item) => ({
        user_id: userId,
        account_id: account.id,
        source_frog_id: frog.id,
        position: item.position,
        task_text: item.taskText,
        task_key: item.taskKey,
        created_at: frog.created_at,
      })),
    )

    if (legacyTadpoles.length > 0) {
      const { error: backfillError } = await supabase
        .from('tadpoles')
        .upsert(legacyTadpoles, { ignoreDuplicates: true })
      if (backfillError) throw backfillError
    }

    const { data: tadpoles, error: tadpolesError } = await supabase
      .from('tadpoles')
      .select('id, task_text, source_frog_id, created_at')
      .eq('account_id', account.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(250)

    if (tadpolesError) throw tadpolesError

    return Response.json({
      active: frogs.find((frog) => frog.status === 'active') ?? null,
      pending: frogs.filter((frog) => frog.status === 'not_completed'),
      tadpoles: tadpoles ?? [],
    })
  } catch (error) {
    console.error('current frogs route failed', error)
    return Response.json(
      { error: 'The swamp could not see what is still in the water. Please try again.' },
      { status: 503 },
    )
  }
}
