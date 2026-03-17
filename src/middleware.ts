import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware'
import { ROUTES } from '@/lib/constants/routes'

const PUBLIC_ROUTES = [
  ROUTES.home,
  ROUTES.auth.login,
  ROUTES.auth.register,
  ROUTES.auth.forgotPassword,
]

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createSupabaseMiddlewareClient(request, response)

  // refresh the session (this keeps cookies up-to-date on every request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = PUBLIC_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  )

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL(ROUTES.auth.login, request.url))
  }

  if (user && isPublic) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json).*)',
  ],
}
