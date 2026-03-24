import { NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { getAdminStats } from '@/lib/admin/stats-store'

export async function GET() {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const stats = await getAdminStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error('Failed to fetch admin stats:', err)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
