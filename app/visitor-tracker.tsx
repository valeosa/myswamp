'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/founder')) return

    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'visit', path: pathname }),
      keepalive: true,
    }).catch(() => undefined)
  }, [pathname])

  return null
}
