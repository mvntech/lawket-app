import { getSupabaseServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function getAuthenticatedUser(): Promise<{
  userId: string | null
  errorResponse: NextResponse | null
}> {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      userId: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { userId: user.id, errorResponse: null }
}
