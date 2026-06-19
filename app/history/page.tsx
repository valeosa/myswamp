'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Frog = {
  id: string
  task_dump: string
  frog: string
  created_at: string
}

export default function HistoryPage() {
  const { userId } = useAuth()
  const [frogs, setFrogs] = useState<Frog[]>([])

  useEffect(() => {
    if (!userId) return

    async function loadHistory() {
      const { data, error } = await supabase
        .from('frogs')
        .select('id, task_dump, frog, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('history error:', error)
        return
      }

      setFrogs(data || [])
    }

    loadHistory()
  }, [userId])

  return (
    <main className="min-h-screen bg-[#07100b] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-[#b7c89b]">history</h1>

<Link
  href="/"
  className="text-[#8fa66c] text-sm opacity-70 hover:opacity-100"
>
  ← back to swamp
</Link>

        {frogs.length === 0 && (
          <p className="text-[#8fa66c]">no frogs remembered yet.</p>
        )}

        {frogs.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-lime-900/40 bg-[#0b1710] p-5 space-y-3"
          >
            <p className="text-xs text-[#8fa66c]">
              {new Date(item.created_at).toLocaleString()}
            </p>

            <div>
              <p className="text-[#8fa66c] text-sm">dump</p>
              <p className="whitespace-pre-wrap">{item.task_dump}</p>
            </div>

            <div>
              <p className="text-[#8fa66c] text-sm">frog</p>
              <p>{item.frog}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}