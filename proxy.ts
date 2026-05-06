import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSafeRedirectPath, isProtectedPath, normalizeProtectedPath } from '@/lib/auth-routes'
import { TOKEN_KEY } from '@/lib/auth-storage'
import { isTokenExpired } from '@/lib/auth-token'

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(TOKEN_KEY)?.value
  const normalizedPath = normalizeProtectedPath(pathname)

  if (!token || isTokenExpired(token)) {
    const signInUrl = new URL('/', request.url)
    signInUrl.searchParams.set(
      'redirectTo',
      getSafeRedirectPath(`${normalizedPath}${search}`),
    )

    const response = NextResponse.redirect(signInUrl)
    response.cookies.delete(TOKEN_KEY)
    return response
  }

  if (normalizedPath !== pathname) {
    const destinationUrl = new URL(`${normalizedPath}${search}`, request.url)
    return NextResponse.redirect(destinationUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/calendar/:path*',
    '/dashboard/:path*',
    '/reports/:path*',
    '/documents/:path*',
    '/report/:path*',
    '/document/:path*',
    '/api/v1/calendar/:path*',
    '/api/v1/dashboard/:path*',
    '/api/v1/report/:path*',
    '/api/v1/reports/:path*',
    '/api/v1/document/:path*',
    '/api/v1/documents/:path*',
  ],
}
