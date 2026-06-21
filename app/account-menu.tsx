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
          variables: { colorPrimary: '#8fa66c' },
          elements: {
            userButtonAvatarBox: { width: '2.5rem', height: '2.5rem' },
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
