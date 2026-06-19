import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getOrCreateAccount } from '@/lib/account'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: 'Not signed in' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const account = await getOrCreateAccount(userId)
    const visibleHistory = await supabase
      .from('frogs')
      .select('id, task_dump, frog, chosen_task, status, created_at, completed_at')
      .eq('account_id', account.id)
      .eq('status', 'completed')
      .is('hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    // Keep history available during the brief deploy window before the
    // hidden_at migration has been applied.
    if (visibleHistory.error?.message.includes('hidden_at')) {
      const fallbackHistory = await supabase
        .from('frogs')
        .select('id, task_dump, frog, chosen_task, status, created_at, completed_at')
        .eq('account_id', account.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100)

      if (fallbackHistory.error) throw fallbackHistory.error
      return Response.json({ frogs: fallbackHistory.data ?? [] })
    }

    if (visibleHistory.error) throw visibleHistory.error
    return Response.json({ frogs: visibleHistory.data ?? [] })
  } catch (error) {
    console.error('history route failed', error)
    return Response.json(
      { error: 'The water’s memory is cloudy right now. Please try again.' },
      { status: 503 },
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: 'Not signed in' }, { status: 401 })
    }

    const { id } = await req.json()
    if (typeof id !== 'string' || !id) {
      return Response.json({ error: 'Invalid frog' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const account = await getOrCreateAccount(userId)
    const { data, error } = await supabase
      .from('frogs')
      .update({ hidden_at: new Date().toISOString() })
      .eq('id', id)
      .eq('account_id', account.id)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return Response.json({ error: 'Frog not found' }, { status: 404 })

    return Response.json({ ok: true })
  } catch (error) {
    console.error('hide history item failed', error)
    return Response.json(
      { error: 'This frog would not sink just yet. Please try again.' },
      { status: 503 },
    )
  }
}
