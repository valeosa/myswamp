'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { getDisplayFrog } from '@/lib/tasks'
import { LilyIcon } from '@/app/lily-icon'

type CurrentFrog = {
  id: string
  task_dump: string
  frog: string
  chosen_task: string | null
  status: 'active' | 'not_completed'
  created_at: string
}

type Tadpole = {
  id: string
  task_text: string
  source_frog_id: string
  created_at: string
}

export default function CurrentPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const [active, setActive] = useState<CurrentFrog | null>(null)
  const [pending, setPending] = useState<CurrentFrog[]>([])
  const [tadpoles, setTadpoles] = useState<Tadpole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clearingId, setClearingId] = useState('')
  const [clearingTadpoleId, setClearingTadpoleId] = useState('')
  const [clearingAllTadpoles, setClearingAllTadpoles] = useState(false)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [tadpoleMessage, setTadpoleMessage] = useState('')
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
        setTadpoles(data.tadpoles ?? [])
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The swamp could not see what is still in the water.')
      } finally {
        setLoading(false)
      }
    }

    loadCurrent()
  }, [isLoaded, isSignedIn])

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

  async function clearTadpole(tadpoleId: string) {
    setClearingTadpoleId(tadpoleId)
    setError('')

    try {
      const response = await fetch('/api/tadpoles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tadpoleId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The tadpole would not clear.')

      setTadpoles((current) => current.filter((tadpole) => tadpole.id !== tadpoleId))
      setTadpoleMessage('one less thing in the water.')
      window.setTimeout(() => setTadpoleMessage(''), 2200)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The tadpole would not clear.')
    } finally {
      setClearingTadpoleId('')
    }
  }

  async function clearAllTadpoles() {
    setClearingAllTadpoles(true)
    setError('')

    try {
      const response = await fetch('/api/tadpoles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The tadpoles would not clear.')

      setTadpoles([])
      setConfirmClearAll(false)
      setTadpoleMessage('the water is clear.')
      window.setTimeout(() => setTadpoleMessage(''), 2400)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The tadpoles would not clear.')
    } finally {
      setClearingAllTadpoles(false)
    }
  }

  return (
    <main className="page-surface min-h-screen bg-[#07100b] p-6 pb-16 pt-24 text-[#c8d8b8]">
      <div className="mx-auto max-w-2xl space-y-7">
        <nav aria-label="Current navigation" className="flex items-center gap-5 text-sm text-[#8fa66c]">
          <Link href="/" className="inline-flex items-center gap-2 opacity-70 transition-opacity hover:opacity-100">
            <LilyIcon /> back
          </Link>
          <Link href="/history" className="opacity-70 transition-opacity hover:opacity-100">the water’s memory</Link>
        </nav>

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
        {tadpoleMessage && <p role="status" className="water-whisper text-sm italic text-[#8fa66c]">{tadpoleMessage}</p>}

        {!loading && isSignedIn && !error && !active && pending.length === 0 && tadpoles.length === 0 && (
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
              <div className="flex items-center gap-4">
                <span className="text-sm">{tadpoles.length}</span>
                {tadpoles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="text-xs text-[#718b75] underline decoration-[#40573d] underline-offset-4 transition-colors hover:text-[#a8bd96]"
                  >
                    clear all tadpoles
                  </button>
                )}
              </div>
            </div>
            {tadpoles.map((tadpole) => (
              <div key={tadpole.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#294532]/70 bg-[#0b1710] px-5 py-4 text-[#c8d8b8]">
                <span>{tadpole.task_text}</span>
                <button
                  type="button"
                  onClick={() => clearTadpole(tadpole.id)}
                  disabled={Boolean(clearingTadpoleId) || clearingAllTadpoles}
                  className="shrink-0 rounded-full border border-[#334b35] px-3 py-1.5 text-xs text-[#8fa087] transition-colors hover:bg-[#334b35] hover:text-[#d6e3ca] disabled:opacity-35"
                >
                  {clearingTadpoleId === tadpole.id ? 'clearing...' : 'clear'}
                </button>
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

      </div>

      {reliefMessage && (
        <div role="status" className="lighter-veil fixed inset-0 z-50 flex items-center justify-center">
          <p className="simmer-text text-lg text-[#c8d8b8]">it’s lighter now.</p>
        </div>
      )}

      {confirmClearAll && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="clear-tadpoles-title" className="w-full max-w-sm rounded-2xl border border-[#3f5437] bg-[#0b1710] p-6">
            <h2 id="clear-tadpoles-title" className="text-lg text-[#c8d8b8]">clear every tadpole?</h2>
            <p className="mt-3 text-sm leading-6 text-[#8fa087]">they’ll leave the current water together. the swamp will remember it was a bulk clear.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                disabled={clearingAllTadpoles}
                className="rounded-xl border border-[#34452f] px-4 py-3 text-sm text-[#9eaa94] transition-colors hover:bg-[#142018] disabled:opacity-40"
              >
                keep them
              </button>
              <button
                type="button"
                onClick={clearAllTadpoles}
                disabled={clearingAllTadpoles}
                className="rounded-xl bg-[#8fa66c] px-4 py-3 text-sm text-[#0a1710] transition-all hover:bg-[#b2c791] active:scale-95 disabled:opacity-40"
              >
                {clearingAllTadpoles ? 'clearing...' : 'clear all'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
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
        <details className="lily-details mt-3 text-sm text-[#b7c9aa]">
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
