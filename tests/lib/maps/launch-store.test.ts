/**
 * @jest-environment jsdom
 */
import { isLaunchSetup, markLaunchSetup } from '@/lib/maps/launch-store'

beforeEach(() => {
  localStorage.clear()
})

test('isLaunchSetup returns false before markLaunchSetup', () => {
  expect(isLaunchSetup()).toBe(false)
})

test('markLaunchSetup + isLaunchSetup round-trip', () => {
  markLaunchSetup()
  expect(isLaunchSetup()).toBe(true)
})

test('isLaunchSetup returns false when a different key is set', () => {
  localStorage.setItem('other-key', '1')
  expect(isLaunchSetup()).toBe(false)
})

test('markLaunchSetup called twice leaves isLaunchSetup true', () => {
  markLaunchSetup()
  markLaunchSetup()
  expect(isLaunchSetup()).toBe(true)
})
