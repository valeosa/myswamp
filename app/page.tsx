'use client'

import { useEffect, useState } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { parseTasks } from '@/lib/tasks'
import { SwampScenery } from '@/app/swamp-scenery'
import { getLocalContext } from '@/lib/local-context'

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
      localStorage.removeItem('tasks')
      setHasMemory(localStorage.getItem('hasMemory') === 'true')
      localStorage.removeItem('frog')
      localStorage.removeItem('frogId')
      localStorage.removeItem('chosenTask')
      setHydrated(true)
    })
  }, [])

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
        body: JSON.stringify({
          tasks,
          context: getLocalContext(),
        }),
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
      setTasks('')
      if (eventType === 'frog_completed') {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName: 'frog_completed' }),
          keepalive: true,
        }).catch(() => undefined)
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
        body: JSON.stringify({ frogId, eventType, context: getLocalContext() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The swamp could not remember that.')

      if (eventType === 'frog_completed') {
        setReliefMessage(true)
        window.setTimeout(() => setReliefMessage(false), 2400)
      } else {
        setPendingCount((current) => current + 1)
      }

      setTasks('')

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
            <div className="rounded-2xl border border-[#4f6f3d]/50 bg-[#0d1510] p-5">
              {chosenTask && (
                <div>
                  <div className="mb-2 text-xs text-[#7f8f73]">your frog</div>
                  <div className="text-lg text-[#c8d8b8]">{chosenTask}</div>
                </div>
              )}

              <div className={chosenTask ? 'mt-5 border-t border-[#33452d]/45 pt-4' : ''}>
                <div className="mb-2 text-xs text-[#7f8f73]">first step</div>
                <div className="text-base text-[#b9c9aa]">{frog}</div>
              </div>
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
                ? <Link href="/history" className="opacity-70 transition-opacity hover:opacity-100">my water’s memory</Link>
                : <button type="button" onClick={() => openSignIn()} className="opacity-70 transition-opacity hover:opacity-100">the water’s memory</button>
            )}
          </nav>
        )}

        {reliefMessage && (
          <div role="status" className="lighter-veil fixed inset-0 z-50 flex items-center justify-center">
            <p className="simmer-text text-2xl font-semibold text-[#c8d8b8]">it’s lighter now.</p>
          </div>
        )}
      </div>
    </main>
  )
}
