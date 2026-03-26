/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MapList } from '@/components/maps/MapList'
import type { MapEntry } from '@/types/map'

const mockListPush = jest.fn()
jest.mock('@/lib/auth/notification-context', () => ({
  useNotifications: () => ({ push: mockListPush }),
}))

jest.mock('@/lib/maps/install', () => ({
  scanInstalledBsps: jest.fn().mockResolvedValue(new Set()),
  syncInstalledToLocalStorage: jest.fn(),
  isFileSystemAccessSupported: jest.fn().mockReturnValue(false),
  isBspInstalled: jest.fn().mockReturnValue(false),
  installMap: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/maps/folder-store', () => ({
  ensurePermission: jest.fn().mockResolvedValue(true),
  markInstalled: jest.fn(),
  isInstalledLocally: jest.fn().mockReturnValue(false),
}))

jest.mock('@/components/maps/MapDetailModal', () => ({
  MapDetailModal: ({
    map, onClose, onInstall, onDownload,
  }: {
    map: MapEntry; onClose: () => void; onInstall: () => void; onDownload: () => void
  }) => (
    <div data-testid="map-detail-modal">
      <span data-testid="modal-map-name">{map.originalName}</span>
      <button onClick={onClose}>Close modal</button>
      <button onClick={onInstall}>Install from modal</button>
      <button onClick={onDownload}>Download from modal</button>
    </div>
  ),
}))

jest.mock('@/components/maps/MapCard', () => ({
  MapCard: ({
    map, onOpenDetail, onToggleSelect, autoInstall, onBatchTriggered,
  }: {
    map: MapEntry
    onOpenDetail: (m: MapEntry) => void
    onToggleSelect?: () => void
    autoInstall?: boolean
    onBatchTriggered?: () => void
  }) => (
    <div data-testid="map-card" onClick={() => onOpenDetail(map)}>
      {map.originalName}
      {onToggleSelect && (
        <button data-testid="toggle-select" onClick={e => { e.stopPropagation(); onToggleSelect() }}>
          select
        </button>
      )}
      {autoInstall && onBatchTriggered && (
        <button data-testid="batch-triggered" onClick={onBatchTriggered}>
          batch-done
        </button>
      )}
    </div>
  ),
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
}

test('renders install counter in stats bar', () => {
  render(<MapList {...defaultProps} />)
  expect(screen.getByText('0 / 2 installed')).toBeInTheDocument()
})

test('filters by BOMB/DEFUSE tab', () => {
  render(<MapList {...defaultProps} />)
  fireEvent.click(screen.getByText(/BOMB\/DEFUSE/))
  expect(screen.getByText('de_dust2')).toBeInTheDocument()
  expect(screen.queryByText('cs_office')).not.toBeInTheDocument()
})

test('filters by search query', () => {
  render(<MapList {...defaultProps} />)
  const input = screen.getByPlaceholderText(/search/i)
  fireEvent.change(input, { target: { value: 'de_dust' } })
  expect(screen.getByText('de_dust2')).toBeInTheDocument()
  expect(screen.queryByText('cs_office')).not.toBeInTheDocument()
})

test('shows no-maps message when maps array is empty', () => {
  render(<MapList {...defaultProps} maps={[]} />)
  expect(screen.getByText('No maps available yet.')).toBeInTheDocument()
})

test('opens MapDetailModal when map card is clicked', () => {
  render(<MapList {...defaultProps} />)
  fireEvent.click(screen.getAllByTestId('map-card')[0])
  expect(screen.getByTestId('map-detail-modal')).toBeInTheDocument()
})

test('closes MapDetailModal when close button clicked', () => {
  render(<MapList {...defaultProps} />)
  fireEvent.click(screen.getAllByTestId('map-card')[0])
  expect(screen.getByTestId('map-detail-modal')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Close modal'))
  expect(screen.queryByTestId('map-detail-modal')).not.toBeInTheDocument()
})

test('shows no-maps-found message when search yields no results', () => {
  render(<MapList {...defaultProps} />)
  const input = screen.getByPlaceholderText(/search/i)
  fireEvent.change(input, { target: { value: 'zzz_no_match' } })
  expect(screen.getByText('No maps found.')).toBeInTheDocument()
})

test('modal install with no gameFolder calls onPickFolder', async () => {
  const onPickFolder = jest.fn().mockResolvedValue(undefined)
  render(<MapList {...defaultProps} onPickFolder={onPickFolder} />)
  fireEvent.click(screen.getAllByTestId('map-card')[0])
  fireEvent.click(screen.getByText('Install from modal'))
  await waitFor(() => expect(onPickFolder).toHaveBeenCalled())
})

test('modal download fires fetch', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ url: 'https://cdn.example.com/map.zip' }),
    blob: () => Promise.resolve(new Blob(['data'])),
  }) as jest.Mock
  render(<MapList {...defaultProps} />)
  fireEvent.click(screen.getAllByTestId('map-card')[0])
  fireEvent.click(screen.getByText('Download from modal'))
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
})

test('rerenders correctly when maps prop changes', async () => {
  const { rerender } = render(<MapList {...defaultProps} />)
  expect(screen.getAllByTestId('map-card')).toHaveLength(2)
  const newMaps = [...defaultProps.maps, mockMap('3', 'de_aztec', ['de_'])]
  rerender(<MapList {...defaultProps} maps={newMaps} />)
  await waitFor(() => expect(screen.getAllByTestId('map-card')).toHaveLength(3))
})

test('gameFolder change triggers scanInstalledBsps', async () => {
  const { scanInstalledBsps } = jest.requireMock('@/lib/maps/install')
  const mockHandle = { name: 'Counter-Strike' } as FileSystemDirectoryHandle
  render(<MapList {...defaultProps} gameFolder={mockHandle} />)
  await waitFor(() => expect(scanInstalledBsps).toHaveBeenCalledWith(mockHandle))
})

test('modal install with gameFolder present calls installMap', async () => {
  const { installMap } = jest.requireMock('@/lib/maps/install')
  installMap.mockClear()

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ url: 'https://cdn.example.com/map.zip', sha256: 'abc' }),
  }) as jest.Mock

  const mockHandle = { name: 'Counter-Strike' } as FileSystemDirectoryHandle
  render(<MapList {...defaultProps} gameFolder={mockHandle} />)

  fireEvent.click(screen.getAllByTestId('map-card')[0])
  fireEvent.click(screen.getByText('Install from modal'))
  await waitFor(() => expect(installMap).toHaveBeenCalled())
})

test('modal download triggers fetch and URL.createObjectURL', async () => {
  URL.createObjectURL = jest.fn().mockReturnValue('blob:http://test/1')
  URL.revokeObjectURL = jest.fn()
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ url: 'https://cdn.example.com/map.zip' }),
    })
    .mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['data'])),
    }) as jest.Mock

  render(<MapList {...defaultProps} />)
  fireEvent.click(screen.getAllByTestId('map-card')[0])
  fireEvent.click(screen.getByText('Download from modal'))
  await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled())
})

test('selecting a map shows batch install button', async () => {
  render(<MapList {...defaultProps} />)
  fireEvent.click(screen.getAllByTestId('toggle-select')[0])
  await waitFor(() => expect(screen.getByText(/install all/i)).toBeInTheDocument())
})

test('clicking batch install button clears selection', async () => {
  render(<MapList {...defaultProps} />)
  fireEvent.click(screen.getAllByTestId('toggle-select')[0])
  await waitFor(() => expect(screen.getByText(/install all/i)).toBeInTheDocument())
  fireEvent.click(screen.getByText(/install all/i))
  await waitFor(() => expect(screen.queryByText(/install all/i)).not.toBeInTheDocument())
})

test('modal install with permission denied does not call installMap', async () => {
  const { ensurePermission } = jest.requireMock('@/lib/maps/folder-store')
  const { installMap } = jest.requireMock('@/lib/maps/install')
  ensurePermission.mockResolvedValue(false)
  installMap.mockClear()

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ url: 'https://cdn.example.com/map.zip', sha256: 'abc' }),
  }) as jest.Mock

  const mockHandle = { name: 'Counter-Strike' } as FileSystemDirectoryHandle
  render(<MapList {...defaultProps} gameFolder={mockHandle} />)

  fireEvent.click(screen.getAllByTestId('map-card')[0])
  fireEvent.click(screen.getByText('Install from modal'))
  await waitFor(() => expect(ensurePermission).toHaveBeenCalled())
  expect(installMap).not.toHaveBeenCalled()

  // restore
  ensurePermission.mockResolvedValue(true)
})

test('CheatCodeBanner copy button calls clipboard writeText', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  })
  render(<MapList {...defaultProps} />)
  const copyBtn = screen.getByTitle(/Copy: impulse 101/i)
  fireEvent.click(copyBtn)
  await waitFor(() =>
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('impulse 101')
  )
})

test('batch trigger is cleared after card calls onBatchTriggered', async () => {
  render(<MapList {...defaultProps} />)
  // select first map
  fireEvent.click(screen.getAllByTestId('toggle-select')[0])
  await waitFor(() => expect(screen.getByText(/install all/i)).toBeInTheDocument())
  // trigger batch install → batchTrigger set → card gets autoInstall=true → shows batch-done button
  fireEvent.click(screen.getByText(/install all/i))
  // card's batch-done button appears, click it to simulate onBatchTriggered
  await waitFor(() => expect(screen.getByTestId('batch-triggered')).toBeInTheDocument())
  fireEvent.click(screen.getByTestId('batch-triggered'))
  // after clearBatchTrigger, batch-done button disappears
  await waitFor(() => expect(screen.queryByTestId('batch-triggered')).not.toBeInTheDocument())
})

test('modal install error shows error notification', async () => {
  mockListPush.mockClear()
  const { installMap } = jest.requireMock('@/lib/maps/install')
  installMap.mockRejectedValueOnce(new Error('Write failed'))
  const { ensurePermission } = jest.requireMock('@/lib/maps/folder-store')
  ensurePermission.mockResolvedValue(true)

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ url: 'https://cdn.example.com/map.zip', sha256: 'abc' }),
  }) as jest.Mock

  const mockHandle = { name: 'Counter-Strike' } as FileSystemDirectoryHandle
  render(<MapList {...defaultProps} gameFolder={mockHandle} />)

  fireEvent.click(screen.getAllByTestId('map-card')[0])
  fireEvent.click(screen.getByText('Install from modal'))
  await waitFor(() =>
    expect(mockListPush).toHaveBeenCalledWith(expect.stringContaining('Write failed'), 'error')
  )
})
