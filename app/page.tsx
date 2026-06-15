'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [tasks, setTasks] = useState('')
  const [frog, setFrog] = useState('')
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showFrog, setShowFrog] = useState(false)
  const [frogStartedAt, setFrogStartedAt] = useState<number | null>(null)
  const [atRisk, setAtRisk] = useState(false)
  const [startStep, setStartStep] = useState("");
  
  function extractAction(frogText: string) {
  const match = frogText.match(/🐸 moment’s frog:\n(.+)/);
  return match ? match[1] : "";
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
   const newFrog = data.frog;

setShowFrog(false);

setTimeout(() => {
  setFrog(newFrog);
  setFrogStartedAt(Date.now());
  setAtRisk(false);

  // extract action from LLM output
  const action = extractAction(newFrog);

  // generate simple start step
  const step = generateStartStep(action);
  setStartStep(step);

  setShowFrog(true);
}, 300);

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

  return (
 <main className="min-h-screen bg-[#0a1710] text-white flex flex-col items-center justify-center p-6 relative">
  
    <div className="w-full max-w-xl space-y-6">

      <div className="fixed bottom-6 right-6 text-[#8fa66c] text-sm font-mono opacity-70">
        my swamp
       </div>

      {/* SWAMP PANEL */}
      <div className="swamp-panel relative w-full h-32 rounded-xl overflow-hidden">
        {!frog && (
          <>
            

            <div className="reeds">╱╲╱╲╱</div>
            <div className="lily" />
          </>
        )}

        <textarea
          placeholder="dump your tasks..."
          value={tasks}
          onChange={(e) => {
            setTasks(e.target.value)
            localStorage.setItem('tasks', e.target.value)
          }}
          disabled={!!frog}
          className="relative z-20 block w-full h-full p-4 bg-transparent text-white rounded-xl outline-none resize-none placeholder:text-zinc-600"
        />
      </div>

      {!frog && (
        <div className="text-sm text-zinc-500 text-center">
          the swamp is empty
        </div>
      )}

      <button
        onClick={pickFrog}
        disabled={!!frog || loading}
        className="w-full py-3 swamp-button font-medium transition disabled:opacity-40"
      >
        {loading ? '🐸 choosing your frog...' : 'pick my frog'}
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
          i did it
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
          <div className="text-center text-[#c6d3b2]">
            your frog surfaced:
          </div>

          <div className="p-5 rounded-2xl bg-[#111713] border border-[#4f6f3d]/50 text-[#e6eadf] text-lg font-mono">
            {extractAction(frog)}
          </div>
        </div>
      )}

    </div>
  </main>
)
}