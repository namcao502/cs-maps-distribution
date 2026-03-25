'use client'
import { useState, useRef, useCallback } from 'react'
import { MAP_TAGS, TAG_LABELS } from '@/lib/maps/tags'
import { useNotifications } from '@/lib/auth/notification-context'

const MAX_SIZE = 20 * 1024 * 1024

type FileStatus = 'staged' | 'uploading' | 'done' | 'error'

interface StagedFile {
  id: number
  file: File
  tags: string[]
  screenshots: (File | null)[]
  status: FileStatus
  progress: number
  error?: string
}

let nextId = 0

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateScreenshot(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'Only JPG, PNG, WebP allowed'
  if (file.size > 2 * 1024 * 1024) return 'Max 2 MB per screenshot'
  return null
}

function validateMapFile(file: File): string | null {
  if (file.size > MAX_SIZE) return 'File too large (max 20 MB)'
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['zip', '7z', 'rar'].includes(ext ?? '')) return 'Only .zip, .7z, .rar allowed'
  return null
}

const CS_DIRS = ['cstrike/', 'maps/', 'models/', 'sound/', 'sprites/']

function listZipEntries(buffer: ArrayBuffer): string[] {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  let eocd = -1
  for (let i = buffer.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd === -1) return []
  const cdOffset = view.getUint32(eocd + 16, true)
  const cdSize = view.getUint32(eocd + 12, true)
  const names: string[] = []
  const dec = new TextDecoder()
  let pos = cdOffset
  while (pos < cdOffset + cdSize) {
    if (view.getUint32(pos, true) !== 0x02014b50) break
    const fnLen = view.getUint16(pos + 28, true)
    const extraLen = view.getUint16(pos + 30, true)
    const commentLen = view.getUint16(pos + 32, true)
    const name = dec.decode(bytes.slice(pos + 46, pos + 46 + fnLen))
    if (!name.endsWith('/')) names.push(name)
    pos += 46 + fnLen + extraLen + commentLen
  }
  return names
}

async function validateZipContents(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer()
    const entries = listZipEntries(buffer)
    if (entries.length === 0) return 'Could not read archive contents. The file may be corrupted.'
    const norm = entries.map(e => e.toLowerCase().replace(/\\/g, '/'))
    const hasBsp = norm.some(e => e.endsWith('.bsp'))
    const hasCSDir = norm.some(e => CS_DIRS.some(d => e.startsWith(d) || e.includes('/' + d)))
    if (!hasBsp && !hasCSDir) return 'Archive does not appear to contain a CS 1.6 map (no .bsp file found).'
    return null
  } catch {
    return 'Could not read archive contents. The file may be corrupted.'
  }
}

export function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [validating, setValidating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { push } = useNotifications()

  async function addFiles(files: FileList | File[]) {
    setValidating(true)
    const valid: StagedFile[] = []
    for (const file of Array.from(files)) {
      const extErr = validateMapFile(file)
      if (extErr) { push(`${file.name}: ${extErr}`, 'error'); continue }
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'zip') {
        const contentErr = await validateZipContents(file)
        if (contentErr) { push(`${file.name}: ${contentErr}`, 'error'); continue }
      }
      valid.push({ id: nextId++, file, tags: [], screenshots: [null, null, null], status: 'staged', progress: 0 })
    }
    setValidating(false)
    if (valid.length > 0) setStaged(prev => [...prev, ...valid])
  }

  function removeStaged(id: number) {
    setStaged(prev => prev.filter(s => s.id !== id))
  }

  function toggleTag(id: number, tag: string) {
    setStaged(prev => prev.map(s => s.id !== id ? s : {
      ...s,
      tags: s.tags.includes(tag) ? s.tags.filter(t => t !== tag) : [...s.tags, tag],
    }))
  }

  function setScreenshot(id: number, index: number, file: File | null) {
    setStaged(prev => prev.map(s => s.id !== id ? s : {
      ...s,
      screenshots: s.screenshots.map((f, i) => i === index ? file : f) as (File | null)[],
    }))
  }

  function updateStaged(id: number, patch: Partial<StagedFile>) {
    setStaged(prev => prev.map(s => s.id !== id ? s : { ...s, ...patch }))
  }

  const handleUpload = useCallback(async () => {
    setUploading(true)

    for (const item of staged) {
      if (item.status === 'done') continue

      const err = validateMapFile(item.file)
      if (err) {
        push(`${item.file.name}: ${err}`, 'error')
        removeStaged(item.id)
        continue
      }

      updateStaged(item.id, { status: 'uploading', progress: 0 })

      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('tags', JSON.stringify(item.tags))

      let succeeded = false
      let mapId: string | null = null

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/upload')
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) updateStaged(item.id, { progress: e.loaded / e.total })
        }
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText) as { id?: string }
              if (data.id) mapId = data.id
            } catch { /* ignore */ }
            succeeded = true
            resolve()
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error ?? 'Upload failed')) }
            catch { reject(new Error('Upload failed')) }
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formData)
      }).catch(err => {
        push(`${item.file.name}: ${(err as Error).message}`, 'error')
        removeStaged(item.id)
      })

      if (succeeded) {
        if (mapId) {
          for (const screenshotFile of item.screenshots.filter((f): f is File => f !== null)) {
            const fd = new FormData()
            fd.append('file', screenshotFile)
            try {
              const res = await fetch(`/api/maps/${mapId}/screenshots`, { method: 'POST', body: fd })
              if (!res.ok) push(`Screenshot upload failed (${res.status})`, 'error')
            } catch { push('Screenshot upload error', 'error') }
          }
        }
        push(`${item.file.name} uploaded successfully`, 'success')
        removeStaged(item.id)
        onUploaded()
      }
    }

    setUploading(false)
  }, [staged, onUploaded])

  const hasPending = staged.some(s => s.status === 'staged')
  const isProcessing = staged.some(s => s.status === 'uploading')
  const missingTags = staged.some(s => s.status === 'staged' && s.tags.length === 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          dragging ? 'border-[var(--accent-cyan)] bg-[var(--bg-inset)]' : 'border-[var(--border)] hover:border-[var(--text-muted)]'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.7z,.rar"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files?.length) { void addFiles(e.target.files); e.target.value = '' } }}
        />
        {validating ? (
          <p className="text-[var(--accent-cyan)] text-sm flex items-center justify-center gap-2">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full" />
            Validating…
          </p>
        ) : (
          <>
            <p className="text-[var(--text-muted)] text-sm">Drop .zip, .7z, or .rar files here, or click to browse</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Max 20 MB per file · Multiple files supported</p>
          </>
        )}
      </div>

      {/* Staged files */}
      {staged.length > 0 && (
        <div className="flex flex-col gap-3">
          {staged.map(item => (
            <div key={item.id} className="bg-[var(--bg-inset)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">

              {/* File header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm font-semibold text-[var(--text-primary)] truncate">{item.file.name}</span>
                  <span className="text-xs text-[var(--text-muted)] shrink-0">{formatBytes(item.file.size)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {item.status === 'uploading' && (
                    <span className="text-xs font-mono text-[var(--accent-orange)]">{Math.round(item.progress * 100)}%</span>
                  )}
                  {item.status === 'staged' && (
                    <button
                      onClick={() => removeStaged(item.id)}
                      className="text-[var(--text-muted)] hover:text-[var(--color-danger)] text-sm transition-colors"
                      aria-label="Remove"
                    >×</button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {item.status === 'uploading' && (
                <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--accent-orange)] transition-all" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                </div>
              )}
              {item.status === 'error' && (
                <p className="text-xs text-[var(--color-danger)] font-mono">{item.error}</p>
              )}

              {/* Editable fields — only when staged */}
              {item.status === 'staged' && (
                <>
                  {/* Tags */}
                  <div>
                    <p className="text-xs font-mono mb-1.5 flex items-center gap-2">
                      <span className={item.tags.length === 0 ? 'text-[var(--color-danger)]' : 'text-[var(--text-muted)]'}>
                        Tags
                      </span>
                      {item.tags.length === 0 && (
                        <span className="text-[var(--color-danger)]">— required</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MAP_TAGS.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(item.id, tag)}
                          className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                            item.tags.includes(tag)
                              ? 'bg-[var(--accent-cyan)] text-black border-[var(--accent-cyan)]'
                              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent-cyan)]'
                          }`}
                        >
                          {TAG_LABELS[tag] ?? tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Screenshots */}
                  <div>
                    <p className="text-xs font-mono text-[var(--text-muted)] mb-1.5">
                      Screenshots <span className="text-[var(--text-subtle)]">(optional, up to 3)</span>
                    </p>
                    <div className="flex gap-2">
                      {item.screenshots.map((file, i) => (
                        <div key={i} className="flex-1">
                          {file ? (
                            <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono text-[var(--text-muted)]">
                              <span className="truncate flex-1">{file.name}</span>
                              <button
                                type="button"
                                className="text-[var(--color-danger)] hover:opacity-80 shrink-0"
                                onClick={() => setScreenshot(item.id, i, null)}
                              >×</button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center h-9 border border-dashed border-[var(--border)] rounded cursor-pointer hover:border-[var(--accent-cyan)] transition-colors text-[var(--text-muted)] text-xs font-mono">
                              + IMG
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={e => {
                                  const f = e.target.files?.[0]
                                  if (!f) return
                                  const err = validateScreenshot(f)
                                  if (err) { push(err, 'error'); return }
                                  setScreenshot(item.id, i, f)
                                  e.target.value = ''
                                }}
                              />
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <span />
            {hasPending && (
              <button
                onClick={handleUpload}
                disabled={uploading || isProcessing || missingTags}
                title={missingTags ? 'All files must have at least one tag' : undefined}
                className="px-5 py-2 rounded-lg text-sm font-mono font-bold bg-[var(--accent-orange)] text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isProcessing ? 'Uploading…' : `Upload ${staged.filter(s => s.status === 'staged').length} file${staged.filter(s => s.status === 'staged').length > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
