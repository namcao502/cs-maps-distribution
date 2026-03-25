/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MapDetailModal } from '@/components/maps/MapDetailModal'
import type { MapEntry } from '@/types/map'

jest.mock('@/lib/maps/install', () => ({
  isFileSystemAccessSupported: () => true,
  installMap: jest.fn(),
  isBspInstalled: jest.fn(),
}))

const mockMap: MapEntry = {
  id: '1', originalName: 'de_dust2', storageKey: 'archives/1.zip',
  format: 'zip', size: 2 * 1024 * 1024, sha256: 'abc',
  uploadedAt: '2025-01-01T00:00:00Z', installCount: 1204,
  tags: ['de_'], screenshotKeys: ['screenshots/1/0.jpg'],
}

test('renders map name', () => {
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={null} />)
  expect(screen.getByText('de_dust2')).toBeInTheDocument()
})

test('renders format badge', () => {
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={null} />)
  expect(screen.getByText('ZIP')).toBeInTheDocument()
})

test('calls onClose when backdrop clicked', () => {
  const onClose = jest.fn()
  render(<MapDetailModal map={mockMap} onClose={onClose} onInstall={jest.fn()} onDownload={jest.fn()} status={null} />)
  fireEvent.click(screen.getByTestId('modal-backdrop'))
  expect(onClose).toHaveBeenCalled()
})

test('calls onInstall when INSTALL button clicked', () => {
  const onInstall = jest.fn()
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={onInstall} onDownload={jest.fn()} status={null} />)
  fireEvent.click(screen.getByRole('button', { name: /install/i }))
  expect(onInstall).toHaveBeenCalled()
})
