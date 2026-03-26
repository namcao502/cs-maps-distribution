/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'

jest.mock('@/lib/auth/firebase-client', () => ({ getFirebaseAuth: jest.fn() }))
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
}))
jest.mock('@/components/layout/NotificationBell', () => ({ NotificationBell: () => null }))
jest.mock('@/components/submissions/AuthButton', () => ({ AuthButton: () => null }))

test('renders logo', () => {
  render(<SiteHeader />)
  expect(screen.getByText('CS MAPS')).toBeInTheDocument()
})

test('renders submit map link', () => {
  render(<SiteHeader />)
  const link = screen.getByRole('link', { name: /submit map/i })
  expect(link).toBeInTheDocument()
  expect(link).toHaveAttribute('href', '/submissions')
})
