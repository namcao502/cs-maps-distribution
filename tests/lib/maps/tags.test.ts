import { FILTER_TABS, TAG_LABELS, TAG_SHORT, tabToTag } from '@/lib/maps/tags'

test('FILTER_TABS has correct structure', () => {
  expect(FILTER_TABS).toEqual([
    { value: 'all', label: 'ALL' },
    { value: 'de_', label: 'BOMB/DEFUSE' },
    { value: 'cs_', label: 'HOSTAGE RESCUE' },
  ])
})

test('tabToTag maps correctly', () => {
  expect(tabToTag('all')).toBeNull()
  expect(tabToTag('de_')).toBe('de_')
  expect(tabToTag('cs_')).toBe('cs_')
})

test('TAG_LABELS has entry for each MapTag', () => {
  expect(TAG_LABELS['de_']).toBeDefined()
  expect(TAG_LABELS['cs_']).toBeDefined()
})

test('TAG_SHORT has entry for each MapTag', () => {
  expect(TAG_SHORT['de_']).toBe('DE')
  expect(TAG_SHORT['cs_']).toBe('CS')
})
