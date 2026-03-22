import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    await getAdminAuth().verifySessionCookie(sessionCookie, true)
    return NextResponse.next({ request })
  } catch {
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: ['/admin/:path*', '/submissions/:path*'],
}
