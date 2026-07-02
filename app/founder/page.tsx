'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { LilyIcon } from '@/app/lily-icon'

type Metric = { total: number; last7Days: number }
type DataHealth = {
  frogs: {
    total: number
    captured: number
    failed: number
    not_consented: number
    captured_snapshot_mismatches: number
  }
  lifecycle: {
    outcome_mismatches: number
    active_with_outcome: number
    cleared_tadpoles_without_event: number
    active_tadpoles_with_event: number
  }
  provenance: {
    modern: number
    legacy: number
    modern_missing_position: number
    repaired: number
  }
  water_marks: {
    total: number
    current_version: number
    legacy: number
  }
  generated_at: string
}
type AnalyticsData = {
  analyticsReady: boolean
  generatedAt: string
  metrics: {
    visits: Metric
    taskDumps: Metric
    frogGenerations: Metric
    frogApiAttempts: Metric
    buttonClicks: Metric
    signups: Metric
    completions: Metric
  }
  dataHealthReady: boolean
  dataHealth: DataHealth | null
}

export default function FounderPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    fetch('/api/founder/analytics')
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(response.status === 404 ? 'This clearing is private.' : body.error)
        setData(body)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'The numbers are beneath the fog right now.'))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  const isCounting = !isLoaded || (isSignedIn && loading)

  const completionRate = useMemo(() => {
    if (!data?.metrics.frogGenerations.total) return 0
    return Math.round((data.metrics.completions.total / data.metrics.frogGenerations.total) * 100)
  }, [data])

  const cards = data ? [
    ['visits', data.metrics.visits],
    ['task dumps', data.metrics.taskDumps],
    ['frog api attempts', data.metrics.frogApiAttempts],
    ['frog generations', data.metrics.frogGenerations],
    ['button clicks', data.metrics.buttonClicks],
    ['signups', data.metrics.signups],
    ['completions', data.metrics.completions],
  ] as const : []

  const lifecycleWarnings = data?.dataHealth
    ? Object.values(data.dataHealth.lifecycle).reduce((sum, count) => sum + count, 0)
      + data.dataHealth.frogs.captured_snapshot_mismatches
      + data.dataHealth.provenance.modern_missing_position
    : 0

  const attemptedCaptures = data?.dataHealth
    ? data.dataHealth.frogs.captured + data.dataHealth.frogs.failed
    : 0
  const captureRate = attemptedCaptures > 0 && data?.dataHealth
    ? Math.round((data.dataHealth.frogs.captured / attemptedCaptures) * 100)
    : 0

  return (
    <main className="min-h-screen bg-[#07100b] px-6 pb-20 pt-24 text-[#c8d8b8]">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#8fa66c] opacity-75 hover:opacity-100"><LilyIcon /> back to swamp</Link>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">founder clearing</h1>
            <p className="mt-2 text-sm italic text-[#718067]">just enough light to see how the swamp is moving</p>
          </div>
          {data && <p className="text-sm text-[#718067]">{completionRate}% completion rate</p>}
        </div>

        {isCounting && <p className="mt-12 text-[#8fa66c]">counting ripples...</p>}
        {isLoaded && !isSignedIn && <p className="mt-12 text-[#8fa66c]">sign in with the founder account to enter.</p>}
        {error && <p role="alert" className="mt-12 text-[#d0ae82]">{error}</p>}

        {data && (
          <>
            {!data.analyticsReady && (
              <p className="mt-8 rounded-xl border border-[#655c34] bg-[#17170d] p-4 text-sm text-[#c5b977]">
                Lifecycle totals are available. Apply the founder analytics migration to begin counting visits and all guest activity.
              </p>
            )}
            <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
              {cards.map(([label, metric]) => (
                <article key={label} className="rounded-2xl border border-[#294532] bg-[#0b1710] p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#718067]">{label}</p>
                  <p className="mt-5 text-3xl font-semibold text-[#c8d8b8]">{metric.total.toLocaleString()}</p>
                  <p className="mt-2 text-xs text-[#718067]">+{metric.last7Days.toLocaleString()} in 7 days</p>
                </article>
              ))}
            </section>
            <p className="mt-8 text-xs text-[#60705a]">Visits are page views. Analytics stores event names, paths, and timestamps—not task text.</p>

            <section className="mt-16 border-t border-[#1d3325] pt-10" aria-labelledby="data-health-title">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 id="data-health-title" className="text-2xl font-semibold">data health</h2>
                  <p className="mt-2 text-sm italic text-[#718067]">whether the swamp is remembering cleanly</p>
                </div>
                {data.dataHealth && (
                  <p className={lifecycleWarnings === 0 ? 'text-sm text-[#8fa66c]' : 'text-sm text-[#d0ae82]'}>
                    {lifecycleWarnings === 0 ? 'the records are clear' : `${lifecycleWarnings} things need attention`}
                  </p>
                )}
              </div>

              {!data.dataHealthReady && (
                <p className="mt-8 rounded-xl border border-[#655c34] bg-[#17170d] p-4 text-sm text-[#c5b977]">
                  Apply the founder data-health migration to begin checking collection integrity.
                </p>
              )}

              {data.dataHealth && (
                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <HealthPanel
                    title="Deep Swamp capture"
                    lead={`${captureRate}% complete`}
                    rows={[
                      ['captured cleanly', data.dataHealth.frogs.captured],
                      ['failed captures', data.dataHealth.frogs.failed],
                      ['snapshot mismatches', data.dataHealth.frogs.captured_snapshot_mismatches],
                      ['not consented', data.dataHealth.frogs.not_consented],
                    ]}
                  />
                  <HealthPanel
                    title="frog lifecycle"
                    lead={lifecycleWarnings === 0 ? 'clear' : 'check the records'}
                    rows={[
                      ['outcome mismatches', data.dataHealth.lifecycle.outcome_mismatches],
                      ['active frogs with outcomes', data.dataHealth.lifecycle.active_with_outcome],
                      ['cleared tadpoles missing events', data.dataHealth.lifecycle.cleared_tadpoles_without_event],
                      ['active tadpoles with clear events', data.dataHealth.lifecycle.active_tadpoles_with_event],
                    ]}
                  />
                  <HealthPanel
                    title="generation provenance"
                    lead={`${data.dataHealth.provenance.modern} versioned`}
                    rows={[
                      ['legacy frogs', data.dataHealth.provenance.legacy],
                      ['modern frogs missing position', data.dataHealth.provenance.modern_missing_position],
                      ['repair passes', data.dataHealth.provenance.repaired],
                    ]}
                  />
                  <HealthPanel
                    title="water context"
                    lead={`${data.dataHealth.water_marks.total} marks`}
                    rows={[
                      ['current vocabulary', data.dataHealth.water_marks.current_version],
                      ['legacy vocabulary', data.dataHealth.water_marks.legacy],
                    ]}
                  />
                </div>
              )}

              <p className="mt-7 text-xs text-[#60705a]">Only aggregate integrity counts appear here. Legacy means older—not broken.</p>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function HealthPanel({
  title,
  lead,
  rows,
}: {
  title: string
  lead: string
  rows: Array<[string, number]>
}) {
  return (
    <article className="rounded-[1.3rem_1.6rem_1.2rem_1.45rem] border border-[#294532] bg-[#0b1710] p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base text-[#b9c9ac]">{title}</h3>
        <p className="text-sm italic text-[#8fa66c]">{lead}</p>
      </div>
      <dl className="mt-5 divide-y divide-[#1d3325] border-y border-[#1d3325] text-sm">
        {rows.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-[#718067]">{label}</dt>
            <dd className={count > 0 && /failed|mismatch|missing|active frogs|active tadpoles/.test(label)
              ? 'text-[#d0ae82]'
              : 'text-[#a8b99a]'}>
              {count.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
