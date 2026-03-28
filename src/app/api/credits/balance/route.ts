export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { getCreditsData, getTransactions } from '@/lib/credits/credits'

export async function GET() {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!

  const [creditsData, transactions] = await Promise.all([
    getCreditsData(userId),
    getTransactions(userId, 5),
  ])

  return NextResponse.json({
    ...creditsData,
    recentTransactions: transactions,
  })
}
