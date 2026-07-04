'use client'

import { useEffect, useState } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { getDisplayFrog, getTadpoles } from '@/lib/tasks'
import { LilyIcon } from '@/app/lily-icon'
import { LotusIcon } from '@/app/lotus-icon'
import {
  isMemoryContextSelection,
  MAX_ERA_NAME_LENGTH,
  memoryContextOptions,
  type MemoryContextSelection,
} from '@/lib/memory-context'

type Frog = {
  id: string
  task_dump: string
  frog: string
  chosen_task: string | null
  chosen_task_position: number | null
  status: 'active' | 'completed' | 'not_completed'
  created_at: string
  completed_at: string | null
}

const HIDDEN_FROGS_KEY = 'hiddenFrogIds'
const LOCAL_FROG_MEMORY_KEY = 'localFrogMemory'
const memorySections: Array<{
  key: keyof MemoryContextSelection
  label: string
  options: readonly string[]
}> = [
  { key: 'season', label: 'season', options: memoryContextOptions.season },
  { key: 'life_context', label: 'life context', options: memoryContextOptions.life_context },
  { key: 'energy', label: 'energy', options: memoryContextOptions.energy },
  { key: 'moment', label: 'moment', options: memoryContextOptions.moment },
]

function locallyHiddenFrogs() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(HIDDEN_FROGS_KEY) ?? '[]'))
  } catch {
    return new Set<string>()
  }
}

function localFrogMemory() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_FROG_MEMORY_KEY) ?? '[]')
    return Array.isArray(stored) ? stored.filter((frog): frog is Frog => {
      return Boolean(
        frog
        && typeof frog.id === 'string'
        && typeof frog.task_dump === 'string'
        && typeof frog.frog === 'string'
        && typeof frog.created_at === 'string',
      )
    }) : []
  } catch {
    return []
  }
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
  const { openSignUp } = useClerk()
  const [frogs, setFrogs] = useState<Frog[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [frogToHide, setFrogToHide] = useState<Frog | null>(null)
  const [error, setError] = useState('')
  const [markPanelOpen, setMarkPanelOpen] = useState(false)
  const [waterContext, setWaterContext] = useState<Partial<MemoryContextSelection>>({})
  const [eraName, setEraName] = useState('')
  const [currentEraName, setCurrentEraName] = useState('')
  const [savingMark, setSavingMark] = useState(false)
  const [markError, setMarkError] = useState('')
  const [waterMessage, setWaterMessage] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    async function loadHistory() {
      try {
        const response = await fetch('/api/history')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'The water’s memory is cloudy right now.')
        const hidden = locallyHiddenFrogs()
        const local = localFrogMemory()
        const server = (data.frogs ?? []) as Frog[]
        const seen = new Set<string>()
        const remembered = [...local, ...server].filter((frog) => {
          if (hidden.has(frog.id) || seen.has(frog.id)) return false
          seen.add(frog.id)
          return true
        })
        setFrogs(remembered)

        const contextResponse = await fetch('/api/memory-contexts')
        if (contextResponse.ok) {
          const contextData = await contextResponse.json()
          setCurrentEraName(contextData.context?.era_name ?? '')
        }
      } catch (reason) {
        if (process.env.NODE_ENV !== 'production') {
          const hidden = locallyHiddenFrogs()
          setFrogs(localFrogMemory().filter((frog) => !hidden.has(frog.id)))
          setError('')
        } else {
          setError(reason instanceof Error ? reason.message : 'The water’s memory is cloudy right now.')
        }
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [isLoaded, isSignedIn])

  async function hideFrog() {
    if (!frogToHide) return

    const frog = frogToHide
    setDeleting(true)
    setError('')

    // Let the interface respond immediately. The server update follows, while
    // local memory keeps the frog hidden if the live schema is still catching up.
    const hidden = locallyHiddenFrogs()
    hidden.add(frog.id)
    localStorage.setItem(HIDDEN_FROGS_KEY, JSON.stringify([...hidden]))
    setFrogs((current) => current.filter((item) => item.id !== frog.id))
    setFrogToHide(null)

    try {
      const response = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: frog.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'This frog would not sink just yet.')
    } catch (reason) {
      console.error('server-side frog concealment failed', reason)
    } finally {
      setDeleting(false)
    }
  }

  function openMarkPanel() {
    if (!isSignedIn) {
      openSignUp()
      return
    }

    setMarkError('')
    setMarkPanelOpen(true)
  }

  async function saveWaterContext() {
    if (!isMemoryContextSelection(waterContext)) return

    setSavingMark(true)
    setMarkError('')

    try {
      const response = await fetch('/api/memory-contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...waterContext, era_name: eraName }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The water could not hold that mark.')

      setWaterContext({})
      setEraName('')
      setCurrentEraName(data.context?.era_name ?? '')
      setMarkPanelOpen(false)
      setWaterMessage('the water remembers.')
      window.setTimeout(() => setWaterMessage(''), 2800)
    } catch (reason) {
      if (process.env.NODE_ENV !== 'production') {
        const localEraName = eraName.trim()
        setWaterContext({})
        setEraName('')
        setCurrentEraName(localEraName)
        setMarkPanelOpen(false)
        setWaterMessage('the water remembers.')
        window.setTimeout(() => setWaterMessage(''), 2800)
        return
      }

      setMarkError(reason instanceof Error ? reason.message : 'The water could not hold that mark.')
    } finally {
      setSavingMark(false)
    }
  }

  return (
    <main className="secondary-swamp page-surface min-h-screen p-6 pb-16 pt-24 text-[#c8d8b8]">
      <div className="secondary-swamp-shell secondary-memory-shell space-y-6">
        <nav aria-label="Memory navigation" className="secondary-nav">
          <Link href="/" className="secondary-nav-link secondary-nav-back">
            <LilyIcon /> {!isSignedIn || (!loading && frogs.length === 0) ? 'back' : 'back to swamp'}
          </Link>
          {isSignedIn && <Link href="/current" className="secondary-nav-link">currently</Link>}
        </nav>

        <div className="memory-heading-row">
          <h1 className="secondary-title">the water’s memory</h1>
          {isLoaded && (
            <button
              type="button"
              onClick={openMarkPanel}
              data-analytics="mark-water-open"
              className="mark-water-open-button"
            >
              mark the water
            </button>
          )}
        </div>

        {waterMessage && <p role="status" className="water-whisper secondary-muted">{waterMessage}</p>}
        {currentEraName && (
          <p className="secondary-muted">{currentEraName}</p>
        )}

        {loading && isSignedIn && <p className="secondary-muted">looking beneath the surface...</p>}
        {isLoaded && !isSignedIn && <p className="secondary-muted">sign in, and the swamp will remember.</p>}
        {error && <p role="alert" className="secondary-alert">{error}</p>}
        {!loading && isLoaded && !error && frogs.length === 0 && (
          <div className="secondary-empty-state">
            <p>nothing yet.</p>
            <p className="mt-5 text-lg italic leading-relaxed text-[rgba(242,225,196,0.54)]">
              complete your first frog<br />
              and it will appear here.
            </p>
            <Link
              href="/"
              data-analytics="history-empty-dump"
              className="secondary-box-link mt-7"
            >
              dump your tasks
            </Link>
          </div>
        )}

        {frogs.map((item) => {
          const tadpoles = getTadpoles(item.task_dump, item.chosen_task, item.frog, item.chosen_task_position)
          const displayFrog = getDisplayFrog(item.task_dump, item.chosen_task, item.frog)

          return (
            <article key={item.id} className="history-frog-card mist-reveal group relative space-y-3">
              <div>
                <p className="secondary-muted">frog</p>
                <p className="text-xl text-[rgba(242,225,196,0.82)]">{displayFrog}</p>
              </div>

              {displayFrog !== item.frog && (
                <details className="lily-details text-sm text-[#b7c9aa]">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-[rgba(242,225,196,0.56)] transition-colors hover:text-[rgba(242,225,196,0.82)]"><LotusIcon />your one small action</summary>
                  <p className="mt-2 pl-4">{item.frog}</p>
                </details>
              )}

              {tadpoles.length > 0 && (
                <details className="lily-details text-sm text-[#aab5a2]">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-[rgba(242,225,196,0.56)] transition-colors hover:text-[rgba(242,225,196,0.82)]"><LotusIcon />tadpoles</summary>
                  <ul className="mt-2 pl-4 space-y-1">
                    {tadpoles.map((tadpole, index) => <li key={`${tadpole}-${index}`}>{tadpole}</li>)}
                  </ul>
                </details>
              )}

              <button
                type="button"
                onClick={() => setFrogToHide(item)}
                data-analytics="hide-frog-open"
                className="memory-sink-button absolute bottom-4 left-5 text-sm text-[rgba(242,225,196,0.42)] opacity-60 transition-all hover:text-[rgba(242,225,196,0.72)] md:opacity-0 md:group-hover:opacity-100"
              >
                let it sink
              </button>

              <time
                dateTime={item.created_at}
                suppressHydrationWarning
                className="absolute bottom-4 right-5 text-sm text-[rgba(242,225,196,0.4)]"
              >
                {readableDate(item.created_at)}
              </time>
            </article>
          )
        })}
      </div>

      {frogToHide && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="hide-frog-title" className="secondary-dialog-card w-full max-w-sm p-6">
            <h2 id="hide-frog-title" className="text-lg text-[rgba(242,225,196,0.82)]">let this frog sink?</h2>
            <p className="mt-3 text-base leading-6 text-[rgba(242,225,196,0.62)]">the swamp still remembers, but it won’t be displayed here.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFrogToHide(null)}
                disabled={deleting}
                data-analytics="hide-frog-cancel"
                className="secondary-box-link px-4 py-3 text-sm disabled:opacity-40"
              >
                keep it here
              </button>
              <button
                type="button"
                onClick={hideFrog}
                disabled={deleting}
                data-analytics="hide-frog-confirm"
                className="secondary-box-link px-4 py-3 text-sm disabled:opacity-40"
              >
                {deleting ? 'sinking...' : 'let it sink'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {markPanelOpen && createPortal(
        <div className="mark-water-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-water-title"
            className="mark-water-card relative max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto"
          >
            <div className="relative z-10 p-5 sm:p-7">
              <div className="mark-water-heading-row flex flex-wrap items-center gap-3 pr-10 sm:gap-5">
                <h2 id="mark-water-title" className="shrink-0 text-2xl font-medium text-[rgba(242,225,196,0.82)]">mark the water</h2>
                <input
                  id="era-name"
                  type="text"
                  value={eraName}
                  onChange={(event) => setEraName(event.target.value)}
                  maxLength={MAX_ERA_NAME_LENGTH}
                  aria-label="Optionally name this era"
                  placeholder="what’s happening beneath the surface? optionally name this era."
                  className="mark-water-input min-w-0 flex-1 basis-72 px-3.5 py-2 text-base outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setMarkPanelOpen(false)}
                disabled={savingMark}
                aria-label="Close"
                data-analytics="mark-water-close"
                className="mark-water-close-button absolute right-4 top-4 px-2 py-1 text-xl disabled:opacity-40 sm:right-6 sm:top-6"
              >
                ×
              </button>

              <div className="mark-water-grid mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
              {memorySections.map((section) => (
                <section key={section.key} aria-labelledby={`water-${section.key}`}>
                  <h3 id={`water-${section.key}`} className="mark-water-section-label">
                    {section.label}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`water-${section.key}`}>
                    {section.options.map((option) => {
                      const selected = waterContext[section.key] === option
                      return (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setWaterContext((current) => ({ ...current, [section.key]: option }))}
                          className={`water-choice ${selected ? 'water-choice-selected' : ''}`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
              </div>

              {markError && <p role="alert" className="secondary-alert mark-water-error">{markError}</p>}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={saveWaterContext}
                  disabled={!isMemoryContextSelection(waterContext) || savingMark}
                  data-analytics="mark-water-save"
                  className="mark-water-save-button w-full px-6 py-3 text-base font-medium disabled:opacity-30 sm:w-auto sm:min-w-56"
                >
                  {savingMark ? 'remembering...' : 'mark this water'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </main>
  )
}
