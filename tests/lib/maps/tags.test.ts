import { FILTER_TABS, tabToTag } from '@/lib/maps/tags'

test('FILTER_TABS has three entries', () => {
  expect(FILTER_TABS).toHaveLength(3)
})

test('tabToTag maps correctly', () => {
  expect(tabToTag('all')).toBeNull()
  expect(tabToTag('de_')).toBe('de_')
  expect(tabToTag('cs_')).toBe('cs_')
})
