import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { updateMapTags } from '@/lib/maps/maps-store'
import { MAP_TAGS, type MapTag } from '@/lib/maps/tags'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { tags: rawTags = [] } = await req.json()
  const tags = (rawTags as string[]).filter((t): t is MapTag => (MAP_TAGS as readonly string[]).includes(t))

  try {
    await updateMapTags(id, tags)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 })
  }
}
