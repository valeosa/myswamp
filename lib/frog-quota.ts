import 'server-only'

import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type FrogQuotaScope = 'guest' | 'signed_in'

export type FrogQuotaResult = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfter: number
}

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function frogDailyLimit(scope: FrogQuotaScope) {
  if (scope === 'guest') return readPositiveInt(process.env.ANONYMOUS_FROG_DAILY_LIMIT, 3)
  return readPositiveInt(process.env.SIGNED_IN_FROG_DAILY_LIMIT, 50)
}

export function frogBurstLimit(scope: FrogQuotaScope) {
  if (scope === 'guest') return readPositiveInt(process.env.ANONYMOUS_FROG_BURST_LIMIT, 3)
  return readPositiveInt(process.env.SIGNED_IN_FROG_BURST_LIMIT, 5)
}

export function frogQuotaKey(input: { userId?: string | null; ip?: string | null; userAgent?: string | null }) {
  const salt = process.env.FROG_QUOTA_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'myswamp-local-quota'
  const identity = input.userId
    ? `user:${input.userId}`
    : `guest:${input.ip || 'unknown'}:${input.userAgent || 'unknown'}`

  return createHash('sha256').update(`${salt}:${identity}`).digest('hex')
}

export async function consumeFrogDailyQuota(input: {
  scope: FrogQuotaScope
  keyHash: string
  accountId?: string | null
}) {
  const limit = frogDailyLimit(input.scope)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('consume_frog_generation_quota', {
    p_scope: input.scope,
    p_key_hash: input.keyHash,
    p_account_id: input.accountId ?? null,
    p_limit: limit,
  })

  if (error) throw error

  const quota = data as Partial<{
    allowed: boolean
    limit: number
    remaining: number
    retry_after_seconds: number
  }> | null

  return {
    allowed: quota?.allowed === true,
    limit: quota?.limit ?? limit,
    remaining: Math.max(0, quota?.remaining ?? 0),
    retryAfter: Math.max(1, quota?.retry_after_seconds ?? 24 * 60 * 60),
  } satisfies FrogQuotaResult
}
