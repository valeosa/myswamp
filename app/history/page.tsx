'use client'

import { useEffect, useState } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { getDisplayFrog, getTadpoles } from '@/lib/tasks'
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
  status: 'active' | 'completed' | 'not_completed'
  created_at: string
  completed_at: string | null
}

const HIDDEN_FROGS_KEY = 'hiddenFrogIds'
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
  const { openSignIn } = useClerk()
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
        setFrogs((data.frogs ?? []).filter((frog: Frog) => !hidden.has(frog.id)))

        const contextResponse = await fetch('/api/memory-contexts')
        if (contextResponse.ok) {
          const contextData = await contextResponse.json()
          setCurrentEraName(contextData.context?.era_name ?? '')
        }
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
      openSignIn()
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
      setMarkError(reason instanceof Error ? reason.message : 'The water could not hold that mark.')
    } finally {
      setSavingMark(false)
    }
  }

  return (
    <main className="page-surface min-h-screen bg-[#07100b] p-6 pb-16 pt-24 font-sans text-[#c8d8b8]">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/" className="inline-block text-[#8fa66c] text-sm opacity-70 transition-opacity hover:opacity-100">
          {!isSignedIn || (!loading && frogs.length === 0) ? '← back' : '← back to swamp'}
        </Link>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#c8d8b8]">the water’s memory</h1>
            <p className="mt-1 text-sm italic text-[#718b75]">what surfaced, what was done</p>
          </div>
          {isLoaded && (
            <button
              type="button"
              onClick={openMarkPanel}
              className="shrink-0 rounded-full border border-[#40573d] px-4 py-2 text-xs text-[#9fb77b] transition-colors hover:bg-[#142018] hover:text-[#c8d8b8]"
            >
              mark the water
            </button>
          )}
        </div>

        {waterMessage && <p role="status" className="water-whisper text-sm italic text-[#8fa66c]">{waterMessage}</p>}
        {currentEraName && (
          <p className="text-sm text-[#8fa66c]">
            <span className="mr-2 text-xs uppercase tracking-[0.16em] text-[#607a62]">current era</span>
            {currentEraName}
          </p>
        )}

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
          const tadpoles = getTadpoles(item.task_dump, item.chosen_task, item.frog)
          const displayFrog = getDisplayFrog(item.task_dump, item.chosen_task, item.frog)

          return (
            <article key={item.id} className="mist-reveal group relative space-y-3 rounded-2xl border border-lime-900/40 bg-[#0b1710] p-5 pb-12 transition-colors hover:border-[#38522e]">
              <div className="flex justify-end text-xs text-[#8fa66c]">
                <span>finished</span>
              </div>

              <div>
                <p className="text-[#8fa66c] text-sm">frog</p>
                <p className="text-[#c8d8b8]">{displayFrog}</p>
              </div>

              {displayFrog !== item.frog && (
                <details className="lily-details text-sm text-[#b7c9aa]">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-[#718067] transition-colors hover:text-[#a7b69a]"><LilyIcon />your one small action</summary>
                  <p className="mt-2 pl-4">{item.frog}</p>
                </details>
              )}

              {tadpoles.length > 0 && (
                <details className="lily-details text-sm text-[#aab5a2]">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-[#718067] transition-colors hover:text-[#a7b69a]"><LilyIcon />tadpoles</summary>
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

      {frogToHide && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="hide-frog-title" className="w-full max-w-sm rounded-2xl border border-[#3f5437] bg-[#0b1710] p-6">
            <h2 id="hide-frog-title" className="text-lg text-[#c8d8b8]">let this frog sink?</h2>
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
        </div>,
        document.body,
      )}

      {markPanelOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 sm:p-6" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-water-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#3f5437] bg-[#09140d] p-5 shadow-2xl shadow-black/40 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="mark-water-title" className="text-xl font-medium text-[#c8d8b8]">mark the water</h2>
                <p className="mt-1 text-sm italic text-[#718b75]">what is life moving through right now?</p>
              </div>
              <button
                type="button"
                onClick={() => setMarkPanelOpen(false)}
                disabled={savingMark}
                aria-label="Close"
                className="rounded-full px-2 py-1 text-lg text-[#718067] transition-colors hover:text-[#c8d8b8] disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <div className="mt-7 space-y-6">
              <div>
                <label htmlFor="era-name" className="text-xs uppercase tracking-[0.2em] text-[#718067]">
                  name this era <span className="normal-case tracking-normal opacity-70">(optional)</span>
                </label>
                <input
                  id="era-name"
                  type="text"
                  value={eraName}
                  onChange={(event) => setEraName(event.target.value)}
                  maxLength={MAX_ERA_NAME_LENGTH}
                  placeholder="starting a new chapter"
                  className="mt-3 w-full border-0 border-b border-[#30442f] bg-transparent px-0 py-2 text-[#c8d8b8] outline-none placeholder:text-[#516052] focus:border-[#8fa66c]"
                />
              </div>

              {memorySections.map((section) => (
                <section key={section.key} aria-labelledby={`water-${section.key}`}>
                  <h3 id={`water-${section.key}`} className="text-xs uppercase tracking-[0.2em] text-[#718067]">
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
                          className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                            selected
                              ? 'border-[#8fa66c] bg-[#8fa66c] text-[#0a1710]'
                              : 'border-[#30442f] bg-[#0d1b12] text-[#9eaa94] hover:border-[#526b49] hover:text-[#c8d8b8]'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>

            {markError && <p role="alert" className="mt-6 text-sm text-[#e2c2a8]">{markError}</p>}

            <button
              type="button"
              onClick={saveWaterContext}
              disabled={!isMemoryContextSelection(waterContext) || savingMark}
              className="mt-7 w-full rounded-2xl bg-[#8fa66c] px-4 py-3 text-sm font-medium text-[#0a1710] transition-all hover:bg-[#b2c791] active:scale-[0.99] disabled:opacity-30"
            >
              {savingMark ? 'remembering...' : 'mark this water'}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </main>
  )
}

function LilyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 14" className="lily-toggle h-3 w-4 fill-current opacity-80">
      <path d="M1 8.5C3.8 2.5 10.8.4 17 3.4c-1.2 1.1-2.3 2-3.4 2.8L19 8.8C14 13.2 5.8 13.4 1 8.5Z" />
    </svg>
  )
}
