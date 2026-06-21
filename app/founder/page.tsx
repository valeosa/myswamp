'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { LilyIcon } from '@/app/lily-icon'

type Metric = { total: number; last7Days: number }
type AnalyticsData = {
  analyticsReady: boolean
  generatedAt: string
  metrics: {
    visits: Metric
    taskDumps: Metric
    frogGenerations: Metric
    signups: Metric
    completions: Metric
  }
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
    ['frog generations', data.metrics.frogGenerations],
    ['signups', data.metrics.signups],
    ['completions', data.metrics.completions],
  ] as const : []

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
            <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {cards.map(([label, metric]) => (
                <article key={label} className="rounded-2xl border border-[#294532] bg-[#0b1710] p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#718067]">{label}</p>
                  <p className="mt-5 text-3xl font-semibold text-[#c8d8b8]">{metric.total.toLocaleString()}</p>
                  <p className="mt-2 text-xs text-[#718067]">+{metric.last7Days.toLocaleString()} in 7 days</p>
                </article>
              ))}
            </section>
            <p className="mt-8 text-xs text-[#60705a]">Visits are page views. Analytics stores event names, paths, and timestamps—not task text.</p>
          </>
        )}
      </div>
    </main>
  )
}
