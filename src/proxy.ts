import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseProxyClient } from '@/lib/supabase/proxy'
import { ROUTES } from '@/lib/constants/routes'

const PUBLIC_ROUTES = [
  ROUTES.auth.login,
  ROUTES.auth.register,
  ROUTES.auth.forgotPassword,
  ROUTES.auth.callback,
]

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createSupabaseProxyClient(request, response)

  // refresh session on every request
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  // redirect unauthenticated users
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL(ROUTES.auth.login, request.url))
  }

  // prevent logged-in users from accessing auth pages
  if (user && isPublic && pathname !== ROUTES.auth.callback) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|sounds|splash|sw.js|manifest.json|api/health).*)',
  ],
}