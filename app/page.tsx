'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [tasks, setTasks] = useState('')
  const [frog, setFrog] = useState('')
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showFrog, setShowFrog] = useState(false)
  const [frogStartedAt, setFrogStartedAt] = useState<number | null>(null)
  const [atRisk, setAtRisk] = useState(false)
  const [chosenTask, setChosenTask] = useState("")
  const [startStep, setStartStep] = useState("");
  
  function extractAction(frogText: string) {
  const match = frogText.match(/🐸 moment’s frog:\n(.+)/);
  return match ? match[1] : frogText;
}

  useEffect(() => {
  const savedTasks = localStorage.getItem('tasks')
  const savedFrog = localStorage.getItem('frog')
  const savedStreak = localStorage.getItem('streak')

  if (savedTasks) setTasks(savedTasks)
  if (savedFrog) setFrog(savedFrog)
  if (savedStreak) setStreak(Number(savedStreak))
}, [])

useEffect(() => {
  localStorage.setItem('tasks', tasks)
}, [tasks])

useEffect(() => {
  localStorage.setItem('frog', frog)
}, [frog])

useEffect(() => {
  localStorage.setItem('streak', String(streak))
}, [streak])

 useEffect(() => {
  if (!frog || !frogStartedAt) return

  const interval = setInterval(() => {
    const elapsed = Date.now() - frogStartedAt

    // 5 minutes = at risk (adjust later)
    if (elapsed > 5 * 60 * 1000) {
      setAtRisk(true)
    }
  }, 1000)

  return () => clearInterval(interval)
}, [frog, frogStartedAt])


  const pickFrog = async () => {
  if (!tasks.trim()) return
  if (frog) return

  setLoading(true)

  try {
    const res = await fetch('/api/frog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks }),
    })

    const data = await res.json()
    setChosenTask(data.chosen_task || "")
   const newFrog = data.frog;

setShowFrog(false);

setTimeout(async () => {
  setFrog(newFrog)
  setFrogStartedAt(Date.now())
  setAtRisk(false)

  const action = extractAction(newFrog)

  await supabase.from('frog_events').insert({
    event_type: 'frog_picked',
    raw_tasks: tasks,
    frog_text: newFrog,
    action_text: action,
  })

  const step = generateStartStep(action)
  setStartStep(step)

  setShowFrog(true)
}, 300)

  } catch (err) {
    console.error(err)
  } finally {
    setLoading(false)
  }
}

function generateStartStep(task: string) {
  const t = task.toLowerCase();

  if (t.includes("write") || t.includes("edit")) {
    return "open the document and write one sentence";
  }

  if (t.includes("study")) {
    return "open your notes and read one page";
  }

  if (t.includes("code") || t.includes("build")) {
    return "open your editor and change one line";
  }

  if (t.includes("email") || t.includes("reply")) {
    return "open the message and type one sentence";
  }

  if (t.includes("clean")) {
    return "pick up the closest loose item to you";
  }

  return "start with the smallest possible step";
}

const taskCount = tasks
  .split("\n")
  .filter(t => t.trim() !== "")
  .length

  return (
 <main className="min-h-screen bg-[#0a1710] text-white flex flex-col items-center justify-center p-6 relative">
  
    <div className="w-full max-w-xl space-y-6">

      <div className="fixed bottom-6 right-6 text-[#8fa66c] text-sm font-mono opacity-70">
        mySwamp
       </div>

<div className="space-y-2">
  <div className="text-[#dfe8d8] text-3xl font-semibold tracking-tight">
    dump your tasks
  </div>
</div>


      {/* SWAMP PANEL */}
      <div className="swamp-panel relative w-full h-32 rounded-xl overflow-hidden">
        {!frog && (
          <>
            
            <div className="lily" />
          </>
        )}

        <textarea
          placeholder={`reply to mum
                        finish the slide
                        take out the bins...`}
          value={tasks}
          onChange={(e) => {
            setTasks(e.target.value)
            localStorage.setItem('tasks', e.target.value)
          }}
          disabled={!!frog}
className="
  relative z-20 block w-full h-full p-4
  bg-transparent text-white rounded-xl
  outline-none resize-none
  placeholder:text-zinc-600
  whitespace-pre-wrap
"
           />
      </div>

      

      <button
        onClick={pickFrog}
        disabled={!!frog || loading}
        className="w-full py-3 swamp-button font-medium transition disabled:opacity-40"
      >
        {loading ? 'choosing your frog...' : 'into the swamp'}
      </button>

      {frog && (
        <button
          onClick={() => {
            setStreak((s) => s + 1)

            setFrog('')
            setFrogStartedAt(null)
            setAtRisk(false)

            setTimeout(() => {
              pickFrog()
            }, 300)
          }}
          className="
            w-full py-4 rounded-2xl
            border border-lime-900/40
            bg-[#07100b]
            text-[#b7c89b]
            font-semibold text-lg
            transition-all duration-200
            hover:bg-[#9fb77b]
            hover:text-[#10140c]
            active:scale-95
          "
        >
          done
        </button>
      )}

      {frog && (
        <div className="text-sm text-[#7f8f73] text-center">
          frogs cleared: {streak}
        </div>
      )}

      {frog && (
        <div
          className={`space-y-3 transition-all duration-500 ${
            showFrog
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
         
         {taskCount > 1 && (
      <div className="p-4 rounded-2xl bg-[#0b120e] border border-[#33452d]/50">
        <div className="text-[#7f8f73] text-xs mb-2">
          frog
        </div>

        <div className="text-[#e6eadf] font-mono">
          {chosenTask}
        </div>
      </div>
    )}

    <div className="p-5 rounded-2xl bg-[#111713] border border-[#4f6f3d]/50">
      <div className="text-[#7f8f73] text-xs mb-2">
        first step
      </div>

      <div className="text-[#e6eadf] text-lg font-mono">
        {frog}
      </div>
    </div>
  </div>
)}

         

    </div>
  </main>
)
}