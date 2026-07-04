'use client'

import { useEffect, useRef, useState } from 'react'

const MUSIC_ENABLED_KEY = 'mySwampMusicEnabled'

export function SwampAudio() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setEnabled(localStorage.getItem(MUSIC_ENABLED_KEY) === 'true')
      setHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (!hydrated) return

    localStorage.setItem(MUSIC_ENABLED_KEY, String(enabled))

    const audio = audioRef.current
    if (!audio) return

    if (enabled) {
      audio.volume = 0.34
      audio.play().catch(() => setEnabled(false))
      return
    }

    audio.pause()
  }, [enabled, hydrated])

  return (
    <>
      <audio ref={audioRef} src="/fireflies.mp3" preload="none" loop />
      <button
        type="button"
        aria-pressed={enabled}
        aria-label={enabled ? 'quiet the swamp' : 'hear the swamp'}
        title={enabled ? 'quiet the swamp' : 'hear the swamp'}
        onClick={() => setEnabled((current) => !current)}
        data-analytics="swamp-audio-toggle"
        className={`music-toggle ${enabled ? 'music-toggle-active' : ''}`}
      >
        <span aria-hidden="true" className="music-toggle-icon" />
      </button>
    </>
  )
}
