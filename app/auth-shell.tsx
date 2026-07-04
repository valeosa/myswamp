'use client'

import { Show, SignInButton, SignUpButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AccountMenu } from './account-menu'
import { SwampAudio } from './swamp-audio'

export function AuthShell() {
  const pathname = usePathname()
  const showMemoryLinks = pathname === '/'

  return (
    <header className="auth-shell">
      <SwampAudio />
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button data-analytics="auth-sign-in" className="auth-link">
            sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button data-analytics="auth-sign-up" className="auth-link auth-link-primary">
            sign up
          </button>
        </SignUpButton>
      </Show>

      <Show when="signed-in">
        {showMemoryLinks && (
          <>
            <Link href="/current" className="auth-current-link">
              currently
            </Link>
            <Link href="/history" className="auth-current-link">
              water&apos;s memory
            </Link>
          </>
        )}
        <AccountMenu />
      </Show>
    </header>
  )
}
