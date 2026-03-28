export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    // lightweight DB ping (select 1 row from profiles with limit 1)
    const { error } = await supabase.from('profiles').select('id').limit(1)

    if (error) {
      return NextResponse.json(
        { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() },
        { status: 503 },
      )
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}
