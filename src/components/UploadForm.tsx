'use client'
import { useState, useRef } from 'react'

const MAX_SIZE = 20 * 1024 * 1024

export function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setError(null)
    if (file.size > MAX_SIZE) {
      setError('File is too large (max 20 MB)')
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['zip', '7z', 'rar'].includes(ext ?? '')) {
      setError('Only .zip, .7z, and .rar files are allowed')
      return
    }

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    let succeeded = false
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/upload')
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setProgress(e.loaded / e.total)
      }
      xhr.onload = () => {
        if (xhr.status === 200) { succeeded = true; resolve() }
        else {
          try {
            reject(new Error(JSON.parse(xhr.responseText).error ?? 'Upload failed'))
          } catch {
            reject(new Error('Upload failed'))
          }
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.send(formData)
    }).catch(err => {
      setError((err as Error).message)
    })

    setUploading(false)
    setProgress(0)
    if (succeeded) onUploaded()
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
        dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) upload(f) }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.7z,.rar"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }}
      />
      {uploading ? (
        <>
          <p className="font-medium mb-2">Uploading...</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-500">Drop a .zip, .7z, or .rar file here, or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">Max 20 MB</p>
        </>
      )}
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  )
}
