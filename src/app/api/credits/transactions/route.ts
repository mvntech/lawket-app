export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { getTransactions } from '@/lib/credits/credits'

export async function GET(req: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)

  const transactions = await getTransactions(userId, limit)

  return NextResponse.json({ transactions })
}
