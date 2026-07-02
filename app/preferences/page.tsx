'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { LilyIcon } from '@/app/lily-icon'

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
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  async function deleteAccount() {
    setDeleting(true)
    setError('')

    try {
      const response = await fetch('/api/account', { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The swamp could not finish deleting your account.')
      localStorage.clear()
      window.location.assign('/')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The swamp could not finish deleting your account.')
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <main className="page-surface min-h-screen bg-[#07100b] p-6 pb-16 pt-24 text-[#c8d8b8]">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#c8d8b8]">preferences</h1>
          <p className="mt-1 text-sm text-[#718067]">you choose what travels beyond the swamp.</p>
        </div>

        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#8fa66c] opacity-70 transition-opacity hover:opacity-100">
          <LilyIcon /> back to swamp
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
              title="deep swamp note"
              description="one message when Deep Swamp observations are ready"
            />
            <PreferenceToggle
              checked={preferences.deep_swamp_analysis}
              onChange={() => toggle('deep_swamp_analysis')}
              title="deep swamp data"
              description="save extra frog and tadpole context for future observations"
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

            <div className="pt-8">
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="text-sm text-[#9b7668] opacity-75 transition-opacity hover:opacity-100"
              >
                delete account and all data
              </button>
            </div>
          </div>
        )}

        <nav aria-label="Legal" className="flex gap-4 pt-6 text-xs text-[#718067]">
          <Link href="/privacy" className="transition-colors hover:text-[#a7b69a]">privacy policy</Link>
          <Link href="/terms" className="transition-colors hover:text-[#a7b69a]">terms of service</Link>
        </nav>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-6" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-sm rounded-2xl border border-[#5c4035] bg-[#0b1710] p-6">
            <h2 id="delete-account-title" className="text-lg text-[#d8c8b8]">drain your swamp?</h2>
            <p className="mt-3 text-sm leading-6 text-[#9eaa94]">This permanently deletes your account, frogs, tadpoles, water marks, preferences, and Deep Swamp data. It cannot be undone.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="rounded-xl border border-[#34452f] px-4 py-3 text-sm text-[#9eaa94] disabled:opacity-40"
              >
                keep my swamp
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                className="rounded-xl bg-[#8f6657] px-4 py-3 text-sm text-[#0a1710] disabled:opacity-40"
              >
                {deleting ? 'draining...' : 'delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}
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
