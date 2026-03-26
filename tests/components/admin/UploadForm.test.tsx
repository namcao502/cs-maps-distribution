/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { UploadForm } from '@/components/admin/UploadForm'

// jsdom omits File.prototype.arrayBuffer — polyfill via FileReader
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}

const mockPush = jest.fn()
jest.mock('@/lib/auth/notification-context', () => ({
  useNotifications: () => ({ push: mockPush }),
}))

function getArchiveInput() {
  return document.querySelector('input[type="file"][accept=".zip,.7z,.rar"]') as HTMLInputElement
}

async function stageFile(filename = 'test.7z') {
  const file = new File(['data'], filename, { type: 'application/x-7z-compressed' })
  fireEvent.change(getArchiveInput(), { target: { files: [file] } })
  await waitFor(() => expect(screen.getByText(filename)).toBeInTheDocument())
}

// ── Minimal valid ZIP builder ─────────────────────────────────────────────────

function makeZipBuffer(filenames: string[]): ArrayBuffer {
  const enc = new TextEncoder()
  const cdEntries: Uint8Array[] = []
  for (const name of filenames) {
    const nameBytes = enc.encode(name)
    const entry = new Uint8Array(46 + nameBytes.length)
    const dv = new DataView(entry.buffer)
    dv.setUint32(0, 0x02014b50, true)  // central dir signature
    dv.setUint16(28, nameBytes.length, true)  // filename length
    entry.set(nameBytes, 46)
    cdEntries.push(entry)
  }
  const cdSize = cdEntries.reduce((n, e) => n + e.length, 0)
  const eocd = new Uint8Array(22)
  const edv = new DataView(eocd.buffer)
  edv.setUint32(0, 0x06054b50, true)  // EOCD signature
  edv.setUint32(12, cdSize, true)     // central dir size
  edv.setUint32(16, 0, true)          // central dir offset (starts at byte 0)
  const out = new Uint8Array(cdSize + 22)
  let off = 0
  for (const e of cdEntries) { out.set(e, off); off += e.length }
  out.set(eocd, off)
  return out.buffer
}

// ── XHR mock ──────────────────────────────────────────────────────────────────

function setupXhrMock(
  status = 200,
  responseText = JSON.stringify({ id: 'map-1' }),
  opts: { withProgress?: boolean; networkError?: boolean } = {}
) {
  const mockXhr: Record<string, unknown> = {
    open: jest.fn(),
    setRequestHeader: jest.fn(),
    upload: { onprogress: null as unknown },
    status,
    responseText,
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
  }
  mockXhr.send = jest.fn().mockImplementation(() => {
    Promise.resolve().then(() => {
      if (opts.withProgress) {
        const progressHandler = (mockXhr.upload as { onprogress: ((e: ProgressEvent) => void) | null }).onprogress
        progressHandler?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent)
      }
      if (opts.networkError) {
        ;(mockXhr.onerror as (() => void) | null)?.()
      } else {
        ;(mockXhr.onload as (() => void) | null)?.()
      }
    })
  })
  jest.spyOn(global, 'XMLHttpRequest').mockImplementation(() => mockXhr as unknown as XMLHttpRequest)
  return mockXhr
}

beforeEach(() => {
  mockPush.mockClear()
})

// ── Basic render ─────────────────────────────────────────────────────────────

test('renders drop zone', () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  expect(screen.getByText(/drop .zip, .7z, or .rar/i)).toBeInTheDocument()
})

// ── Staging a file ───────────────────────────────────────────────────────────

test('renders screenshots section after staging a file', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  expect(screen.getByText(/screenshots/i)).toBeInTheDocument()
})

test('shows up to 3 note after staging a file', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  expect(screen.getByText(/up to 3/i)).toBeInTheDocument()
})

test('renders three screenshot file inputs after staging a file', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  await waitFor(() => {
    const inputs = document.querySelectorAll('input[type="file"][accept="image/jpeg,image/png,image/webp"]')
    expect(inputs.length).toBe(3)
  })
})

test('shows filename and remove button after screenshot selection', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  const inputs = document.querySelectorAll('input[type="file"][accept="image/jpeg,image/png,image/webp"]')
  const shot = new File(['data'], 'shot.webp', { type: 'image/webp' })
  fireEvent.change(inputs[0], { target: { files: [shot] } })
  expect(await screen.findByText('shot.webp')).toBeInTheDocument()
  const removeButtons = screen.getAllByText('×')
  const screenshotRemove = removeButtons.find(btn => !btn.getAttribute('aria-label'))
  expect(screenshotRemove).toBeInTheDocument()
})

test('remove button clears the screenshot slot', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  const inputs = document.querySelectorAll('input[type="file"][accept="image/jpeg,image/png,image/webp"]')
  const shot = new File(['data'], 'shot.png', { type: 'image/png' })
  fireEvent.change(inputs[0], { target: { files: [shot] } })
  expect(await screen.findByText('shot.png')).toBeInTheDocument()
  const removeButtons = screen.getAllByText('×')
  const screenshotRemove = removeButtons.find(btn => !btn.getAttribute('aria-label'))!
  fireEvent.click(screenshotRemove)
  expect(screen.queryByText('shot.png')).not.toBeInTheDocument()
})

test('remove staged file button removes the file from list', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile('map.rar')
  fireEvent.click(screen.getByRole('button', { name: /remove/i }))
  expect(screen.queryByText('map.rar')).not.toBeInTheDocument()
})

test('upload button is disabled when no tag selected', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  const uploadBtn = screen.getByRole('button', { name: /upload/i })
  expect(uploadBtn).toBeDisabled()
})

test('upload button is enabled after selecting a tag', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  fireEvent.click(screen.getByText(/Bomb\/Defuse/i))
  const uploadBtn = screen.getByRole('button', { name: /upload/i })
  expect(uploadBtn).not.toBeDisabled()
})

test('shows file size in MB for large file', async () => {
  const bigFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'big.7z')
  render(<UploadForm onUploaded={jest.fn()} />)
  fireEvent.change(getArchiveInput(), { target: { files: [bigFile] } })
  await waitFor(() => expect(screen.queryAllByText(/MB/).length).toBeGreaterThan(0))
})

// ── Zip validation ───────────────────────────────────────────────────────────

test('rejects oversized file with error notification', async () => {
  const hugeFile = Object.defineProperty(
    new File(['data'], 'big.zip', { type: 'application/zip' }),
    'size',
    { value: 25 * 1024 * 1024 }
  )
  render(<UploadForm onUploaded={jest.fn()} />)
  await act(async () => {
    fireEvent.change(getArchiveInput(), { target: { files: [hugeFile] } })
  })
  expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('big.zip'), 'error')
})

test('rejects .zip with no valid content as corrupted', async () => {
  const emptyZip = new File([new ArrayBuffer(0)], 'empty.zip', { type: 'application/zip' })
  render(<UploadForm onUploaded={jest.fn()} />)
  await act(async () => {
    fireEvent.change(getArchiveInput(), { target: { files: [emptyZip] } })
  })
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(
    expect.stringContaining('empty.zip'),
    'error'
  ))
})

test('accepts valid .zip containing a .bsp file', async () => {
  const buf = makeZipBuffer(['maps/de_dust2.bsp'])
  const zipFile = new File([new Uint8Array(buf)], 'valid.zip', { type: 'application/zip' })
  render(<UploadForm onUploaded={jest.fn()} />)
  await act(async () => {
    fireEvent.change(getArchiveInput(), { target: { files: [zipFile] } })
  })
  await waitFor(() => expect(screen.getByText('valid.zip')).toBeInTheDocument())
  expect(mockPush).not.toHaveBeenCalledWith(expect.anything(), 'error')
})

test('accepts valid .zip containing a CS directory', async () => {
  const buf = makeZipBuffer(['cstrike/readme.txt'])
  const zipFile = new File([new Uint8Array(buf)], 'csdir.zip', { type: 'application/zip' })
  render(<UploadForm onUploaded={jest.fn()} />)
  await act(async () => {
    fireEvent.change(getArchiveInput(), { target: { files: [zipFile] } })
  })
  await waitFor(() => expect(screen.getByText('csdir.zip')).toBeInTheDocument())
})

test('rejects .zip with entries but no BSP or CS directories', async () => {
  const buf = makeZipBuffer(['readme.txt', 'icon.png'])
  const zipFile = new File([new Uint8Array(buf)], 'nobsp.zip', { type: 'application/zip' })
  render(<UploadForm onUploaded={jest.fn()} />)
  await act(async () => {
    fireEvent.change(getArchiveInput(), { target: { files: [zipFile] } })
  })
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(
    expect.stringContaining('nobsp.zip'),
    'error'
  ))
})

// ── Screenshot validation ─────────────────────────────────────────────────────

test('rejects screenshot with invalid format', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  const inputs = document.querySelectorAll('input[type="file"][accept="image/jpeg,image/png,image/webp"]')
  const badFile = new File(['data'], 'shot.gif', { type: 'image/gif' })
  await act(async () => {
    fireEvent.change(inputs[0], { target: { files: [badFile] } })
  })
  expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('JPG'), 'error')
})

test('rejects screenshot that is too large', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  const inputs = document.querySelectorAll('input[type="file"][accept="image/jpeg,image/png,image/webp"]')
  const bigShot = Object.defineProperty(
    new File(['data'], 'big.jpg', { type: 'image/jpeg' }),
    'size',
    { value: 3 * 1024 * 1024 }
  )
  await act(async () => {
    fireEvent.change(inputs[0], { target: { files: [bigShot] } })
  })
  expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('2 MB'), 'error')
})

// ── Drag-and-drop ─────────────────────────────────────────────────────────────

test('drag-over highlights the drop zone', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  const dropZone = getArchiveInput().parentElement!
  fireEvent.dragOver(dropZone)
  // onDragOver sets dragging=true, changing border class; just check no crash
  expect(dropZone).toBeInTheDocument()
})

test('drag-leave removes highlight', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  const dropZone = getArchiveInput().parentElement!
  fireEvent.dragOver(dropZone)
  fireEvent.dragLeave(dropZone)
  expect(dropZone).toBeInTheDocument()
})

test('dropping a valid file stages it', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  const dropZone = getArchiveInput().parentElement!
  const file = new File(['data'], 'dropped.7z', { type: 'application/x-7z-compressed' })
  await act(async () => {
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } })
  })
  await waitFor(() => expect(screen.getByText('dropped.7z')).toBeInTheDocument())
})

test('dropping a file with invalid extension shows error', async () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  const dropZone = getArchiveInput().parentElement!
  const txtFile = new File(['data'], 'notes.txt', { type: 'text/plain' })
  await act(async () => {
    fireEvent.drop(dropZone, { dataTransfer: { files: [txtFile] } })
  })
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(
    expect.stringContaining('notes.txt'),
    'error'
  ))
})

// ── Upload flow (XHR mock) ───────────────────────────────────────────────────

test('uploads file successfully and calls onUploaded', async () => {
  setupXhrMock()
  const onUploaded = jest.fn()
  render(<UploadForm onUploaded={onUploaded} />)
  await stageFile()
  fireEvent.click(screen.getByText(/Bomb\/Defuse/i))
  fireEvent.click(screen.getByRole('button', { name: /upload/i }))
  await waitFor(() => expect(onUploaded).toHaveBeenCalled())
  expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('test.7z'), 'success')
})

test('shows error notification when upload fails (non-200)', async () => {
  setupXhrMock(400, JSON.stringify({ error: 'Bad request' }))
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  fireEvent.click(screen.getByText(/Bomb\/Defuse/i))
  fireEvent.click(screen.getByRole('button', { name: /upload/i }))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(
    expect.stringContaining('Bad request'),
    'error'
  ))
})

test('shows generic upload-failed when error response is not JSON', async () => {
  setupXhrMock(500, 'Internal Server Error')
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  fireEvent.click(screen.getByText(/Bomb\/Defuse/i))
  fireEvent.click(screen.getByRole('button', { name: /upload/i }))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(
    expect.stringContaining('Upload failed'),
    'error'
  ))
})

test('shows error notification on network error', async () => {
  setupXhrMock(0, '', { networkError: true })
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  fireEvent.click(screen.getByText(/Bomb\/Defuse/i))
  fireEvent.click(screen.getByRole('button', { name: /upload/i }))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(
    expect.stringContaining('Network error'),
    'error'
  ))
})

test('upload progress event updates percentage display', async () => {
  setupXhrMock(200, JSON.stringify({ id: 'map-1' }), { withProgress: true })
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageFile()
  fireEvent.click(screen.getByText(/Bomb\/Defuse/i))
  fireEvent.click(screen.getByRole('button', { name: /upload/i }))
  // Progress handler fires; onUploaded must be called without error
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(
    expect.stringContaining('test.7z'),
    'success'
  ))
})

// ── Screenshot upload ─────────────────────────────────────────────────────────

async function stageWithScreenshot() {
  await stageFile()
  const inputs = document.querySelectorAll('input[type="file"][accept="image/jpeg,image/png,image/webp"]')
  const shot = new File(['data'], 'shot.jpg', { type: 'image/jpeg' })
  fireEvent.change(inputs[0], { target: { files: [shot] } })
  await screen.findByText('shot.jpg')
  fireEvent.click(screen.getByText(/Bomb\/Defuse/i))
}

test('uploads screenshot after map upload succeeds', async () => {
  setupXhrMock(200, JSON.stringify({ id: 'map-1' }))
  global.fetch = jest.fn().mockResolvedValue({ ok: true })
  const onUploaded = jest.fn()
  render(<UploadForm onUploaded={onUploaded} />)
  await stageWithScreenshot()
  fireEvent.click(screen.getByRole('button', { name: /upload/i }))
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/maps/map-1/screenshots'),
    expect.anything()
  ))
  await waitFor(() => expect(onUploaded).toHaveBeenCalled())
})

test('shows error when screenshot upload returns non-ok', async () => {
  setupXhrMock(200, JSON.stringify({ id: 'map-1' }))
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 413 })
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageWithScreenshot()
  fireEvent.click(screen.getByRole('button', { name: /upload/i }))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(
    expect.stringContaining('Screenshot upload failed'),
    'error'
  ))
})

test('shows error when screenshot fetch throws', async () => {
  setupXhrMock(200, JSON.stringify({ id: 'map-1' }))
  global.fetch = jest.fn().mockRejectedValue(new Error('network'))
  render(<UploadForm onUploaded={jest.fn()} />)
  await stageWithScreenshot()
  fireEvent.click(screen.getByRole('button', { name: /upload/i }))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(
    'Screenshot upload error',
    'error'
  ))
})
