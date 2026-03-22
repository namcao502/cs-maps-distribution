import { extractZip } from '@/lib/extractors/zip'
import { strToU8, zipSync } from 'fflate'

describe('extractZip', () => {
  it('extracts files from a zip buffer', async () => {
    const zipped = zipSync({
      'maps/de_dust2.bsp': strToU8('fake bsp content'),
      'models/test.mdl': strToU8('fake mdl content'),
    })

    const files = await extractZip(zipped.buffer as ArrayBuffer)

    expect(files).toHaveLength(2)
    const paths = files.map(f => f.path)
    expect(paths).toContain('maps/de_dust2.bsp')
    expect(paths).toContain('models/test.mdl')

    const bsp = files.find(f => f.path === 'maps/de_dust2.bsp')!
    expect(new TextDecoder().decode(bsp.data)).toBe('fake bsp content')
  })
})
