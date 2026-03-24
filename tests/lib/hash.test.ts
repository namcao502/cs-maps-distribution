import { computeSHA256 } from '@/lib/storage/hash'

describe('computeSHA256', () => {
  it('returns correct SHA-256 for known input', async () => {
    const emptyBuffer = new ArrayBuffer(0)
    const result = await computeSHA256(emptyBuffer)
    expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb924' +
                        '27ae41e4649b934ca495991b7852b855')
  })

  it('returns different hashes for different inputs', async () => {
    const a = new TextEncoder().encode('hello').buffer as ArrayBuffer
    const b = new TextEncoder().encode('world').buffer as ArrayBuffer
    const hashA = await computeSHA256(a)
    const hashB = await computeSHA256(b)
    expect(hashA).not.toBe(hashB)
  })
})
