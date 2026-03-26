jest.mock('@/lib/extractors/zip', () => ({
  extractZip: jest.fn().mockResolvedValue([{ name: 'maps/test.bsp', data: new Uint8Array() }]),
}))
jest.mock('@/lib/extractors/sevenz', () => ({
  extractSevenZ: jest.fn().mockResolvedValue([{ name: 'maps/test.bsp', data: new Uint8Array() }]),
}))
jest.mock('@/lib/extractors/rar', () => ({
  extractRar: jest.fn().mockResolvedValue([{ name: 'maps/test.bsp', data: new Uint8Array() }]),
}))

import { extractArchive } from '@/lib/extractors/index'

describe('extractArchive', () => {
  const buf = new ArrayBuffer(8)

  it('delegates zip to extractZip', async () => {
    const { extractZip } = await import('@/lib/extractors/zip')
    const result = await extractArchive(buf, 'zip')
    expect(extractZip).toHaveBeenCalledWith(buf)
    expect(result).toHaveLength(1)
  })

  it('delegates 7z to extractSevenZ', async () => {
    const { extractSevenZ } = await import('@/lib/extractors/sevenz')
    const result = await extractArchive(buf, '7z')
    expect(extractSevenZ).toHaveBeenCalledWith(buf)
    expect(result).toHaveLength(1)
  })

  it('delegates rar to extractRar', async () => {
    const { extractRar } = await import('@/lib/extractors/rar')
    const result = await extractArchive(buf, 'rar')
    expect(extractRar).toHaveBeenCalledWith(buf)
    expect(result).toHaveLength(1)
  })

  it('throws on unsupported format', async () => {
    await expect(extractArchive(buf, 'tar' as never)).rejects.toThrow('Unsupported format')
  })
})
