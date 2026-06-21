'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import Image from 'next/image'
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
            label="Preferences"
            labelIcon={<LilyIcon className="h-3.5 w-4.5" />}
          />
        </UserButton.MenuItems>
      </UserButton>

      {isLoaded && user && !user.hasImage && (
        <Image
          src="/swamp-avatar.jpeg"
          alt=""
          fill
          sizes="40px"
          className="pointer-events-none rounded-full border border-[#304634] object-cover object-center"
        />
      )}
    </div>
  )
}
