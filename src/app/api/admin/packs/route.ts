import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth'
import { addPack } from '@/lib/packs-store'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { name?: string; description?: string; mapIds?: string[] }
  const name = (body.name ?? '').trim()
  const description = (body.description ?? '').trim()
  const mapIds = body.mapIds ?? []

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!Array.isArray(mapIds) || mapIds.length === 0) {
    return NextResponse.json({ error: 'mapIds must be a non-empty array' }, { status: 400 })
  }
  if (!mapIds.every((id): id is string => typeof id === 'string')) {
    return NextResponse.json({ error: 'mapIds must contain only strings' }, { status: 400 })
  }

  const id = uuidv4()
  await addPack({ id, name, description, mapIds, createdAt: new Date().toISOString() })
  return NextResponse.json({ ok: true, id })
}
