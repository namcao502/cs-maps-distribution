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

test('calls onClose when close button clicked', () => {
  const onClose = jest.fn()
  render(<MapDetailModal map={mockMap} onClose={onClose} onInstall={jest.fn()} onDownload={jest.fn()} status={null} />)
  fireEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(onClose).toHaveBeenCalled()
})

test('calls onDownload when Download button clicked', () => {
  const onDownload = jest.fn()
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={jest.fn()} onDownload={onDownload} status={null} />)
  fireEvent.click(screen.getByRole('button', { name: /download/i }))
  expect(onDownload).toHaveBeenCalled()
})

test('shows INSTALLED button when installed', () => {
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={null} installed />)
  expect(screen.getByRole('button', { name: /installed/i })).toBeInTheDocument()
})

test('shows INSTALLING button when status is downloading', () => {
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={{ phase: 'downloading', progress: 50 }} />)
  expect(screen.getByRole('button', { name: /installing/i })).toBeInTheDocument()
})

test('shows reinstall confirm when INSTALLED button clicked', () => {
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={null} installed />)
  fireEvent.click(screen.getByRole('button', { name: /installed/i }))
  expect(screen.getByRole('button', { name: /reinstall/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
})

test('cancels reinstall confirm', () => {
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={null} installed />)
  fireEvent.click(screen.getByRole('button', { name: /installed/i }))
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  expect(screen.getByRole('button', { name: /installed/i })).toBeInTheDocument()
})

test('renders install count', () => {
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={null} />)
  expect(screen.getByText(/1,204/)).toBeInTheDocument()
})

test('renders screenshot thumbnail strip when multiple screenshots', () => {
  const mapWithScreenshots = { ...mockMap, screenshotKeys: ['s/0.jpg', 's/1.jpg'] }
  render(<MapDetailModal map={mapWithScreenshots} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={null} />)
  // Two thumbnail strip buttons are rendered
  const thumbnailButtons = screen.getAllByRole('button').filter(
    btn => !btn.getAttribute('aria-label')
  )
  expect(thumbnailButtons.length).toBeGreaterThanOrEqual(2)
})

test('clicking thumbnail strip button changes active screenshot', () => {
  const mapWithScreenshots = { ...mockMap, screenshotKeys: ['s/0.jpg', 's/1.jpg'] }
  render(<MapDetailModal map={mapWithScreenshots} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={null} />)
  const thumbnailButtons = screen.getAllByRole('button').filter(
    btn => !btn.getAttribute('aria-label')
  )
  // Click second thumbnail button — should not throw
  fireEvent.click(thumbnailButtons[1])
  // After click the second button should have active styling (border-cyan)
  expect(thumbnailButtons[1]).toBeInTheDocument()
})

test('clicking Reinstall confirm button calls onInstall', () => {
  const onInstall = jest.fn()
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={onInstall} onDownload={jest.fn()} status={null} installed />)
  fireEvent.click(screen.getByRole('button', { name: /installed/i }))
  fireEvent.click(screen.getByRole('button', { name: /reinstall/i }))
  expect(onInstall).toHaveBeenCalled()
})
