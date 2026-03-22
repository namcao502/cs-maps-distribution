/**
 * One-time migration: copies 4 map rows from Supabase into Firestore.
 * Run: npx ts-node -e "require('dotenv').config({path:'.env.local'})" scripts/migrate-maps.ts
 * Or:  node -r dotenv/config --require ts-node/register scripts/migrate-maps.ts
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length) return getApp()
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  })
}

const rows = [
  {
    id: '1addfe4c-4606-41d1-a6ce-85e2f333ebf6',
    originalName: 'de_fort',
    storageKey: 'archives/1addfe4c-4606-41d1-a6ce-85e2f333ebf6.7z',
    format: '7z',
    size: 3779129,
    sha256: 'd3ec570fb4c4515df0cfbee9dd9cf2c5551c4e81a7315374288c22ed70c1b542',
    uploadedAt: '2026-03-22T08:31:36.344Z',
    uploaderId: null,
    uploaderName: null,
    uploaderAvatar: null,
  },
  {
    id: '58567117-8542-4950-8668-ee1c92e8474e',
    originalName: 'de_fort',
    storageKey: 'archives/58567117-8542-4950-8668-ee1c92e8474e.zip',
    format: 'zip',
    size: 4353511,
    sha256: '64d3a7390c23c735f1bc6450aed5c3a96b5e269f73eec776e8e913605397429b',
    uploadedAt: '2026-03-22T08:32:57.319Z',
    uploaderId: null,
    uploaderName: null,
    uploaderAvatar: null,
  },
  {
    id: '8199dad1-5846-4870-8379-d1b486b5f3fe',
    originalName: 'de_sunny_suncsm_0807d',
    storageKey: 'archives/8199dad1-5846-4870-8379-d1b486b5f3fe.zip',
    format: 'zip',
    size: 7011232,
    sha256: 'f529551d9f08dbce2099e9ab2c0e9206898a5515331222db1fe140e2e72f9c15',
    uploadedAt: '2026-03-22T08:43:25.169Z',
    uploaderId: null,
    uploaderName: null,
    uploaderAvatar: null,
  },
  {
    id: 'e88beb9b-e4dd-4f61-b078-9bc4114c831c',
    originalName: 'de_fort',
    storageKey: 'archives/e88beb9b-e4dd-4f61-b078-9bc4114c831c.rar',
    format: 'rar',
    size: 4162486,
    sha256: 'a6613c9cdd7e495e8915bdcf3542536567cdb52c2b2071252fad73b71f5696cf',
    uploadedAt: '2026-03-22T08:04:46.042Z',
    uploaderId: null,
    uploaderName: null,
    uploaderAvatar: null,
  },
]

async function main() {
  const db = getFirestore(getAdminApp())
  for (const row of rows) {
    const { id, ...data } = row
    await db.collection('maps').doc(id).set(data)
    console.log(`✓ ${row.originalName} (${row.format}) — ${id}`)
  }
  console.log('Migration complete.')
}

main().catch(err => { console.error(err); process.exit(1) })
