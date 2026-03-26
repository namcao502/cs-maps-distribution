import { detectStructure } from '@/lib/extractors/detect'

describe('detectStructure', () => {
  it('detects game-root when cstrike/ is present', () => {
    const entries = ['cstrike/maps/de_dust2.bsp', 'cstrike/models/player.mdl']
    expect(detectStructure(entries)).toBe('game-root')
  })

  it('detects game-root case-insensitively (CSTRIKE/)', () => {
    const entries = ['CSTRIKE/maps/de_dust2.bsp']
    expect(detectStructure(entries)).toBe('game-root')
  })

  it('detects cs-subfolder when maps/ present without cstrike/', () => {
    const entries = ['maps/de_dust2.bsp', 'models/player.mdl']
    expect(detectStructure(entries)).toBe('cs-subfolder')
  })

  it('detects cs-subfolder for models/, sound/, sprites/', () => {
    expect(detectStructure(['models/test.mdl'])).toBe('cs-subfolder')
    expect(detectStructure(['sound/test.wav'])).toBe('cs-subfolder')
    expect(detectStructure(['sprites/test.spr'])).toBe('cs-subfolder')
  })

  it('detects bare-files when .bsp at root with no subdirectories', () => {
    const entries = ['de_dust2.bsp', 'awp_india.bsp']
    expect(detectStructure(entries)).toBe('bare-files')
  })

  it('returns unknown when structure does not match any rule', () => {
    const entries = ['readme.txt', 'somefile.dat']
    expect(detectStructure(entries)).toBe('unknown')
  })

  it('prioritises game-root over cs-subfolder (rule 1 wins)', () => {
    const entries = ['cstrike/maps/de_dust2.bsp', 'maps/extra.bsp']
    expect(detectStructure(entries)).toBe('game-root')
  })

  it('detects wrapped when single top-level folder wraps CS content', () => {
    // Single folder "mymap/" wrapping maps/ content → wrapped
    const entries = ['mymap/maps/de_dust2.bsp', 'mymap/models/player.mdl']
    expect(detectStructure(entries)).toBe('wrapped')
  })

  it('returns unknown for single top-level folder wrapping unrecognised content', () => {
    const entries = ['myfolder/readme.txt', 'myfolder/data.bin']
    expect(detectStructure(entries)).toBe('unknown')
  })
})
