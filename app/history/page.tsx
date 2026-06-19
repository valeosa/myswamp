'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { getTadpoles } from '@/lib/tasks'

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

function readableDate(value: string) {
  const date = new Date(value)
  const day = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const time = date
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' ', '')
    .toLowerCase()

  return `${day} · ${time}`
}

export default function HistoryPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const [frogs, setFrogs] = useState<Frog[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [frogToHide, setFrogToHide] = useState<Frog | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

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

  async function hideFrog() {
    if (!frogToHide) return

    setDeleting(true)
    setError('')

    try {
      const response = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: frogToHide.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'This frog would not sink just yet.')

      setFrogs((current) => current.filter((frog) => frog.id !== frogToHide.id))
      setFrogToHide(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This frog would not sink just yet.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#07100b] p-6 pt-24 font-sans text-white">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#e4eddc]">the water’s memory</h1>
          <p className="mt-1 text-sm italic text-[#718b75]">what surfaced, what was done</p>
        </div>

        <Link href="/" className="inline-block text-[#8fa66c] text-sm opacity-70 transition-opacity hover:opacity-100">
          ← back to swamp
        </Link>

        {loading && isSignedIn && <p className="text-[#8fa66c]">looking beneath the surface...</p>}
        {isLoaded && !isSignedIn && <p className="text-[#8fa66c]">sign in, and the swamp will remember.</p>}
        {error && <p role="alert" className="rounded-xl border border-[#6e4f3d] bg-[#241710] p-3 text-sm text-[#e2c2a8]">{error}</p>}
        {!loading && isSignedIn && !error && frogs.length === 0 && (
          <div className="flex min-h-[28rem] flex-col items-center justify-center pb-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#294532] text-[#78957c]">
              <svg aria-hidden="true" viewBox="0 0 32 40" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.5">
                <path d="M16 2.5C12.6 7.6 5 14.5 5 23.1 5 30.8 9.9 36 16 36s11-5.2 11-12.9C27 14.5 19.4 7.6 16 2.5Z" />
              </svg>
            </div>
            <p className="mt-6 text-xl font-medium text-[#78957c]">nothing yet.</p>
            <p className="mt-5 text-base italic leading-relaxed text-[#718b75]">
              complete your first frog<br />
              and it will appear here.
            </p>
          </div>
        )}

        {frogs.map((item) => {
          const tadpoles = getTadpoles(item.task_dump, item.chosen_task)

          return (
            <article key={item.id} className="group relative rounded-2xl border border-lime-900/40 bg-[#0b1710] p-5 pb-12 space-y-3 transition-colors hover:border-[#38522e]">
              <div className="flex justify-end text-xs text-[#8fa66c]">
                <span>{statusCopy[item.status]}</span>
              </div>

              <div>
                <p className="text-[#8fa66c] text-sm">frog</p>
                <p>{item.chosen_task || item.frog}</p>
              </div>

              {item.chosen_task && (
                <details className="text-sm text-[#d7ddd2]">
                  <summary className="cursor-pointer text-[#718067] transition-colors hover:text-[#a7b69a]">one small action</summary>
                  <p className="mt-2 pl-4">{item.frog}</p>
                </details>
              )}

              {tadpoles.length > 0 && (
                <details className="text-sm text-[#aab5a2]">
                  <summary className="cursor-pointer text-[#718067] transition-colors hover:text-[#a7b69a]">tadpoles</summary>
                  <ul className="mt-2 pl-4 space-y-1">
                    {tadpoles.map((tadpole, index) => <li key={`${tadpole}-${index}`}>{tadpole}</li>)}
                  </ul>
                </details>
              )}

              <button
                type="button"
                onClick={() => setFrogToHide(item)}
                className="absolute bottom-4 left-5 text-xs text-[#6f7f68] opacity-60 transition-all hover:text-[#b68f72] md:opacity-0 md:group-hover:opacity-100"
              >
                let it sink
              </button>

              <time
                dateTime={item.created_at}
                suppressHydrationWarning
                className="absolute bottom-4 right-5 text-xs text-[#60705a]"
              >
                {readableDate(item.created_at)}
              </time>
            </article>
          )
        })}
      </div>

      {frogToHide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="hide-frog-title" className="w-full max-w-sm rounded-2xl border border-[#3f5437] bg-[#0b1710] p-6 shadow-2xl">
            <h2 id="hide-frog-title" className="text-lg text-[#dfe8d8]">let this frog sink?</h2>
            <p className="mt-3 text-sm leading-6 text-[#8fa087]">the swamp still remembers, but it won’t be displayed here.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFrogToHide(null)}
                disabled={deleting}
                className="rounded-xl border border-[#34452f] px-4 py-3 text-sm text-[#9eaa94] transition-colors hover:bg-[#142018] disabled:opacity-40"
              >
                keep it here
              </button>
              <button
                type="button"
                onClick={hideFrog}
                disabled={deleting}
                className="rounded-xl bg-[#8fa66c] px-4 py-3 text-sm text-[#0a1710] transition-all hover:bg-[#b2c791] active:scale-95 disabled:opacity-40"
              >
                {deleting ? 'sinking...' : 'let it sink'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
