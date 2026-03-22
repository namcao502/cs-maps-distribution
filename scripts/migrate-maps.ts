import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  // Download maps.json from Supabase Storage
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME ?? 'cs-maps')
    .download('maps.json')

  if (error || !data) {
    console.error('Could not download maps.json:', error)
    process.exit(1)
  }

  const text = await data.text()
  const maps = JSON.parse(text)
  console.log(`Found ${maps.length} maps in maps.json`)

  for (const map of maps) {
    const { error: insertError } = await supabase.from('maps').insert({
      id: map.id,
      original_name: map.originalName,
      storage_key: map.r2Key,   // old field name from maps.json
      format: map.format,
      size: map.size,
      sha256: map.sha256,
      uploaded_at: map.uploadedAt,
      uploader_id: null,
      uploader_name: null,
      uploader_avatar: null,
    })
    if (insertError) {
      console.error(`Failed to insert ${map.originalName}:`, insertError.message)
    } else {
      console.log(`✓ ${map.originalName}`)
    }
  }

  console.log('Migration complete. Verify the maps table, then delete maps.json from storage.')
}

main().catch(console.error)
