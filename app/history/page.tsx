'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'

type Frog = {
  id: string
  task_dump: string
  frog: string
  chosen_task: string | null
  status: 'active' | 'completed' | 'not_completed'
  created_at: string
  completed_at: string | null
}

const statusCopy: Record<Frog['status'], string> = {
  active: 'resting on the lily pad',
  completed: 'finished',
  not_completed: 'not yet',
}

export default function HistoryPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const [frogs, setFrogs] = useState<Frog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) return

    async function loadHistory() {
      try {
        const response = await fetch('/api/history')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'The water’s memory is cloudy right now.')
        setFrogs(data.frogs ?? [])
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The water’s memory is cloudy right now.')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [isLoaded, isSignedIn])

  return (
    <main className="min-h-screen bg-[#07100b] text-white p-6 pt-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#b7c89b]">the water’s memory</h1>
          <p className="mt-1 text-sm text-[#718067]">the swamp remembers what happened here.</p>
        </div>

        <Link href="/" className="inline-block text-[#8fa66c] text-sm opacity-70 hover:opacity-100">
          ← back to swamp
        </Link>

        {loading && isSignedIn && <p className="text-[#8fa66c]">looking beneath the surface...</p>}
        {!loading && !isSignedIn && <p className="text-[#8fa66c]">sign in to see what the swamp remembers.</p>}
        {error && <p role="alert" className="rounded-xl border border-[#6e4f3d] bg-[#241710] p-3 text-sm text-[#e2c2a8]">{error}</p>}
        {!loading && isSignedIn && !error && frogs.length === 0 && (
          <p className="text-[#8fa66c]">no frogs remembered yet.</p>
        )}

        {frogs.map((item) => (
          <article key={item.id} className="rounded-2xl border border-lime-900/40 bg-[#0b1710] p-5 space-y-3">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-[#8fa66c]">
              <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
              <span>{statusCopy[item.status]}</span>
            </div>

            <div>
              <p className="text-[#8fa66c] text-sm">frog</p>
              <p>{item.chosen_task || item.frog}</p>
            </div>

            {item.chosen_task && (
              <div>
                <p className="text-[#8fa66c] text-sm">one small action</p>
                <p>{item.frog}</p>
              </div>
            )}

            <details className="text-sm text-[#aab5a2]">
              <summary className="cursor-pointer text-[#718067]">tadpoles in this dump</summary>
              <p className="mt-2 whitespace-pre-wrap">{item.task_dump}</p>
            </details>
          </article>
        ))}
      </div>
    </main>
  )
}
