'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { getDisplayFrog, getTadpoles } from '@/lib/tasks'

type CurrentFrog = {
  id: string
  task_dump: string
  frog: string
  chosen_task: string | null
  status: 'active' | 'not_completed'
  created_at: string
}

export default function CurrentPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const [active, setActive] = useState<CurrentFrog | null>(null)
  const [pending, setPending] = useState<CurrentFrog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clearingId, setClearingId] = useState('')
  const [reliefMessage, setReliefMessage] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    async function loadCurrent() {
      try {
        const response = await fetch('/api/current')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'The swamp could not see what is still in the water.')
        setActive(data.active)
        setPending(data.pending ?? [])
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The swamp could not see what is still in the water.')
      } finally {
        setLoading(false)
      }
    }

    loadCurrent()
  }, [isLoaded, isSignedIn])

  const tadpoles = useMemo(() => {
    const records = active ? [active, ...pending] : pending
    const unique = new Map<string, string>()

    for (const record of records) {
      for (const tadpole of getTadpoles(record.task_dump, record.chosen_task, record.frog)) {
        unique.set(tadpole.toLocaleLowerCase(), tadpole)
      }
    }

    return [...unique.values()]
  }, [active, pending])

  async function completePending(frogId: string) {
    setClearingId(frogId)
    setError('')

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frogId, eventType: 'frog_completed' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The swamp could not clear that frog.')

      setPending((current) => current.filter((frog) => frog.id !== frogId))
      setReliefMessage(true)
      window.setTimeout(() => setReliefMessage(false), 2400)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The swamp could not clear that frog.')
    } finally {
      setClearingId('')
    }
  }

  return (
    <main className="page-surface min-h-screen bg-[#07100b] p-6 pb-16 pt-24 text-[#c8d8b8]">
      <div className="mx-auto max-w-2xl space-y-7">
        <Link href="/" className="inline-block text-sm text-[#8fa66c] opacity-70 transition-opacity hover:opacity-100">
          ← back
        </Link>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#c8d8b8]">currently</h1>
            <p className="mt-1 text-sm italic text-[#718b75]">what’s still in the water</p>
          </div>
          {pending.length > 0 && (
            <p className="text-sm text-[#718b75]">
              {pending.length === 1 ? 'one frog pending' : `${pending.length} frogs pending`}
            </p>
          )}
        </div>

        {loading && isSignedIn && <p className="text-[#8fa66c]">looking beneath the surface...</p>}
        {isLoaded && !isSignedIn && <p className="text-[#8fa66c]">sign in, and the swamp will remember.</p>}
        {error && <p role="alert" className="rounded-xl border border-[#6e4f3d] bg-[#241710] p-3 text-sm text-[#e2c2a8]">{error}</p>}

        {!loading && isSignedIn && !error && !active && pending.length === 0 && (
          <div className="py-24 text-center text-[#718b75]">
            <p className="text-xl">nothing waiting.</p>
          </div>
        )}

        {active && (
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6f9376]">current frog</p>
            <FrogCard frog={active} current />
          </section>
        )}

        {tadpoles.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between text-[#6f9376]">
              <p className="text-xs uppercase tracking-[0.2em]">tadpoles</p>
              <span className="text-sm">{tadpoles.length}</span>
            </div>
            {tadpoles.map((tadpole) => (
              <div key={tadpole.toLocaleLowerCase()} className="rounded-2xl border border-[#294532]/70 bg-[#0b1710] px-5 py-4 text-[#c8d8b8]">
                {tadpole}
              </div>
            ))}
          </section>
        )}

        {pending.length > 0 && (
          <section className="space-y-5 pt-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6f9376]">pending frogs</p>
            {pending.map((frog) => (
              <FrogCard
                key={frog.id}
                frog={frog}
                onDone={() => completePending(frog.id)}
                clearing={clearingId === frog.id}
              />
            ))}
          </section>
        )}

        <nav className="flex gap-5 pt-5 text-sm text-[#8fa66c]">
          <Link href="/" className="opacity-70 hover:opacity-100">swamp</Link>
          <Link href="/history" className="opacity-70 hover:opacity-100">the water’s memory</Link>
        </nav>
      </div>

      {reliefMessage && (
        <div role="status" className="lighter-veil fixed inset-0 z-50 flex items-center justify-center">
          <p className="simmer-text text-lg text-[#c8d8b8]">it’s lighter now.</p>
        </div>
      )}
    </main>
  )
}

function FrogCard({
  frog,
  current = false,
  onDone,
  clearing = false,
}: {
  frog: CurrentFrog
  current?: boolean
  onDone?: () => void
  clearing?: boolean
}) {
  const displayFrog = getDisplayFrog(frog.task_dump, frog.chosen_task, frog.frog)

  return (
    <article className={`mist-reveal rounded-2xl border bg-[#0b1710] p-5 ${current ? 'border-[#47714f]' : 'border-[#294532]/70'}`}>
      <p className="text-lg font-medium text-[#c8d8b8]">{displayFrog}</p>
      {displayFrog !== frog.frog && (
        <details className="mt-3 text-sm text-[#b7c9aa]">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[#718b75] hover:text-[#9caf9b]"><LilyIcon />start here</summary>
          <p className="mt-2 pl-4">{frog.frog}</p>
        </details>
      )}
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          disabled={clearing}
          className="mt-4 rounded-full border border-[#40573d] px-4 py-2 text-sm text-[#a8bd96] transition-colors hover:bg-[#40573d] hover:text-[#d6e3ca] disabled:opacity-40"
        >
          {clearing ? 'clearing...' : 'done'}
        </button>
      )}
    </article>
  )
}

function LilyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 14" className="h-3 w-4 fill-current opacity-80">
      <path d="M1 8.5C3.8 2.5 10.8.4 17 3.4c-1.2 1.1-2.3 2-3.4 2.8L19 8.8C14 13.2 5.8 13.4 1 8.5Z" />
    </svg>
  )
}
