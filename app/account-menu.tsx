'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import { LilyIcon } from '@/app/lily-icon'

export function AccountMenu() {
  const { user, isLoaded } = useUser()

  return (
    <div className={`account-menu-avatar relative h-10 w-10 ${isLoaded && user && !user.hasImage ? 'account-menu-avatar-blank-state' : ''}`}>
      <UserButton
        appearance={{
          variables: {
            fontFamily: 'Oranienbaum, ui-serif, Georgia, serif',
            colorPrimary: 'rgba(242, 225, 196, 0.82)',
            colorBackground: '#0b1710',
            colorForeground: 'rgba(242, 225, 196, 0.82)',
            colorNeutral: 'rgba(242, 225, 196, 0.62)',
            colorPrimaryForeground: '#07100b',
            colorInput: '#09140d',
            colorInputForeground: 'rgba(242, 225, 196, 0.82)',
            colorMuted: '#102117',
            colorMutedForeground: 'rgba(242, 225, 196, 0.5)',
            colorBorder: 'rgba(242, 225, 196, 0.34)',
            colorRing: 'rgba(242, 225, 196, 0.58)',
            colorShimmer: 'rgba(242, 225, 196, 0.24)',
            borderRadius: '0',
          },
          elements: {
            avatarBox: {
              background: 'rgba(242, 225, 196, 0.76)',
              color: 'transparent',
            },
            userButtonAvatarBox: { width: '2.5rem', height: '2.5rem' },
            userPreviewAvatarBox: {
              background: 'rgba(242, 225, 196, 0.78)',
              color: 'transparent',
              borderRadius: '0',
              boxShadow: 'none',
            },
            userButtonPopoverCard: {
              background: 'rgba(6, 13, 8, 0.96)',
              border: '1px solid rgba(242, 225, 196, 0.34)',
              borderRadius: '0',
              boxShadow: 'none',
            },
            userButtonPopoverActionButton: {
              color: 'rgba(242, 225, 196, 0.78)',
              borderRadius: '0',
            },
            userButtonPopoverActionButtonText: { color: 'rgba(242, 225, 196, 0.78)' },
            userButtonPopoverFooter: { background: 'transparent' },
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
        <div
          aria-hidden="true"
          className="account-avatar-blank pointer-events-none absolute"
        />
      )}
    </div>
  )
}
