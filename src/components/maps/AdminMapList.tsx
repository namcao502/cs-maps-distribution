'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import { ConfirmModal } from '@/components/ConfirmModal'
import { SearchInput } from '@/components/maps/SearchInput'
import { MAP_TAGS, TAG_LABELS, FILTER_TABS, type FilterTab } from '@/lib/maps/tags'
import { Button, Card } from '@/components/ui'
import { useNotifications } from '@/lib/auth/notification-context'
import {
  VALIDATE_SCREENSHOT_FORMAT, VALIDATE_SCREENSHOT_SIZE, MSG_SCREENSHOTS_UPLOADED,
  STATUS_SAVING_ORDER, STATUS_NO_MAPS_ADMIN, STATUS_NO_MAPS_FOUND,
  BTN_MOVE_UP, BTN_MOVE_DOWN, BTN_SHOW, BTN_HIDE, BTN_DELETE, STATUS_ELLIPSIS,
  STATUS_UPLOADING, BTN_ADD_SCREENSHOT, LABEL_SCREENSHOTS, INFO_SCREENSHOTS_UP_TO,
  LABEL_DELETE_CONFIRM, BTN_SET_AS_PICK, BTN_TODAY_PICK, BTN_CONFIRM_PICK, BTN_REPLACE_PICK,
  INFO_CAPTION_PLACEHOLDER, ERR_SET_PICK_FAILED,
} from '@/lib/constants/messages'

const TAG_SHORT: Record<string, string> = {
  'de_': 'BOMB/DEFUSE',
  'cs_': 'HOSTAGE RESCUE',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateScreenshot(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return VALIDATE_SCREENSHOT_FORMAT
  if (file.size > 2 * 1024 * 1024) return VALIDATE_SCREENSHOT_SIZE
  return null
}

export function AdminMapList({
  maps,
  onDeleted,
  onTagsUpdated,
  onHiddenUpdated,
  onScreenshotsUpdated,
  onReorder,
}: {
  maps: MapEntry[]
  onDeleted: (id: string) => void
  onTagsUpdated: (id: string, tags: string[]) => void
  onHiddenUpdated: (id: string, hidden: boolean) => void
  onScreenshotsUpdated: (id: string, keys: string[]) => void
  onReorder?: (newMaps: MapEntry[]) => void
}) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MapEntry | null>(null)
  const [togglingHidden, setTogglingHidden] = useState<string | null>(null)
  const [togglingTag, setTogglingTag] = useState<string | null>(null)
  const [deletingScreenshot, setDeletingScreenshot] = useState<string | null>(null)
  const [uploadingScreenshot, setUploadingScreenshot] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [orderedMaps, setOrderedMaps] = useState<MapEntry[]>(maps)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPickId, setCurrentPickId] = useState<string | null>(null)
  const [settingPickId, setSettingPickId] = useState<string | null>(null)
  const [confirmingPickFor, setConfirmingPickFor] = useState<string | null>(null)
  const [pickCaption, setPickCaption] = useState('')
  const [savingPick, setSavingPick] = useState(false)
  const { push } = useNotifications()

  useEffect(() => { setOrderedMaps(maps) }, [maps])

  useEffect(() => {
    fetch('/api/daily-pick')
      .then(r => r.ok ? r.json() : null)
      .then((data: { map: { id: string }; caption: string } | null) => {
        setCurrentPickId(data?.map.id ?? null)
      })
      .catch(() => {})
  }, [])

  async function toggleTag(map: MapEntry, tag: string) {
    const newTags = [tag, ...map.tags.filter(t => !MAP_TAGS.includes(t as typeof MAP_TAGS[number]))]
    setTogglingTag(map.id)
    const res = await fetch(`/api/admin/maps/${map.id}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags }),
    })
    if (res.ok) {
      onTagsUpdated(map.id, newTags)
    } else {
      push('Failed to save tags', 'error')
    }
    setTogglingTag(null)
  }

  async function toggleHidden(map: MapEntry) {
    setTogglingHidden(map.id)
    const res = await fetch(`/api/admin/maps/${map.id}/hidden`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: !map.hidden }),
    })
    if (res.ok) {
      onHiddenUpdated(map.id, !map.hidden)
      push(map.hidden ? `${map.originalName} is now visible` : `${map.originalName} is now hidden`, 'success')
    } else {
      push('Failed to update visibility', 'error')
    }
    setTogglingHidden(null)
  }

  async function moveMap(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const prev = orderedMaps
    const next = [...orderedMaps]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    setOrderedMaps(next)
    onReorder?.(next)
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/maps/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next.map(m => m.id) }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      setOrderedMaps(prev)
      onReorder?.(prev)
      push('Failed to save map order', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmDelete(map: MapEntry) {
    setPendingDelete(null)
    const res = await fetch(`/api/delete/${map.id}`, { method: 'DELETE' })
    if (!res.ok) {
      push('Failed to delete map. Please try again.', 'error')
      return
    }
    push(`${map.originalName} deleted`, 'success')
    onDeleted(map.id)
  }

  async function deleteScreenshot(map: MapEntry, index: number) {
    setDeletingScreenshot(`${map.id}-${index}`)
    const res = await fetch(`/api/maps/${map.id}/screenshots/${index}`, { method: 'DELETE' })
    if (res.ok) {
      const newKeys = (map.screenshotKeys ?? []).filter((_, i) => i !== index)
      onScreenshotsUpdated(map.id, newKeys)
    } else {
      push('Failed to delete screenshot', 'error')
    }
    setDeletingScreenshot(null)
  }

  async function uploadScreenshots(map: MapEntry, files: FileList) {
    const current = map.screenshotKeys ?? []
    const slots = 3 - current.length
    if (slots <= 0) return
    const toUpload = Array.from(files).slice(0, slots)
    setUploadingScreenshot(map.id)
    const newKeys = [...current]
    for (const file of toUpload) {
      const err = validateScreenshot(file)
      if (err) { push(`${file.name}: ${err}`, 'error'); continue }
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/maps/${map.id}/screenshots`, { method: 'POST', body: fd })
      if (res.ok) {
        newKeys.push(URL.createObjectURL(file))
      } else {
        const data = await res.json().catch(() => ({}))
        push(data.error ?? 'Failed to upload screenshot', 'error')
      }
    }
    onScreenshotsUpdated(map.id, newKeys)
    setUploadingScreenshot(null)
    if (newKeys.length > current.length) push(MSG_SCREENSHOTS_UPLOADED, 'success')
  }

  async function setAsPick(mapId: string) {
    setSavingPick(true)
    try {
      const res = await fetch('/api/admin/daily-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId, caption: pickCaption }),
      })
      if (!res.ok) throw new Error('Failed')
      setCurrentPickId(mapId)
      setSettingPickId(null)
      setPickCaption('')
      push('Daily pick set', 'success')
    } catch (err) {
      console.error('setAsPick failed:', err)
      push(ERR_SET_PICK_FAILED, 'error')
    } finally {
      setSavingPick(false)
    }
  }

  if (orderedMaps.length === 0) {
    return <p className="text-[var(--text-muted)] text-center py-6">{STATUS_NO_MAPS_ADMIN}</p>
  }

  const filtered = orderedMaps.filter(m =>
    (activeTab === 'all' || m.tags.includes(activeTab)) &&
    m.originalName.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={query} onChange={setQuery} />
      <nav className="flex items-center">
        {FILTER_TABS.map(tab => {
          const count = tab.value === 'all' ? orderedMaps.length : orderedMaps.filter(m => m.tags.includes(tab.value)).length
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold transition-colors border-b-2 ${
                activeTab === tab.value
                  ? 'text-[var(--accent-cyan)] border-[var(--accent-cyan)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label} <span className="opacity-60">({count})</span>
            </button>
          )
        })}
      </nav>
      {isSaving && (
        <p className="text-xs text-[var(--text-muted)] text-right mb-1">{STATUS_SAVING_ORDER}</p>
      )}
      {filtered.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-6">{STATUS_NO_MAPS_FOUND}</p>
      ) : null}
      {filtered.map(map => {
        const orderedIndex = orderedMaps.indexOf(map)
        const expanded = expandedId === map.id
        const activeTag = MAP_TAGS.find(t => map.tags.includes(t)) ?? null
        const nextTag = activeTag === 'de_' ? 'cs_' : 'de_'

        return (
          <Card
            key={map.id}
            className={`mb-2 transition-shadow ${map.hidden ? 'border-amber-400 opacity-60' : ''}`}
          >
            {/* Row */}
            <div className="flex items-center gap-2 px-3 py-3">
              {/* Reorder */}
              <div className="flex flex-col shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); moveMap(orderedIndex, 'up') }}
                  disabled={orderedIndex === 0 || isSaving}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                  title={BTN_MOVE_UP}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); moveMap(orderedIndex, 'down') }}
                  disabled={orderedIndex === orderedMaps.length - 1 || isSaving}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                  title={BTN_MOVE_DOWN}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>

              {/* Clickable info area */}
              <button
                className="flex-1 flex items-center gap-3 min-w-0 text-left"
                onClick={() => setExpandedId(expanded ? null : map.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)] truncate">{map.originalName}.{map.format}</span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatBytes(map.size)} · {new Date(map.uploadedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · ⚙ {map.installCount}
                  </span>
                  {map.uploader && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {map.uploader.avatar && <img src={map.uploader.avatar} alt="" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />}
                      <span className="text-xs text-[var(--text-muted)]">by {map.uploader.name}</span>
                    </div>
                  )}
                </div>
                {activeTag && (
                  <span className="shrink-0 w-[8.5rem] text-center text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--accent-cyan)] text-black">
                    {TAG_SHORT[activeTag]}
                  </span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`shrink-0 text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
            </div>

            {/* Expanded edit panel */}
            {expanded && (
              <div className="border-t border-[var(--border)] px-3 py-3 flex flex-col gap-3">
                {/* Actions row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Tag toggle */}
                  <button
                    onClick={() => toggleTag(map, activeTag ? nextTag : 'de_')}
                    disabled={togglingTag === map.id}
                    title={TAG_LABELS[activeTag ?? 'de_']}
                    className={`w-[8.5rem] text-center text-xs font-mono px-2 py-1.5 rounded border transition-colors disabled:opacity-50 ${
                      activeTag
                        ? 'bg-[var(--accent-cyan)] text-black border-[var(--accent-cyan)]'
                        : 'bg-[var(--bg-inset)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent-cyan)]'
                    }`}
                  >
                    {togglingTag === map.id ? STATUS_ELLIPSIS : activeTag ? TAG_SHORT[activeTag] : 'No tag'}
                  </button>

                  {/* Show / Hide */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleHidden(map)}
                    disabled={togglingHidden === map.id}
                    className="flex items-center gap-1.5"
                  >
                    {map.hidden ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    )}
                    {togglingHidden === map.id ? STATUS_ELLIPSIS : map.hidden ? BTN_SHOW : BTN_HIDE}
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setPendingDelete(map)}
                    className="flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    {BTN_DELETE}
                  </Button>

                  {/* Daily pick */}
                  {currentPickId === map.id ? (
                    <span className="text-xs font-mono px-2 py-1.5 rounded border border-[var(--accent-cyan)] text-[var(--accent-cyan)]">
                      {BTN_TODAY_PICK}
                    </span>
                  ) : confirmingPickFor === map.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        Replace <span className="text-[var(--text-primary)]">{orderedMaps.find(m => m.id === currentPickId)?.originalName ?? 'current pick'}</span>?
                      </span>
                      <button
                        onClick={() => { setConfirmingPickFor(null); setSettingPickId(map.id); setPickCaption('') }}
                        className="text-xs font-mono px-2 py-1.5 rounded bg-[var(--accent-orange)] text-black hover:opacity-90"
                      >
                        {BTN_REPLACE_PICK}
                      </button>
                      <button
                        onClick={() => setConfirmingPickFor(null)}
                        className="text-xs font-mono px-2 py-1.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : settingPickId === map.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={pickCaption}
                        onChange={e => setPickCaption(e.target.value)}
                        placeholder={INFO_CAPTION_PLACEHOLDER}
                        maxLength={80}
                        className="text-xs font-mono px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-inset)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)] w-44"
                      />
                      <button
                        onClick={() => { void setAsPick(map.id) }}
                        disabled={savingPick}
                        className="text-xs font-mono px-2 py-1.5 rounded bg-[var(--accent-cyan)] text-black disabled:opacity-50"
                      >
                        {savingPick ? STATUS_ELLIPSIS : BTN_CONFIRM_PICK}
                      </button>
                      <button
                        onClick={() => { setSettingPickId(null); setPickCaption('') }}
                        className="text-xs font-mono px-2 py-1.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (currentPickId && currentPickId !== map.id) {
                          setConfirmingPickFor(map.id)
                        } else {
                          setSettingPickId(map.id)
                          setPickCaption('')
                        }
                      }}
                    >
                      {BTN_SET_AS_PICK}
                    </Button>
                  )}
                </div>

                {/* Screenshots */}
                <div>
                  <p className="text-xs font-mono text-[var(--text-muted)] mb-1.5">{LABEL_SCREENSHOTS} <span className="text-[var(--text-subtle)]">{INFO_SCREENSHOTS_UP_TO}</span></p>
                  <div className="flex gap-2 items-start">
                    {(map.screenshotKeys ?? []).map((url, i) => {
                      const delKey = `${map.id}-${i}`
                      return (
                        <div key={i} className="relative group w-24 shrink-0">
                          <img src={url} alt="" className="w-full h-16 object-cover rounded border border-[var(--border)]" />
                          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 group-hover:opacity-100 rounded transition-opacity">
                            <button
                              onClick={() => setPreviewUrl(url)}
                              className="w-8 h-8 flex items-center justify-center rounded-md bg-white/10 text-white hover:bg-[var(--accent-cyan)] hover:text-black transition-colors text-base"
                              title="Preview"
                            >
                              ⤢
                            </button>
                            <button
                              onClick={() => deleteScreenshot(map, i)}
                              disabled={deletingScreenshot === delKey}
                              className="w-8 h-8 flex items-center justify-center rounded-md bg-white/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-base disabled:opacity-50"
                              title="Remove"
                            >
                              {deletingScreenshot === delKey ? '…' : '✕'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {(map.screenshotKeys ?? []).length < 3 && (
                      <label className={`flex flex-col items-center justify-center h-16 px-3 border border-dashed border-[var(--border)] rounded transition-colors text-[var(--text-muted)] text-xs font-mono shrink-0 ${uploadingScreenshot === map.id ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:border-[var(--accent-cyan)]'}`}>
                        {uploadingScreenshot === map.id
                          ? <span className="flex items-center gap-1.5"><span className="animate-spin inline-block w-3 h-3 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full" />{STATUS_UPLOADING}</span>
                          : BTN_ADD_SCREENSHOT}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.length) {
                              void uploadScreenshots(map, e.target.files)
                              e.target.value = ''
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )
      })}

      {pendingDelete && (
        <ConfirmModal
          message={LABEL_DELETE_CONFIRM(pendingDelete.originalName)}
          confirmLabel="Delete"
          destructive
          onConfirm={() => confirmDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt="Screenshot preview"
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-xl font-bold hover:text-[var(--accent-cyan)] transition-colors"
            onClick={() => setPreviewUrl(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
