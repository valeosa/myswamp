import { verifyWebhook } from '@clerk/nextjs/webhooks'
import type { NextRequest } from 'next/server'
import { deleteAccountData } from '@/lib/delete-account-data'

export async function POST(request: NextRequest) {
  try {
    const event = await verifyWebhook(request)
    if (event.type === 'user.deleted' && event.data.id) {
      await deleteAccountData(event.data.id)
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('Clerk webhook failed', error)
    return Response.json({ error: 'Invalid webhook' }, { status: 400 })
  }
}
