import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants/routes'
import { logger } from '@/lib/analytics'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type')

    if (code) {
        const supabase = await getSupabaseServer()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            logger.error({ err: error }, 'OAuth code exchange failed')
            return NextResponse.redirect(new URL(ROUTES.auth.login, origin))
        }

        if (type === 'recovery') {
            return NextResponse.redirect(new URL(ROUTES.settings.security, origin))
        }

        return NextResponse.redirect(new URL(ROUTES.dashboard, origin))
    }

    return NextResponse.redirect(new URL(ROUTES.auth.login, origin))
}
