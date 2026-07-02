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

  useEffect(() => {
    if (!pathname || pathname.startsWith('/founder')) return

    function trackClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return

      const control = target.closest<HTMLElement>('[data-analytics]')
      const analyticsName = control?.dataset.analytics
      if (!analyticsName) return

      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: 'button_clicked', path: `${pathname}#${analyticsName}` }),
        keepalive: true,
      }).catch(() => undefined)
    }

    document.addEventListener('click', trackClick)
    return () => document.removeEventListener('click', trackClick)
  }, [pathname])

  return null
}
