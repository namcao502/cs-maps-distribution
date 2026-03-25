/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'

jest.mock('@/lib/auth/firebase-client', () => ({ getFirebaseAuth: jest.fn() }))
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
}))
jest.mock('@/components/layout/NotificationBell', () => ({ NotificationBell: () => null }))
jest.mock('@/components/submissions/AuthButton', () => ({ AuthButton: () => null }))

const defaultProps = {
  installedCount: 3,
  totalCount: 10,
  query: '',
  onQueryChange: jest.fn(),
  activeTab: 'all' as const,
  onTabChange: jest.fn(),
}

test('renders logo', () => {
  render(<SiteHeader {...defaultProps} />)
  expect(screen.getByText('CS MAPS')).toBeInTheDocument()
})

test('renders installed counter', () => {
  render(<SiteHeader {...defaultProps} />)
  expect(screen.getByText('3')).toBeInTheDocument()
  expect(screen.getByText('installed')).toBeInTheDocument()
})

test('calls onTabChange when DEFUSE tab clicked', () => {
  const onTabChange = jest.fn()
  render(<SiteHeader {...defaultProps} onTabChange={onTabChange} />)
  fireEvent.click(screen.getByText('DEFUSE'))
  expect(onTabChange).toHaveBeenCalledWith('de_')
})

test('calls onQueryChange when search input changes', () => {
  const onQueryChange = jest.fn()
  render(<SiteHeader {...defaultProps} onQueryChange={onQueryChange} />)
  fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'dust' } })
  expect(onQueryChange).toHaveBeenCalledWith('dust')
})
