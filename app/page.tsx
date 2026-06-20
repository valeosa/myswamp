'use client'

import { useEffect, useState } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { parseTasks } from '@/lib/tasks'

const MAX_DUMP_LENGTH = 2_000
const MAX_TASKS = 25

export default function Home() {
  const { userId, isLoaded, isSignedIn } = useAuth()
  const { openSignIn } = useClerk()
  const [tasks, setTasks] = useState('')
  const [frog, setFrog] = useState('')
  const [frogId, setFrogId] = useState('')
  const [chosenTask, setChosenTask] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [restoringFrog, setRestoringFrog] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [taskBoxActive, setTaskBoxActive] = useState(false)
  const [hasMemory, setHasMemory] = useState(false)
  const [reliefMessage, setReliefMessage] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setTasks(localStorage.getItem('tasks') ?? '')
      setHasMemory(localStorage.getItem('hasMemory') === 'true')
      localStorage.removeItem('frog')
      localStorage.removeItem('frogId')
      localStorage.removeItem('chosenTask')
      setHydrated(true)
    })
  }, [])

  useEffect(() => { if (hydrated) localStorage.setItem('tasks', tasks) }, [hydrated, tasks])
  useEffect(() => { if (hydrated) localStorage.setItem('hasMemory', String(hasMemory)) }, [hasMemory, hydrated])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn || !userId) {
      queueMicrotask(() => setRestoringFrog(false))
      return
    }

    let cancelled = false

    async function restoreActiveFrog() {
      try {
        const response = await fetch('/api/frog')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'The swamp could not find your resting frog.')
        if (cancelled) return

        setPendingCount(data.pending_count ?? 0)
        setHasMemory(Boolean(data.has_memory))
        if (!data.frog) return

        setFrogId(data.frog.id)
        setTasks(data.frog.task_dump)
        setChosenTask(data.frog.chosen_task ?? '')
        setFrog(data.frog.frog)
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'The swamp could not find your resting frog.')
        }
      } finally {
        if (!cancelled) setRestoringFrog(false)
      }
    }

    restoreActiveFrog()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, userId])

  const taskCount = parseTasks(tasks).length
  const dumpIsTooLarge = tasks.length > MAX_DUMP_LENGTH || taskCount > MAX_TASKS

  async function pickFrog() {
    if (!isLoaded || !tasks.trim() || frog || dumpIsTooLarge) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/frog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'The swamp could not choose a frog.')

      setFrogId(data.id ?? '')
      setChosenTask(data.chosen_task ?? '')
      setFrog(data.frog)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The swamp is a little foggy. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function settleFrog(eventType: 'frog_completed' | 'frog_not_completed') {
    if (!isSignedIn) {
      if (eventType === 'frog_completed') {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName: 'frog_completed' }),
          keepalive: true,
        }).catch(() => undefined)
        setTasks('')
        setReliefMessage(true)
        window.setTimeout(() => setReliefMessage(false), 2400)
      }
      setFrog('')
      setFrogId('')
      setChosenTask('')
      return
    }

    if (!frogId) {
      setError('This frog is missing its memory. Choose a fresh frog and try again.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frogId, eventType }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The swamp could not remember that.')

      if (eventType === 'frog_completed') {
        setTasks('')
        setReliefMessage(true)
        window.setTimeout(() => setReliefMessage(false), 2400)
      } else {
        setPendingCount((current) => current + 1)
      }

      setHasMemory(true)

      setFrog('')
      setFrogId('')
      setChosenTask('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The swamp could not remember that. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-surface relative flex min-h-screen flex-col items-center justify-center bg-[#0a1710] p-6 pb-24 text-[#c8d8b8] sm:pb-6">
      <div className="w-full max-w-xl space-y-6">
        {isLoaded && !isSignedIn && (
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-[#c8d8b8]">dump your tasks,</h1>
            {!frog && <p className="text-sm italic text-[#8fa66c]">the swamp surfaces one thing to do next.</p>}
          </div>
        )}

        <div className="swamp-panel relative w-full h-40 rounded-xl overflow-hidden">
          <SwampScenery />

          {!tasks && (
            <div className="absolute left-4 top-4 z-10 pointer-events-none font-sans text-[#66735f]">
              {isSignedIn ? (
                <div>dump your tasks...</div>
              ) : (
                <>
                  <div>follow up on my cold email</div>
                  <div>return my amazon package</div>
                  <div>ask for the week 4 notes...</div>
                </>
              )}
            </div>
          )}

          <textarea
            aria-label="Your task dump"
            value={tasks}
            onChange={(event) => setTasks(event.target.value)}
            onFocus={() => setTaskBoxActive(true)}
            onBlur={() => setTaskBoxActive(false)}
            disabled={Boolean(frog) || loading || restoringFrog}
            className="relative z-20 block h-full w-full resize-none rounded-xl bg-transparent p-4 text-[#c8d8b8] outline-none caret-[#9fb77b] disabled:opacity-60"
          />
        </div>

        {taskBoxActive && (
          <div className="water-whisper flex justify-between text-xs text-[#718b75]">
            <span>{taskCount}/{MAX_TASKS} tadpoles</span>
            <span>{tasks.length.toLocaleString()}/{MAX_DUMP_LENGTH.toLocaleString()}</span>
          </div>
        )}

        {dumpIsTooLarge && (
          <p role="alert" className="text-center text-sm text-[#d0ae82]">
            This swamp is a little crowded. Keep it to {MAX_TASKS} tasks and {MAX_DUMP_LENGTH.toLocaleString()} characters.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-[#6e4f3d] bg-[#241710] p-3 text-sm text-[#e2c2a8]">
            {error}
          </p>
        )}

        {!frog && (
          <button
            onClick={pickFrog}
            disabled={!isLoaded || !tasks.trim() || dumpIsTooLarge || loading || restoringFrog}
            className="w-full py-3 swamp-button font-medium transition disabled:opacity-40"
          >
            {loading ? 'choosing your frog...' : 'into the swamp'}
          </button>
        )}

        {!frog && tasks.trim() && !isSignedIn && isLoaded && (
          <p className="text-center text-sm text-[#9eaa94]">sign in above so the swamp can remember you.</p>
        )}

        {frog && (
          <div key={frogId} className="mist-reveal space-y-3">
            {taskCount > 1 && chosenTask && (
              <div className="p-4 rounded-2xl bg-[#0b120e] border border-[#33452d]/50">
                <div className="text-[#7f8f73] text-xs mb-2">frog</div>
                <div className="text-[#c8d8b8]">{chosenTask}</div>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-[#111713] border border-[#4f6f3d]/50">
              <div className="text-[#7f8f73] text-xs mb-2">start here</div>
              <div className="text-lg text-[#c8d8b8]">{frog}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => settleFrog('frog_completed')}
                disabled={loading}
                className="py-4 rounded-2xl border border-lime-900/40 bg-[#07100b] text-[#b7c89b] font-semibold transition hover:bg-[#9fb77b] hover:text-[#10140c] disabled:opacity-40"
              >
                done
              </button>
              <button
                onClick={() => settleFrog('frog_not_completed')}
                disabled={loading}
                className="py-4 rounded-2xl border border-[#33452d]/50 text-[#9db286] transition-colors hover:bg-[#647b51] hover:text-[#10140c] disabled:opacity-40"
              >
                not yet
              </button>
            </div>

          </div>
        )}

        {pendingCount > 0 && (
          <Link href="/current" className="block text-center text-sm text-[#8fa66c] opacity-80 transition-opacity hover:opacity-100">
            {pendingCount === 1 ? 'one frog pending' : `${pendingCount} frogs pending`}
          </Link>
        )}

        {(isSignedIn || hasMemory) && (
          <nav className="mt-10 flex justify-center gap-5 text-sm text-[#8fa66c] sm:fixed sm:bottom-6 sm:right-6 sm:mt-0">
            {isSignedIn && <Link href="/current" className="opacity-70 transition-opacity hover:opacity-100">currently</Link>}
            {hasMemory && (
              isSignedIn
                ? <Link href="/history" className="opacity-70 transition-opacity hover:opacity-100">the water’s memory</Link>
                : <button type="button" onClick={() => openSignIn()} className="opacity-70 transition-opacity hover:opacity-100">the water’s memory</button>
            )}
          </nav>
        )}

        {reliefMessage && (
          <div role="status" className="lighter-veil fixed inset-0 z-50 flex items-center justify-center">
            <p className="simmer-text text-lg text-[#c8d8b8]">it’s lighter now.</p>
          </div>
        )}
      </div>
    </main>
  )
}

function SwampScenery() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 160"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
    >
      <g fill="none" stroke="#829b78" strokeLinecap="round" opacity="0.2">
        <path d="M16 -4 C18 24 8 39 18 68" />
        <path d="M35 -5 C35 28 24 47 29 82" />
        <path d="M55 -3 C53 20 47 38 55 60" />
        <path d="M584 -4 C580 20 590 39 580 65" />
        <path d="M563 -4 C565 28 575 46 570 79" />
      </g>
      <g fill="#78936f" opacity="0.16">
        <ellipse cx="18" cy="35" rx="5" ry="2" transform="rotate(-28 18 35)" />
        <ellipse cx="30" cy="58" rx="5" ry="2" transform="rotate(30 30 58)" />
        <ellipse cx="54" cy="38" rx="4" ry="2" transform="rotate(-22 54 38)" />
        <ellipse cx="581" cy="34" rx="5" ry="2" transform="rotate(25 581 34)" />
        <ellipse cx="570" cy="58" rx="5" ry="2" transform="rotate(-30 570 58)" />
      </g>

      <path d="M0 126 C110 117 180 139 290 128 C410 116 490 136 600 123 L600 160 L0 160 Z" fill="#78936f" opacity="0.1" />

      <g fill="#476d43" opacity="0.42">
        <ellipse cx="82" cy="141" rx="17" ry="5" transform="rotate(-7 82 141)" />
        <path d="M82 141 L91 136 L88 144 Z" fill="#09150e" />
        <ellipse cx="500" cy="137" rx="21" ry="7" transform="rotate(8 500 137)" />
        <path d="M500 137 L510 130 L508 140 Z" fill="#09150e" />
        <ellipse cx="548" cy="149" rx="12" ry="4" transform="rotate(-10 548 149)" />
      </g>

      <g fill="#8ea77d" opacity="0.28">
        <path d="M145 137 C151 130 158 133 159 139 C154 142 149 143 145 137 Z" />
        <path d="M427 143 C433 136 440 139 441 145 C435 147 431 148 427 143 Z" />
      </g>

      <g opacity="0.34">
        <g transform="translate(32 143)">
          <circle r="2.4" fill="#b4bf8b" />
          <circle cx="-4" r="2.2" fill="#7d916b" />
          <circle cx="4" r="2.2" fill="#7d916b" />
          <circle cy="-4" r="2.2" fill="#7d916b" />
        </g>
        <g transform="translate(570 139)">
          <circle r="2.2" fill="#b4bf8b" />
          <circle cx="-3.6" r="2" fill="#7d916b" />
          <circle cx="3.6" r="2" fill="#7d916b" />
          <circle cy="-3.6" r="2" fill="#7d916b" />
        </g>
      </g>
    </svg>
  )
}
