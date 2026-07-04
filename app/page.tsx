'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import { parseTasks } from '@/lib/tasks'
import { getLocalContext } from '@/lib/local-context'

const MAX_DUMP_LENGTH = 2_000
const MAX_TASKS = 25
const RELIEF_DURATION_MS = 2_600
const RAW_DUMP_PLACEHOLDER = 'tapheretostartdumpingyourtasks,findmyredsocksandgetdressed,replymydadsmessages,ironmywrinkledtrousers,returnmyamazonpackage,foldlaundry.....'
const LOCAL_FROG_MEMORY_KEY = 'localFrogMemory'
const LOCAL_CURRENT_FROG_KEY = 'localCurrentFrog'

function withFullStop(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.endsWith('.')) return trimmed
  return `${trimmed.replace(/[!?…]+$/u, '').trim()}.`
}

function TypedText({
  text,
  speed = 18,
  delay = 0,
  className = '',
  onDone,
}: {
  text: string
  speed?: number
  delay?: number
  className?: string
  onDone?: () => void
}) {
  const [visibleText, setVisibleText] = useState('')
  const [done, setDone] = useState(false)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    let interval: number | undefined

    const timeout = window.setTimeout(() => {
      if (!text) {
        setDone(true)
        onDoneRef.current?.()
        return
      }

      let index = 0
      interval = window.setInterval(() => {
        index += 1
        setVisibleText(text.slice(0, index))

        if (index >= text.length) {
          if (interval) window.clearInterval(interval)
          setDone(true)
          onDoneRef.current?.()
        }
      }, speed)
    }, delay)

    return () => {
      window.clearTimeout(timeout)
      if (interval) window.clearInterval(interval)
    }
  }, [delay, speed, text])

  return (
    <span className={`typed-text ${done ? 'typed-text-done' : 'typed-text-active'} ${className}`}>
      {visibleText}
    </span>
  )
}

function localGuestFrog(tasks: string) {
  const parsedTasks = parseTasks(tasks).map((task) => task.trim()).filter(Boolean)
  const firstTask = parsedTasks[Math.floor(Math.random() * parsedTasks.length)] || tasks.trim()
  const lower = firstTask.toLowerCase()
  let firstSteps = [
    'write the first visible word for this task',
    'open the place where this starts',
    'touch the nearest object for this task',
    'open a note taking app and tap the new note button',
  ]
  
  if (/\b(email|mail|inbox)\b/.test(lower)) firstSteps = ['open the email thread', 'reply with one rough sentence']
  else if (/\bschool|class|essay|homework|assignment|notes?\b/.test(lower)) firstSteps = ['open the school document', 'write one ugly first line']
  else if (/\bpackage|return|amazon|parcel\b/.test(lower)) firstSteps = ['open the return page', 'find the label first']
  else if (/\bcall|text|message|dm\b/.test(lower)) firstSteps = ["open that person's message thread", 'send the smallest honest reply']
  else if (/\bhome|house|room|clean|kitchen|trash|laundry|dishes\b/.test(lower)) firstSteps = ['stand at the doorway', 'touch the first thing out of place']
  else if (/\bwater|grocery|groceries|supermarket|shop|store\b/.test(lower)) firstSteps = ['open the shopping list', 'find your bag']

  return {
    chosenTask: firstTask,
    frog: firstSteps[Math.floor(Math.random() * firstSteps.length)] ?? firstSteps[0],
  }
}

function rememberLocalFrog(taskDump: string, chosenTask: string, frog: string) {
  if (!taskDump.trim()) return

  try {
    const current = JSON.parse(localStorage.getItem(LOCAL_FROG_MEMORY_KEY) ?? '[]')
    const next = [
      {
        id: `local-${Date.now()}`,
        task_dump: taskDump,
        chosen_task: chosenTask,
        chosen_task_position: null,
        frog,
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
      ...(Array.isArray(current) ? current : []),
    ].slice(0, 50)

    localStorage.setItem(LOCAL_FROG_MEMORY_KEY, JSON.stringify(next))
  } catch {
    // Local fallback memory is best-effort only.
  }
}

function rememberLocalCurrentFrog(
  taskDump: string,
  chosenTask: string,
  frog: string,
  status: 'active' | 'not_completed' = 'active',
  id = '',
) {
  if (!taskDump.trim() || !frog.trim()) return

  try {
    localStorage.setItem(LOCAL_CURRENT_FROG_KEY, JSON.stringify({
      id: id || `local-current-${Date.now()}`,
      task_dump: taskDump,
      chosen_task: chosenTask,
      chosen_task_position: null,
      frog,
      status,
      created_at: new Date().toISOString(),
    }))
  } catch {
    // Local current state is best-effort only.
  }
}

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
      return frog as {
        id: string
        task_dump: string
        chosen_task?: string | null
        frog: string
        status: 'active' | 'not_completed'
      }
    }
  } catch {
    // Local current state is best-effort only.
  }

  return null
}

function forgetLocalCurrentFrog() {
  try {
    localStorage.removeItem(LOCAL_CURRENT_FROG_KEY)
  } catch {
    // Local current state is best-effort only.
  }
}

export default function Home() {
  const { userId, isLoaded, isSignedIn } = useAuth()
  const { openSignUp } = useClerk()
  const [tasks, setTasks] = useState('')
  const [frog, setFrog] = useState('')
  const [frogId, setFrogId] = useState('')
  const [chosenTask, setChosenTask] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [restoringFrog, setRestoringFrog] = useState(true)
  const [taskBoxActive, setTaskBoxActive] = useState(false)
  const [hasMemory, setHasMemory] = useState(false)
  const [reliefMessage, setReliefMessage] = useState(false)
  const [dumpClearing, setDumpClearing] = useState(false)
  const [clearingDumpText, setClearingDumpText] = useState('')
  const [frogTypePhase, setFrogTypePhase] = useState(0)

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

        const local = process.env.NODE_ENV !== 'production' ? localCurrentFrog() : null
        const restoredFrog = data.frog ?? (local?.status === 'active' ? local : null)

        setHasMemory(Boolean(data.has_memory) || localStorage.getItem('hasMemory') === 'true')
        if (!restoredFrog) return

        setFrogId(restoredFrog.id)
        setTasks(restoredFrog.task_dump)
        setChosenTask(restoredFrog.chosen_task ?? '')
        setFrogTypePhase(restoredFrog.chosen_task?.trim() ? 0 : 1)
        setFrog(restoredFrog.frog)
      } catch (reason) {
        if (!cancelled && process.env.NODE_ENV !== 'production') {
          const local = localCurrentFrog()
          setHasMemory(localStorage.getItem('hasMemory') === 'true')
          if (local?.status === 'active') {
            setFrogId(local.id)
            setTasks(local.task_dump)
            setChosenTask(local.chosen_task ?? '')
            setFrogTypePhase(local.chosen_task?.trim() ? 0 : 1)
            setFrog(local.frog)
          }
        } else if (!cancelled) {
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
  const showClearingDump = dumpClearing && Boolean(clearingDumpText.trim())
  const showEmptyPrompt = !taskBoxActive && !tasks.trim() && !frog && !reliefMessage && !dumpClearing && !clearingDumpText
  const showDumpLimits = taskBoxActive && !frog
  const frogTaskText = withFullStop(chosenTask)
  const frogStepText = withFullStop(frog)

  function fadeCompletedDump() {
    setClearingDumpText(tasks)
    setTaskBoxActive(false)
    setFrog('')
    setFrogId('')
    setChosenTask('')
    setFrogTypePhase(0)
    forgetLocalCurrentFrog()

    window.requestAnimationFrame(() => {
      setDumpClearing(true)
      window.setTimeout(() => {
        setTasks('')
        setClearingDumpText('')
        setDumpClearing(false)
      }, 900)
    })
  }

  function clearCurrentFrog({ preserveLocalCurrent = false } = {}) {
    setTasks('')
    setFrog('')
    setFrogId('')
    setChosenTask('')
    setClearingDumpText('')
    setFrogTypePhase(0)
    if (!preserveLocalCurrent) forgetLocalCurrentFrog()
  }

  function settleLocalFrog(eventType: 'frog_completed' | 'frog_not_completed') {
    setHasMemory(true)

    if (eventType === 'frog_completed') {
      rememberLocalFrog(tasks, chosenTask, frog)
      setReliefMessage(true)
      window.setTimeout(() => setReliefMessage(false), RELIEF_DURATION_MS)
      fadeCompletedDump()
      return
    }

    rememberLocalCurrentFrog(tasks, chosenTask, frog, 'not_completed', frogId)
    clearCurrentFrog({ preserveLocalCurrent: true })
  }

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

      if (!response.ok) {
        if (!isSignedIn && response.status === 429 && data.code === 'guest_quota_reached') {
          if (process.env.NODE_ENV === 'production') {
            openSignUp()
            return
          }

          throw new Error(data.error || 'Guest quota reached locally.')
        }

        throw new Error(data.error || 'The swamp could not choose a frog.')
      }

      if (!data.frog) throw new Error('The swamp returned without a frog.')

      setFrogId(data.id ?? '')
      setChosenTask(data.chosen_task ?? '')
      setFrogTypePhase(data.chosen_task?.trim() ? 0 : 1)
      setFrog(data.frog)
      rememberLocalCurrentFrog(tasks, data.chosen_task ?? '', data.frog, 'active', data.id ?? '')
    } catch (reason) {
      if (process.env.NODE_ENV !== 'production') {
        const fallback = localGuestFrog(tasks)
        setFrogId('')
        setChosenTask(fallback.chosenTask)
        setFrogTypePhase(fallback.chosenTask.trim() ? 0 : 1)
        setFrog(fallback.frog)
        rememberLocalCurrentFrog(tasks, fallback.chosenTask, fallback.frog)
        return
      }

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
        setReliefMessage(true)
        window.setTimeout(() => setReliefMessage(false), RELIEF_DURATION_MS)
        fadeCompletedDump()
      } else {
        clearCurrentFrog()
      }
      return
    }

    if (!frogId) {
      if (process.env.NODE_ENV !== 'production') {
        settleLocalFrog(eventType)
        return
      }

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
        window.setTimeout(() => setReliefMessage(false), RELIEF_DURATION_MS)
      }

      setHasMemory(true)

      if (eventType === 'frog_completed') {
        fadeCompletedDump()
      } else {
        clearCurrentFrog()
      }
    } catch (reason) {
      if (process.env.NODE_ENV !== 'production') {
        settleLocalFrog(eventType)
        return
      }

      setError(reason instanceof Error ? reason.message : 'The swamp could not remember that. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`home-swamp page-surface relative min-h-screen overflow-hidden bg-[#07100b] text-[#e8e4da] ${frog ? 'frog-picked' : ''}`}>
      <div className="swamp-photo swamp-photo-dark" aria-hidden="true" />
      <div className="swamp-photo swamp-photo-light" aria-hidden="true" />
      <div className={`home-count ${showDumpLimits ? 'home-count-visible' : ''}`} aria-hidden={!showDumpLimits} aria-live={showDumpLimits ? 'polite' : 'off'}>
        <span>{tasks.length.toLocaleString()}/{MAX_DUMP_LENGTH.toLocaleString()}</span>
        <span>{taskCount}/{MAX_TASKS} tadpoles</span>
      </div>

      <section className={`dump-stage ${taskBoxActive ? 'dump-stage-active' : ''} ${frog ? 'dump-stage-hidden' : ''} ${dumpClearing ? 'dump-stage-clearing' : ''}`} aria-label="Task dump">
        <div className="dump-field">
          {showClearingDump ? (
            <div className="dump-clearing-text" aria-hidden="true">
              {clearingDumpText}
            </div>
          ) : showEmptyPrompt && (
            <div className="dump-placeholder" aria-hidden="true">
              <span className="dump-placeholder-raw">{RAW_DUMP_PLACEHOLDER}</span>
              <span className="dump-cursor" />
            </div>
          )}

          <textarea
            aria-label="Your task dump"
            value={tasks}
            onChange={(event) => setTasks(event.target.value)}
            onFocus={() => setTaskBoxActive(true)}
            onBlur={() => setTaskBoxActive(false)}
            spellCheck
            disabled={Boolean(frog) || loading || restoringFrog}
            maxLength={MAX_DUMP_LENGTH + 1}
            className={`dump-textarea ${showClearingDump ? 'dump-textarea-clearing' : ''}`}
          />
        </div>
        {dumpIsTooLarge && (
          <p role="alert" className="home-alert">
            This swamp is a little crowded. Keep it to {MAX_TASKS} tasks and {MAX_DUMP_LENGTH.toLocaleString()} characters.
          </p>
        )}

        {error && (
          <p role="alert" className="home-error">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={pickFrog}
          disabled={!isLoaded || !tasks.trim() || dumpIsTooLarge || loading || restoringFrog}
          data-analytics="into-swamp"
          className="into-swamp-button"
        >
          {loading ? 'choosing your frog...' : 'into the swamp'}
        </button>
      </section>

      {frog && (
        <section key={frogId} className="frog-stage mist-reveal" aria-label="Your frog">
          <div className="frog-result">
            <div className="drawn-frog-card">
              <div className="frog-card-label">frog:</div>
              {frogTaskText && (
                <div className="frog-card-task">
                  <TypedText
                    key={`task-${frogTaskText}`}
                    text={frogTaskText}
                    delay={430}
                    speed={64}
                    onDone={() => setFrogTypePhase((phase) => Math.max(phase, 1))}
                  />
                </div>
              )}

              {frogTypePhase >= 1 && (
                <>
                  <div className="frog-card-label frog-card-label-step">start here</div>
                  <div className={chosenTask ? 'frog-card-step with-task' : 'frog-card-step'}>
                    <TypedText
                      key={`step-${frogStepText}`}
                      text={frogStepText}
                      delay={820}
                      speed={98}
                      onDone={() => setFrogTypePhase((phase) => Math.max(phase, 2))}
                    />
                  </div>
                </>
              )}

              <div className={`frog-actions ${frogTypePhase >= 2 ? 'frog-actions-visible' : ''}`}>
                <button
                  type="button"
                  onClick={() => settleFrog('frog_completed')}
                  disabled={loading}
                  data-analytics="frog-done"
                  className="swamp-button"
                >
                  done
                </button>
                <button
                  type="button"
                  onClick={() => settleFrog('frog_not_completed')}
                  disabled={loading}
                  data-analytics="frog-not-yet"
                  className="swamp-button swamp-button-quiet"
                >
                  not yet
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {reliefMessage && (
        <div role="status" aria-label="The swamp feels lighter" className="lighter-veil fixed inset-0 z-50" />
      )}
    </main>
  )
}
