'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import { LilyIcon } from '@/app/lily-icon'

export function AccountMenu() {
  const { user, isLoaded } = useUser()

  return (
    <div className="relative h-10 w-10">
      <UserButton
        appearance={{
          variables: {
            colorPrimary: '#8fa66c',
            colorBackground: '#0b1710',
            colorForeground: '#c8d8b8',
            colorNeutral: '#8fa66c',
            colorPrimaryForeground: '#07100b',
            colorInput: '#09140d',
            colorInputForeground: '#c8d8b8',
            colorMuted: '#102117',
            colorMutedForeground: '#8fa080',
            colorBorder: '#29422f',
            colorRing: '#8fa66c',
            colorShimmer: 'rgba(143, 166, 108, 0.28)',
          },
          elements: {
            userButtonAvatarBox: { width: '2.5rem', height: '2.5rem' },
            userButtonPopoverCard: {
              background: '#0b1710',
              border: '1px solid #29422f',
              boxShadow: 'none',
            },
            userButtonPopoverActionButton: { color: '#c8d8b8' },
            userButtonPopoverActionButtonText: { color: '#c8d8b8' },
            userButtonPopoverFooter: { background: '#09140d' },
          },
        }}
      >
        <UserButton.MenuItems>
          <UserButton.Link
            href="/preferences"
            label="preferences"
            labelIcon={<LilyIcon className="h-3.5 w-4.5" />}
          />
        </UserButton.MenuItems>
      </UserButton>

      {isLoaded && user && !user.hasImage && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border border-[#304634] bg-[#08110c]"
        >
          <span className="absolute left-2 top-1.5 h-5 w-5 rounded-full bg-[#c8d8b8] opacity-80 shadow-[0_0_14px_rgba(200,216,184,0.22)]" />
          <span className="absolute left-3 top-1 h-5 w-5 rounded-full bg-[#08110c]" />
        </div>
      )}
    </div>
  )
}
