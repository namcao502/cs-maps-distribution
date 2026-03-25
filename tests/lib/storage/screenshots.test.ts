import { screenshotKey } from '@/lib/storage/screenshots'

test('screenshotKey generates correct path', () => {
  expect(screenshotKey('map-123', 0, 'jpg')).toBe('screenshots/map-123/0.jpg')
  expect(screenshotKey('map-123', 2, 'webp')).toBe('screenshots/map-123/2.webp')
})

test('screenshotKey rejects index > 2', () => {
  expect(() => screenshotKey('map-123', 3, 'jpg')).toThrow()
})
