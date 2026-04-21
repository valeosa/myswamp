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
    setTimeout(() => {
  setFrog(data.frog)
  setShowFrog(false)

  setFrog(data.frog)
setFrogStartedAt(Date.now())
setAtRisk(false)

  setTimeout(() => setShowFrog(true), 50)
}, 300)
setShowFrog(false)

setTimeout(() => {
  setShowFrog(true)
}, 50)
  } catch (err) {
    console.error(err)
  } finally {
    setLoading(false)
  }
}

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      
      <div className="w-full max-w-xl space-y-6">
        
        <h1 className="text-2xl font-semibold text-center">
           mySwamp
        </h1>

        <textarea
          placeholder="dump your tasks..."
          value={tasks}
          onChange={(e) => {
  setTasks(e.target.value)
  localStorage.setItem('tasks', e.target.value)
}}
          disabled={!!frog}
          className="w-full h-40 p-4 bg-zinc-900 rounded-xl outline-none resize-none"
        />

{!frog && (
  <div className="text-sm text-zinc-500 text-center">
    no active frog
  </div>
)}

        <button
  onClick={pickFrog}
  disabled={!!frog || loading}
  className="w-full py-3 bg-white text-black rounded-xl font-medium hover:opacity-90 transition disabled:opacity-40"
>
  {loading ? '🐸 choosing your frog...' : 'pick my frog'}
</button>


        {frog && (
        <button
  onClick={() => {
    setStreak((s) => s + 1)

    // ✅ clear current frog state
    setFrog('')
    setFrogStartedAt(null)
    setAtRisk(false)

    // optional: auto-pick next frog
    setTimeout(() => {
      pickFrog()
    }, 300)
  }}


  
  className="w-full py-4 rounded-xl border border-green-500 text-green-400 font-semibold text-lg
           transition-all duration-200
           hover:bg-green-500 hover:text-black
           active:scale-95 active:bg-green-400"
          
>
  i did it 
</button>
        )}

{frog && (
  <div className="text-sm text-zinc-400 text-center">
  🐸: {streak}
  </div>
)}

        {frog && (
  <div
    className={`space-y-2 transition-all duration-500 ${
      showFrog ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
    }`}
  >
    <div className="text-xs text-zinc-400 text-center">
    unfinished task active, you must complete this before continuinng 
</div>

{frog && atRisk && (
  <div className="text-sm text-red-500 text-center">
    your streak is at risk
  </div>
)}

<div className={`p-5 bg-zinc-900 rounded-xl whitespace-pre-wrap border border ${atRisk ? 'border-red-500' : 'border-gray-500'} text-base leading-relaxed font-mono transition-all duration-500 ${
  showFrog ? 'scale-100 opacity-100' : 'scale-95 opacity-0' }`}>
  {frog}
</div>
  </div>
)}

      </div>

    </main>
  )

}