import { auth, clerkClient } from '@clerk/nextjs/server'
import { deleteAccountData } from '@/lib/delete-account-data'

export async function DELETE() {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 })

    await deleteAccountData(userId)
    const clerk = await clerkClient()
    await clerk.users.deleteUser(userId)

    return Response.json({ deleted: true })
  } catch (error) {
    console.error('account deletion failed', error)
    return Response.json(
      { error: 'The swamp could not finish deleting your account. Please try again.' },
      { status: 503 },
    )
  }
}
