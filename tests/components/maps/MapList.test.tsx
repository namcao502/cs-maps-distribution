/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MapList } from '@/components/maps/MapList'
import type { MapEntry } from '@/types/map'

jest.mock('@/lib/maps/install', () => ({
  scanInstalledBsps: jest.fn().mockResolvedValue(new Set()),
  syncInstalledToLocalStorage: jest.fn(),
  isFileSystemAccessSupported: jest.fn().mockReturnValue(false),
  isBspInstalled: jest.fn().mockReturnValue(false),
}))

jest.mock('@/components/maps/MapCard', () => ({
  MapCard: ({ map }: { map: MapEntry }) => <div data-testid="map-card">{map.originalName}</div>,
}))

const mockMap = (id: string, name: string, tags: string[]): MapEntry => ({
  id,
  originalName: name,
  storageKey: `archives/${id}.zip`,
  format: 'zip',
  size: 1024 * 1024,
  sha256: 'abc',
  uploadedAt: '2025-01-01T00:00:00Z',
  installCount: 5,
  tags,
})

const defaultProps = {
  maps: [mockMap('1', 'de_dust2', ['de_']), mockMap('2', 'cs_office', ['cs_'])],
  gameFolder: null,
  onPickFolder: jest.fn(),
  query: '',
  activeTab: 'all' as const,
  onInstalledCountChange: jest.fn(),
}

test('renders map count in stats bar', () => {
  render(<MapList {...defaultProps} />)
  // The stats bar span contains "2 maps" split across child spans
  // Use getAllByText and find the one with combined textContent matching "2 maps"
  const allMapsSpans = screen.getAllByText(/maps/i)
  const statsSpan = allMapsSpans.find(el => /2\s*maps/i.test(el.textContent ?? ''))
  expect(statsSpan).toBeInTheDocument()
})

test('filters by activeTab de_', () => {
  render(<MapList {...defaultProps} activeTab="de_" />)
  expect(screen.getByText('de_dust2')).toBeInTheDocument()
  expect(screen.queryByText('cs_office')).not.toBeInTheDocument()
})

test('filters by query', () => {
  render(<MapList {...defaultProps} query="de_dust" />)
  expect(screen.getByText('de_dust2')).toBeInTheDocument()
  expect(screen.queryByText('cs_office')).not.toBeInTheDocument()
})
