/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MapCard } from '@/components/maps/MapCard'
import type { MapEntry } from '@/types/map'
import {
  isFileSystemAccessSupported,
  installMap,
  isBspInstalled,
} from '@/lib/maps/install'
import { ensurePermission, markInstalled, isInstalledLocally } from '@/lib/maps/folder-store'

const mockCardPush = jest.fn()
jest.mock('@/lib/auth/notification-context', () => ({
  useNotifications: () => ({ push: mockCardPush }),
}))

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

beforeEach(() => {
  mockCardPush.mockClear()
})

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

test('renders BOMB/DEFUSE badge for de_ tag', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.getByText('BOMB/DEFUSE')).toBeInTheDocument()
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

test('renders HOSTAGE RESCUE badge for cs_ tag', () => {
  const csMap: MapEntry = { ...mockMap, id: '2', originalName: 'cs_office', tags: ['cs_'] }
  render(<MapCard {...defaultProps} map={csMap} />)
  expect(screen.getByText('HOSTAGE RESCUE')).toBeInTheDocument()
})

test('renders no badge when no matching tag', () => {
  const noTagMap: MapEntry = { ...mockMap, tags: [] }
  render(<MapCard {...defaultProps} map={noTagMap} />)
  expect(screen.queryByText('BOMB/DEFUSE')).not.toBeInTheDocument()
  expect(screen.queryByText('HOSTAGE RESCUE')).not.toBeInTheDocument()
})

test('renders file size in KB for small files', () => {
  const smallMap: MapEntry = { ...mockMap, size: 512 * 1024 }
  render(<MapCard {...defaultProps} map={smallMap} />)
  expect(screen.getByText(/KB/)).toBeInTheDocument()
})

test('renders file size in MB for large files', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.getAllByText(/MB/).length).toBeGreaterThan(0)
})

// ── Install flow (supportsFileApi = true) ────────────────────────────────────

describe('with file system API support', () => {
  const mockHandle = { name: 'Counter-Strike' } as FileSystemDirectoryHandle

  beforeEach(() => {
    ;(isFileSystemAccessSupported as jest.Mock).mockReturnValue(true)
    ;(isBspInstalled as jest.Mock).mockReturnValue(false)
    ;(isInstalledLocally as jest.Mock).mockReturnValue(false)
    ;(ensurePermission as jest.Mock).mockResolvedValue(true)
    ;(installMap as jest.Mock).mockResolvedValue(undefined)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://cdn.example.com/map.zip', sha256: 'abc' }),
    })
  })

  afterEach(() => {
    ;(isFileSystemAccessSupported as jest.Mock).mockReturnValue(false)
  })

  test('shows INSTALL button when not installed', () => {
    render(<MapCard {...defaultProps} gameFolder={mockHandle} />)
    expect(screen.getByRole('button', { name: /^install$/i })).toBeInTheDocument()
  })

  test('shows INSTALLED button when installed via isBspInstalled', () => {
    ;(isBspInstalled as jest.Mock).mockReturnValue(true)
    render(<MapCard {...defaultProps} gameFolder={mockHandle} />)
    expect(screen.getByRole('button', { name: /installed/i })).toBeInTheDocument()
  })

  test('shows INSTALLED button when installed locally', () => {
    ;(isInstalledLocally as jest.Mock).mockReturnValue(true)
    render(<MapCard {...defaultProps} gameFolder={mockHandle} />)
    expect(screen.getByRole('button', { name: /installed/i })).toBeInTheDocument()
  })

  test('clicking INSTALL calls installMap', async () => {
    render(<MapCard
      {...defaultProps}
      gameFolder={mockHandle}
      onInstallStatusChange={jest.fn()}
    />)
    fireEvent.click(screen.getByRole('button', { name: /^install$/i }))
    await waitFor(() => expect(installMap).toHaveBeenCalled())
  })

  test('clicking installed button shows reinstall confirm', () => {
    ;(isBspInstalled as jest.Mock).mockReturnValue(true)
    render(<MapCard {...defaultProps} gameFolder={mockHandle} />)
    fireEvent.click(screen.getByRole('button', { name: /installed/i }))
    expect(screen.getByRole('button', { name: /reinstall/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  test('cancel button exits reinstall confirm', () => {
    ;(isBspInstalled as jest.Mock).mockReturnValue(true)
    render(<MapCard {...defaultProps} gameFolder={mockHandle} />)
    fireEvent.click(screen.getByRole('button', { name: /installed/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('button', { name: /reinstall/i })).not.toBeInTheDocument()
  })

  test('shows select checkbox button', () => {
    render(<MapCard {...defaultProps} gameFolder={mockHandle} onToggleSelect={jest.fn()} />)
    expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument()
  })

  test('shows selected state when selected=true', () => {
    render(<MapCard {...defaultProps} gameFolder={mockHandle} selected onToggleSelect={jest.fn()} />)
    expect(screen.getByRole('button', { name: /deselect/i })).toBeInTheDocument()
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  test('toggle select button calls onToggleSelect', () => {
    const onToggleSelect = jest.fn()
    render(<MapCard {...defaultProps} gameFolder={mockHandle} onToggleSelect={onToggleSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /select/i }))
    expect(onToggleSelect).toHaveBeenCalled()
  })

  test('doInstall returns early and no error when permission denied', async () => {
    ;(ensurePermission as jest.Mock).mockResolvedValue(false)
    render(<MapCard {...defaultProps} gameFolder={mockHandle} />)
    fireEvent.click(screen.getByRole('button', { name: /^install$/i }))
    await waitFor(() => expect(ensurePermission).toHaveBeenCalled())
    // no success push
    expect(mockCardPush).not.toHaveBeenCalledWith(expect.any(String), 'success')
  })

  test('doInstall shows error notification when installMap rejects', async () => {
    ;(ensurePermission as jest.Mock).mockResolvedValue(true)
    ;(installMap as jest.Mock).mockRejectedValue(new Error('Disk full'))
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://cdn.example.com/map.zip', sha256: 'abc' }),
    }) as jest.Mock
    render(<MapCard {...defaultProps} gameFolder={mockHandle} />)
    fireEvent.click(screen.getByRole('button', { name: /^install$/i }))
    await waitFor(() =>
      expect(mockCardPush).toHaveBeenCalledWith(expect.stringContaining('Disk full'), 'error')
    )
  })

  test('reinstall confirm button triggers doInstall again', async () => {
    ;(isBspInstalled as jest.Mock).mockReturnValue(true)
    ;(ensurePermission as jest.Mock).mockResolvedValue(true)
    ;(installMap as jest.Mock).mockResolvedValue(undefined)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://cdn.example.com/map.zip', sha256: 'abc' }),
    }) as jest.Mock
    render(<MapCard {...defaultProps} gameFolder={mockHandle} />)
    // installed → click opens confirm
    fireEvent.click(screen.getByRole('button', { name: /installed/i }))
    // click Reinstall
    fireEvent.click(screen.getByRole('button', { name: /reinstall/i }))
    await waitFor(() => expect(installMap).toHaveBeenCalled())
  })
})

// ── Download flow (no File System API) ────────────────────────────────────────

describe('download flow (supportsFileApi=false)', () => {
  beforeEach(() => {
    ;(isFileSystemAccessSupported as jest.Mock).mockReturnValue(false)
    URL.createObjectURL = jest.fn().mockReturnValue('blob:http://test/1')
    URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    ;(isFileSystemAccessSupported as jest.Mock).mockReturnValue(false)
  })

  test('clicking INSTALL button triggers handleRawDownload', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://cdn.example.com/map.zip' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['data'])),
      }) as jest.Mock
    render(<MapCard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /install/i }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    expect(mockCardPush).toHaveBeenCalledWith(expect.stringContaining('download started'), 'success')
  })

  test('download shows error notification on fetch failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    }) as jest.Mock
    render(<MapCard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /install/i }))
    await waitFor(() =>
      expect(mockCardPush).toHaveBeenCalledWith(expect.stringContaining('Failed to download'), 'error')
    )
  })
})
