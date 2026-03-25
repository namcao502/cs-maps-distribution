/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MapCard } from '@/components/maps/MapCard'
import type { MapEntry } from '@/types/map'

jest.mock('@/lib/maps/install', () => ({
  isFileSystemAccessSupported: jest.fn().mockReturnValue(false),
  installMap: jest.fn(),
  isBspInstalled: jest.fn().mockReturnValue(false),
}))

jest.mock('@/lib/maps/folder-store', () => ({
  ensurePermission: jest.fn(),
  markInstalled: jest.fn(),
  isInstalledLocally: jest.fn().mockReturnValue(false),
}))

const mockMap: MapEntry = {
  id: '1', originalName: 'de_dust2', storageKey: 'archives/1.zip',
  format: 'zip', size: 2 * 1024 * 1024, sha256: 'abc',
  uploadedAt: '2025-01-01T00:00:00Z', installCount: 1204, tags: ['de_'],
}

const defaultProps = {
  map: mockMap,
  gameFolder: null,
  onPickFolder: jest.fn(),
  installedBsps: new Set<string>(),
  onInstalled: jest.fn(),
  onOpenDetail: jest.fn(),
}

test('renders map name', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.getByText('de_dust2')).toBeInTheDocument()
})

test('renders DE badge for de_ tag', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.getByText('DE')).toBeInTheDocument()
})

test('renders install count', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.getByText(/1,204/)).toBeInTheDocument()
})

test('INSTALL button present when not installed', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument()
})

test('clicking thumbnail calls onOpenDetail', () => {
  const onOpenDetail = jest.fn()
  render(<MapCard {...defaultProps} onOpenDetail={onOpenDetail} />)
  fireEvent.click(screen.getByTestId('card-thumbnail'))
  expect(onOpenDetail).toHaveBeenCalledWith(mockMap)
})

test('clicking map name calls onOpenDetail', () => {
  const onOpenDetail = jest.fn()
  render(<MapCard {...defaultProps} onOpenDetail={onOpenDetail} />)
  fireEvent.click(screen.getByText('de_dust2'))
  expect(onOpenDetail).toHaveBeenCalledWith(mockMap)
})
