'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { getDisplayFrog } from '@/lib/tasks'
import { LilyIcon } from '@/app/lily-icon'
import { LotusIcon } from '@/app/lotus-icon'
import { getLocalContext } from '@/lib/local-context'

type CurrentFrog = {
  id: string
  task_dump: string
  frog: string
  chosen_task: string | null
  chosen_task_position: number | null
  status: 'active' | 'not_completed'
  created_at: string
}

type Tadpole = {
  id: string
  task_text: string
  source_frog_id: string
  created_at: string
}

const LOCAL_CURRENT_FROG_KEY = 'localCurrentFrog'
const LOCAL_FROG_MEMORY_KEY = 'localFrogMemory'
const RELIEF_DURATION_MS = 1_000

function localCurrentFrog() {
  try {
    const frog = JSON.parse(localStorage.getItem(LOCAL_CURRENT_FROG_KEY) ?? 'null')
    if (
      frog
      && typeof frog.id === 'string'
      && typeof frog.task_dump === 'string'
      && typeof frog.frog === 'string'
      && (frog.status === 'active' || frog.status === 'not_completed')
    ) {
      return frog as CurrentFrog
    }
  } catch {
    // Local current state is best-effort only.
  }

  return null
}

function rememberCompletedLocalFrog(frog: CurrentFrog) {
  try {
    const current = JSON.parse(localStorage.getItem(LOCAL_FROG_MEMORY_KEY) ?? '[]')
    const next = [
      {
        ...frog,
        id: frog.id || `local-${Date.now()}`,
        status: 'completed',
        completed_at: new Date().toISOString(),
      },
      ...(Array.isArray(current) ? current : []),
    ].slice(0, 50)

    localStorage.setItem(LOCAL_FROG_MEMORY_KEY, JSON.stringify(next))
    localStorage.removeItem(LOCAL_CURRENT_FROG_KEY)
    localStorage.setItem('hasMemory', 'true')
  } catch {
    // Local fallback memory is best-effort only.
  }
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
        const local = localCurrentFrog()
        const localPending = local?.status === 'not_completed' ? [local] : []
        setActive(data.active ?? (local?.status === 'active' ? local : null))
        setPending([...(data.pending ?? []), ...localPending])
        setTadpoles(data.tadpoles ?? [])
      } catch (reason) {
        if (process.env.NODE_ENV !== 'production') {
          const local = localCurrentFrog()
          setActive(local?.status === 'active' ? local : null)
          setPending(local?.status === 'not_completed' ? [local] : [])
          setTadpoles([])
          setError('')
        } else {
          setError(reason instanceof Error ? reason.message : 'The swamp could not see what is still in the water.')
        }
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
        body: JSON.stringify({ frogId, eventType: 'frog_completed', context: getLocalContext() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The swamp could not clear that frog.')

      setPending((current) => current.filter((frog) => frog.id !== frogId))
      setReliefMessage(true)
      window.setTimeout(() => setReliefMessage(false), RELIEF_DURATION_MS)
    } catch (reason) {
      if (process.env.NODE_ENV !== 'production') {
        const frog = pending.find((item) => item.id === frogId)
        if (frog) rememberCompletedLocalFrog(frog)
        setPending((current) => current.filter((frog) => frog.id !== frogId))
        setReliefMessage(true)
        window.setTimeout(() => setReliefMessage(false), RELIEF_DURATION_MS)
        return
      }

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
        body: JSON.stringify({ tadpoleId, context: getLocalContext() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The tadpole would not clear.')

      setTadpoles((current) => current.filter((tadpole) => tadpole.id !== tadpoleId))
      setTadpoleMessage('one less thing in the water.')
      window.setTimeout(() => setTadpoleMessage(''), 2200)
    } catch (reason) {
      if (process.env.NODE_ENV !== 'production') {
        setTadpoles((current) => current.filter((tadpole) => tadpole.id !== tadpoleId))
        setTadpoleMessage('one less thing in the water.')
        window.setTimeout(() => setTadpoleMessage(''), 2200)
        return
      }

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
        body: JSON.stringify({ clearAll: true, context: getLocalContext() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The tadpoles would not clear.')

      setTadpoles([])
      setConfirmClearAll(false)
      setTadpoleMessage('the water is clear.')
      window.setTimeout(() => setTadpoleMessage(''), 2400)
    } catch (reason) {
      if (process.env.NODE_ENV !== 'production') {
        setTadpoles([])
        setConfirmClearAll(false)
        setTadpoleMessage('the water is clear.')
        window.setTimeout(() => setTadpoleMessage(''), 2400)
        return
      }

      setError(reason instanceof Error ? reason.message : 'The tadpoles would not clear.')
    } finally {
      setClearingAllTadpoles(false)
    }
  }

  return (
    <main className="secondary-swamp page-surface min-h-screen p-6 pb-16 pt-24 text-[#c8d8b8]">
      <div className="secondary-swamp-shell secondary-current-shell space-y-7">
        <nav aria-label="Current navigation" className="secondary-nav">
          <Link href="/" className="secondary-nav-link secondary-nav-back">
            <LilyIcon /> back
          </Link>
          <Link href="/history" className="secondary-nav-link">the water’s memory</Link>
        </nav>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="secondary-title">currently</h1>
            <p className="secondary-subtitle">what’s still in the water</p>
          </div>
        </div>

        {loading && isSignedIn && <p className="secondary-muted">looking beneath the surface...</p>}
        {isLoaded && !isSignedIn && (
          <div className="secondary-empty-card space-y-4">
            <p>sign in, and the swamp will remember.</p>
            <Link
              href="/"
              data-analytics="current-empty-back"
              className="secondary-box-link"
            >
              dump your tasks
            </Link>
          </div>
        )}
        {error && <p role="alert" className="secondary-alert">{error}</p>}
        {tadpoleMessage && <p role="status" className="water-whisper secondary-muted">{tadpoleMessage}</p>}

        {!loading && isSignedIn && !error && !active && pending.length === 0 && tadpoles.length === 0 && (
          <div className="secondary-empty-state">
            <p>nothing waiting.</p>
            <Link
              href="/"
              data-analytics="current-empty-dump"
              className="secondary-box-link mt-6"
            >
              dump your tasks
            </Link>
          </div>
        )}

        {active && (
          <section className="space-y-3">
            <p className="secondary-muted">current frog</p>
            <FrogCard frog={active} current />
          </section>
        )}

        {tadpoles.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-[#718b75]">
              <p className="secondary-muted">
                {tadpoles.length} {tadpoles.length === 1 ? 'tadpole' : 'tadpoles'}
              </p>
              {tadpoles.length > 1 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  data-analytics="clear-all-tadpoles-open"
                  className="text-xs opacity-70 transition-opacity hover:opacity-100"
                >
                  clear all
                </button>
              )}
            </div>
            <div className="divide-y divide-[#3d362c]/40">
              {tadpoles.map((tadpole) => (
                <div key={tadpole.id} className="flex items-center justify-between gap-4 px-1 py-4 text-[rgba(242,225,196,0.74)]">
                  <span className="flex min-w-0 items-center gap-3">
                    <LotusIcon className="text-[rgba(242,225,196,0.58)]" />
                    <span>{tadpole.task_text}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => clearTadpole(tadpole.id)}
                    disabled={Boolean(clearingTadpoleId) || clearingAllTadpoles}
                    data-analytics="clear-tadpole"
                    className="shrink-0 px-2 py-1 text-sm text-[rgba(242,225,196,0.52)] opacity-75 transition-opacity hover:opacity-100 disabled:opacity-35"
                  >
                    {clearingTadpoleId === tadpole.id ? 'clearing...' : 'clear'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {pending.length > 0 && (
          <section className="space-y-5 pt-4">
            <p className="secondary-muted">sunken frogs</p>
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
        <div role="status" aria-label="The swamp feels lighter" className="lighter-veil fixed inset-0 z-50" />
      )}

      {confirmClearAll && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="clear-tadpoles-title" className="secondary-dialog-card w-full max-w-sm p-6">
            <h2 id="clear-tadpoles-title" className="text-lg text-[rgba(242,225,196,0.82)]">clear every tadpole?</h2>
            <p className="mt-3 text-base leading-6 text-[rgba(242,225,196,0.62)]">they’ll leave the current water together. the swamp will remember it was a bulk clear.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                disabled={clearingAllTadpoles}
                data-analytics="clear-all-tadpoles-cancel"
                className="secondary-box-link px-4 py-3 text-sm disabled:opacity-40"
              >
                keep them
              </button>
              <button
                type="button"
                onClick={clearAllTadpoles}
                disabled={clearingAllTadpoles}
                data-analytics="clear-all-tadpoles-confirm"
                className="secondary-box-link px-4 py-3 text-sm disabled:opacity-40"
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
    <article className={`secondary-frog-card mist-reveal ${current ? 'secondary-frog-card-current' : ''}`}>
      <p className="text-xl font-medium text-[rgba(242,225,196,0.84)]">{displayFrog}</p>
      {displayFrog !== frog.frog && (
        <details className="lily-details mt-3 text-sm text-[#b7c9aa]">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[rgba(242,225,196,0.58)] hover:text-[rgba(242,225,196,0.82)]"><LotusIcon />start here</summary>
          <p className="mt-2 pl-4">{frog.frog}</p>
        </details>
      )}
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          disabled={clearing}
          data-analytics={current ? 'current-frog-done' : 'sunken-frog-done'}
          className="secondary-box-link mt-4 px-4 py-2 text-sm disabled:opacity-40"
        >
          {clearing ? 'clearing...' : 'done'}
        </button>
      )}
    </article>
  )
}
