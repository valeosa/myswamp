import { NextResponse } from 'next/server'

const waitlistOrigin = process.env.WAITLIST_SITE_URL ?? 'https://myswamp-landing.vercel.app'

export function GET(request: Request) {
  const sourceUrl = new URL(request.url)
  const targetUrl = new URL('/api/confirm-waitlist', waitlistOrigin)
  const token = sourceUrl.searchParams.get('token')

  if (token) targetUrl.searchParams.set('token', token)

  return NextResponse.redirect(targetUrl)
}
