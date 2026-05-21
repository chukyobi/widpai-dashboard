import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from './lib/auth'

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password']

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const session = await getSessionFromRequest(request)

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isPublic && session) {
    return NextResponse.redirect(new URL('/rates', request.url))
  }
  return NextResponse.next()
}

export const config = {
  // Only run middleware on actual page routes — not static files, images, fonts, or API routes
  matcher: [
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
  ],
}
