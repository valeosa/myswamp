'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'

const MAX_DUMP_LENGTH = 4_000
const MAX_TASKS = 50

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth()
  const [tasks, setTasks] = useState('')
  const [frog, setFrog] = useState('')
  const [frogId, setFrogId] = useState('')
  const [chosenTask, setChosenTask] = useState('')
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showFrog, setShowFrog] = useState(false)
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      const savedFrog = localStorage.getItem('frog') ?? ''
      const savedFrogId = localStorage.getItem('frogId') ?? ''

      setTasks(localStorage.getItem('tasks') ?? '')
      setFrog(savedFrogId ? savedFrog : '')
      setFrogId(savedFrogId)
      setChosenTask(savedFrogId ? (localStorage.getItem('chosenTask') ?? '') : '')
      setStreak(Number(localStorage.getItem('streak') ?? 0))
      setShowFrog(Boolean(savedFrog && savedFrogId))
      setHydrated(true)
    })
  }, [])

  useEffect(() => { if (hydrated) localStorage.setItem('tasks', tasks) }, [hydrated, tasks])
  useEffect(() => { if (hydrated) localStorage.setItem('frog', frog) }, [frog, hydrated])
  useEffect(() => { if (hydrated) localStorage.setItem('frogId', frogId) }, [frogId, hydrated])
  useEffect(() => { if (hydrated) localStorage.setItem('chosenTask', chosenTask) }, [chosenTask, hydrated])
  useEffect(() => { if (hydrated) localStorage.setItem('streak', String(streak)) }, [hydrated, streak])

  const taskCount = tasks.split('\n').filter((task) => task.trim()).length
  const dumpIsTooLarge = tasks.length > MAX_DUMP_LENGTH || taskCount > MAX_TASKS

  async function pickFrog() {
    if (!isLoaded || !isSignedIn || !tasks.trim() || frog || dumpIsTooLarge) return

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

      setShowFrog(false)
      setFrogId(data.id)
      setChosenTask(data.chosen_task ?? '')
      setFrog(data.frog)
      requestAnimationFrame(() => setShowFrog(true))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The swamp is a little foggy. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function settleFrog(eventType: 'frog_completed' | 'frog_not_completed') {
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
        setStreak((current) => current + 1)
        setTasks('')
      }

      setFrog('')
      setFrogId('')
      setChosenTask('')
      setShowFrog(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The swamp could not remember that. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a1710] text-white flex flex-col items-center justify-center p-6 relative">
      <div className="w-full max-w-xl space-y-6">
        <Link
          href="/history"
          className="fixed bottom-6 right-6 text-[#8fa66c] text-sm font-mono opacity-70 hover:opacity-100"
        >
          the water’s memory
        </Link>

        <div className="space-y-1 text-center">
          <h1 className="text-[#dfe8d8] text-xl font-semibold tracking-tight">dump your tasks</h1>
          <p className="text-[#7f8f73] text-sm">get one small frog. nothing else for now.</p>
        </div>

        <div className="swamp-panel relative w-full h-40 rounded-xl overflow-hidden">
          {!frog && <div className="lily" />}

          {!tasks && (
            <div className="absolute top-4 left-4 z-10 pointer-events-none text-zinc-700 font-mono">
              <div>follow up on my cold email</div>
              <div>return my amazon package</div>
              <div>ask for the week 4 notes...</div>
            </div>
          )}

          <textarea
            aria-label="Your task dump"
            value={tasks}
            onChange={(event) => setTasks(event.target.value)}
            disabled={Boolean(frog) || loading}
            className="relative z-20 block w-full h-full p-4 bg-transparent text-white rounded-xl outline-none resize-none disabled:opacity-60"
          />
        </div>

        <div className="flex justify-between text-xs text-[#62705b]">
          <span>{taskCount}/{MAX_TASKS} tadpoles</span>
          <span>{tasks.length.toLocaleString()}/{MAX_DUMP_LENGTH.toLocaleString()}</span>
        </div>

        {!isSignedIn && isLoaded && (
          <p className="text-center text-sm text-[#9eaa94]">sign in above so the swamp can remember you.</p>
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
            disabled={!isLoaded || !isSignedIn || !tasks.trim() || dumpIsTooLarge || loading}
            className="w-full py-3 swamp-button font-medium transition disabled:opacity-40"
          >
            {loading ? 'choosing your frog...' : 'pick my frog'}
          </button>
        )}

        {frog && (
          <div className={`space-y-3 transition-all duration-500 ${showFrog ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            {taskCount > 1 && chosenTask && (
              <div className="p-4 rounded-2xl bg-[#0b120e] border border-[#33452d]/50">
                <div className="text-[#7f8f73] text-xs mb-2">frog</div>
                <div className="text-[#e6eadf] font-mono">{chosenTask}</div>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-[#111713] border border-[#4f6f3d]/50">
              <div className="text-[#7f8f73] text-xs mb-2">one small action</div>
              <div className="text-[#e6eadf] text-lg font-mono">{frog}</div>
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
                className="py-4 rounded-2xl border border-[#33452d]/50 text-[#8fa66c] transition hover:bg-[#111713] disabled:opacity-40"
              >
                not yet
              </button>
            </div>

            <div className="text-sm text-[#7f8f73] text-center">frogs cleared here: {streak}</div>
          </div>
        )}
      </div>
    </main>
  )
}
