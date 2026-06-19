'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { getTadpoles } from '@/lib/tasks'

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

  return (
    <main className="min-h-screen bg-[#07100b] p-6 pt-24 text-white">
      <div className="mx-auto max-w-2xl space-y-7">
        <Link href="/" className="inline-block text-sm text-[#8fa66c] opacity-70 transition-opacity hover:opacity-100">
          ← back
        </Link>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#e4eddc]">currently</h1>
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
            <p className="mt-3 text-sm italic">the water is still.</p>
          </div>
        )}

        {active && (
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6f9376]">current frog</p>
            <FrogCard frog={active} current />
          </section>
        )}

        {pending.length > 0 && (
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6f9376]">pending frogs</p>
            {pending.map((frog) => <FrogCard key={frog.id} frog={frog} />)}
          </section>
        )}

        {tadpoles.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between text-[#6f9376]">
              <p className="text-xs uppercase tracking-[0.2em]">tadpoles</p>
              <span className="text-sm">{tadpoles.length}</span>
            </div>
            {tadpoles.map((tadpole) => (
              <div key={tadpole.toLocaleLowerCase()} className="rounded-2xl border border-[#294532]/70 bg-[#0b1710] px-5 py-4 text-[#d9e1d4]">
                {tadpole}
              </div>
            ))}
          </section>
        )}

        <nav className="flex gap-5 border-t border-[#1d3525] pt-5 text-sm text-[#8fa66c]">
          <Link href="/" className="opacity-70 hover:opacity-100">swamp</Link>
          <Link href="/history" className="opacity-70 hover:opacity-100">the water’s memory</Link>
        </nav>
      </div>
    </main>
  )
}

function FrogCard({ frog, current = false }: { frog: CurrentFrog; current?: boolean }) {
  return (
    <article className={`rounded-2xl border bg-[#0b1710] p-5 ${current ? 'border-[#47714f]' : 'border-[#294532]/70'}`}>
      <p className="text-lg font-medium text-[#e4eddc]">{frog.chosen_task || frog.frog}</p>
      {frog.chosen_task && (
        <details className="mt-3 text-sm text-[#c7d0c2]">
          <summary className="cursor-pointer text-[#718b75] hover:text-[#9caf9b]">start here</summary>
          <p className="mt-2 pl-4">{frog.frog}</p>
        </details>
      )}
    </article>
  )
}
