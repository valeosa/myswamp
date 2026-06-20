'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'

type Preferences = {
  email_updates: boolean
  deep_swamp_notifications: boolean
  deep_swamp_analysis: boolean
  feedback_contact: boolean
}

const emptyPreferences: Preferences = {
  email_updates: false,
  deep_swamp_notifications: false,
  deep_swamp_analysis: false,
  feedback_contact: false,
}

export default function PreferencesPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const [preferences, setPreferences] = useState(emptyPreferences)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    async function loadPreferences() {
      try {
        const response = await fetch('/api/profile')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'The swamp could not find your preferences.')
        setPreferences({
          email_updates: data.profile.email_updates,
          deep_swamp_notifications: data.profile.deep_swamp_notifications,
          deep_swamp_analysis: data.profile.deep_swamp_analysis,
          feedback_contact: data.profile.feedback_contact,
        })
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The swamp could not find your preferences.')
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [isLoaded, isSignedIn])

  function toggle(key: keyof Preferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
    setMessage('')
  }

  async function savePreferences() {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The swamp could not save that.')
      setMessage('the swamp remembers your preferences.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The swamp could not save that.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-surface min-h-screen bg-[#07100b] p-6 pb-16 pt-24 text-[#c8d8b8]">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#c8d8b8]">preferences</h1>
          <p className="mt-1 text-sm text-[#718067]">you choose what travels beyond the swamp.</p>
        </div>

        <Link href="/" className="inline-block text-sm text-[#8fa66c] opacity-70 transition-opacity hover:opacity-100">
          ← back to swamp
        </Link>

        {!isSignedIn && isLoaded && <p className="text-[#8fa66c]">sign in to change your preferences.</p>}
        {loading && isSignedIn && <p className="text-[#8fa66c]">listening...</p>}

        {!loading && isSignedIn && (
          <div className="space-y-3">
            <PreferenceToggle
              checked={preferences.email_updates}
              onChange={() => toggle('email_updates')}
              title="future updates"
              description="occasional news about mySwamp"
            />
            <PreferenceToggle
              checked={preferences.deep_swamp_notifications}
              onChange={() => toggle('deep_swamp_notifications')}
              title="Deep Swamp (Coming Soon)"
              description="one message when Deep Swamp is ready"
            />
            <PreferenceToggle
              checked={preferences.deep_swamp_analysis}
              onChange={() => toggle('deep_swamp_analysis')}
              title="Deep Swamp analysis (Beta)"
              description="use my frog and tadpole inputs to find personal productivity patterns"
            />
            <PreferenceToggle
              checked={preferences.feedback_contact}
              onChange={() => toggle('feedback_contact')}
              title="feedback"
              description="report how the swamp is feeling"
            />

            {error && <p role="alert" className="text-sm text-[#e2c2a8]">{error}</p>}
            {message && <p role="status" className="water-whisper text-sm text-[#9fb77b]">{message}</p>}

            <button
              type="button"
              onClick={savePreferences}
              disabled={saving}
              className="w-full rounded-xl bg-[#8fa66c] px-4 py-3 text-sm font-medium text-[#0a1710] transition-all hover:bg-[#b2c791] active:scale-[0.99] disabled:opacity-40"
            >
              {saving ? 'remembering...' : 'save preferences'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

function PreferenceToggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean
  onChange: () => void
  title: string
  description: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-lime-900/40 bg-[#0b1710] p-4 transition-colors hover:border-[#38522e]">
      <span>
        <span className="block text-[#c8d8b8]">{title}</span>
        <span className="mt-1 block text-xs text-[#718067]">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 accent-[#8fa66c]"
      />
    </label>
  )
}
