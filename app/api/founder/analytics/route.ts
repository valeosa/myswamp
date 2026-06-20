import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type Metric = { total: number; last7Days: number }

function founderIds() {
  return new Set(
    (process.env.FOUNDER_CLERK_USER_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  )
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId || !founderIds().has(userId)) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    async function countPair(
      table: 'analytics_events' | 'app_users' | 'frogs' | 'frog_events',
      timeColumn: 'occurred_at' | 'created_at',
      filter?: { column: 'event_name' | 'event_type'; value: string },
    ): Promise<{ metric: Metric; error: unknown }> {
      let totalQuery = supabase.from(table).select('id', { count: 'exact', head: true })
      let recentQuery = supabase.from(table).select('id', { count: 'exact', head: true }).gte(timeColumn, since)
      if (filter) {
        totalQuery = totalQuery.eq(filter.column, filter.value)
        recentQuery = recentQuery.eq(filter.column, filter.value)
      }

      const [total, recent] = await Promise.all([totalQuery, recentQuery])
      return {
        metric: { total: total.count ?? 0, last7Days: recent.count ?? 0 },
        error: total.error ?? recent.error,
      }
    }

    const [visitsResult, dumpsResult, generationsResult, completionsResult, signupsResult] = await Promise.all([
      countPair('analytics_events', 'occurred_at', { column: 'event_name', value: 'visit' }),
      countPair('analytics_events', 'occurred_at', { column: 'event_name', value: 'task_dumped' }),
      countPair('analytics_events', 'occurred_at', { column: 'event_name', value: 'frog_generated' }),
      countPair('analytics_events', 'occurred_at', { column: 'event_name', value: 'frog_completed' }),
      countPair('app_users', 'created_at'),
    ])

    let visits = visitsResult.metric
    let dumps = dumpsResult.metric
    let generations = generationsResult.metric
    let completions = completionsResult.metric
    let analyticsReady = !visitsResult.error && !dumpsResult.error && !generationsResult.error && !completionsResult.error

    if (!analyticsReady) {
      const [legacyDumps, legacyGenerations, legacyCompletions] = await Promise.all([
        countPair('frog_events', 'created_at', { column: 'event_type', value: 'swamp_dumped' }),
        countPair('frogs', 'created_at'),
        countPair('frog_events', 'created_at', { column: 'event_type', value: 'frog_completed' }),
      ])
      visits = { total: 0, last7Days: 0 }
      dumps = legacyDumps.metric
      generations = legacyGenerations.metric
      completions = legacyCompletions.metric
      analyticsReady = false
    }

    if (signupsResult.error) throw signupsResult.error

    return Response.json({
      analyticsReady,
      generatedAt: new Date().toISOString(),
      metrics: {
        visits,
        taskDumps: dumps,
        frogGenerations: generations,
        signups: signupsResult.metric,
        completions,
      },
    })
  } catch (error) {
    console.error('founder analytics failed', error)
    return Response.json({ error: 'The numbers are beneath the fog right now.' }, { status: 503 })
  }
}
