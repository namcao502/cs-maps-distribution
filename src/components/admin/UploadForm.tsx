'use client'
import { useState, useRef, useCallback } from 'react'
import { MAP_TAGS, TAG_LABELS } from '@/lib/maps/tags'

const MAX_SIZE = 20 * 1024 * 1024

type FileStatus = 'queued' | 'uploading' | 'done' | 'error'

interface QueueItem {
  id: number
  file: File
  status: FileStatus
  progress: number
  error?: string
}

let nextId = 0

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const processingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateItem = useCallback((id: number, patch: Partial<QueueItem>) => {
    setQueue(q => q.map(item => item.id === id ? { ...item, ...patch } : item))
  }, [])

  const processQueue = useCallback(async (items: QueueItem[]) => {
    if (processingRef.current) return
    processingRef.current = true

    for (const item of items) {
      if (item.status !== 'queued') continue

      const { file, id } = item

      if (file.size > MAX_SIZE) {
        updateItem(id, { status: 'error', error: 'File too large (max 20 MB)' })
        continue
      }
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['zip', '7z', 'rar'].includes(ext ?? '')) {
        updateItem(id, { status: 'error', error: 'Only .zip, .7z, .rar allowed' })
        continue
      }

      updateItem(id, { status: 'uploading', progress: 0 })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('tags', JSON.stringify(selectedTags))

      let succeeded = false
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/upload')
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) updateItem(id, { progress: e.loaded / e.total })
        }
        xhr.onload = () => {
          if (xhr.status === 200) { succeeded = true; resolve() }
          else {
            try { reject(new Error(JSON.parse(xhr.responseText).error ?? 'Upload failed')) }
            catch { reject(new Error('Upload failed')) }
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formData)
      }).catch(err => {
        updateItem(id, { status: 'error', error: (err as Error).message })
      })

      if (succeeded) {
        updateItem(id, { status: 'done', progress: 1 })
        onUploaded()
      }
    }

    processingRef.current = false
  }, [updateItem, onUploaded, selectedTags])

  function enqueue(files: FileList | File[]) {
    const newItems: QueueItem[] = Array.from(files).map(file => ({
      id: nextId++,
      file,
      status: 'queued',
      progress: 0,
    }))
    setQueue(prev => {
      const updated = [...prev, ...newItems]
      processQueue([...prev, ...newItems])
      return updated
    })
  }

  const hasActive = queue.some(i => i.status === 'queued' || i.status === 'uploading')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {MAP_TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedTags.includes(tag)
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)] hover:border-blue-400'
            }`}
          >
            {TAG_LABELS[tag] ?? tag}
          </button>
        ))}
      </div>
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-[var(--border)] hover:border-[var(--text-muted)]'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files.length) enqueue(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.7z,.rar"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files?.length) { enqueue(e.target.files); e.target.value = '' } }}
        />
        <p className="text-[var(--text-muted)]">Drop .zip, .7z, or .rar files here, or click to browse</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Max 20 MB per file · Multiple files supported</p>
      </div>

      {queue.length > 0 && (
        <div className="flex flex-col gap-2">
          {queue.map(item => (
            <div key={item.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[60%]">{item.file.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[var(--text-muted)]">{formatBytes(item.file.size)}</span>
                  {item.status === 'queued' && (
                    <span className="text-xs bg-[var(--bg-secondary)] text-[var(--text-muted)] px-2 py-0.5 rounded-full">In queue</span>
                  )}
                  {item.status === 'uploading' && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      {Math.round(item.progress * 100)}%
                    </span>
                  )}
                  {item.status === 'done' && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Done</span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Failed</span>
                  )}
                </div>
              </div>

              {item.status === 'uploading' && (
                <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.round(item.progress * 100)}%` }}
                  />
                </div>
              )}
              {item.status === 'error' && (
                <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
              )}
            </div>
          ))}

          {!hasActive && (
            <button
              onClick={() => setQueue([])}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] self-end"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
