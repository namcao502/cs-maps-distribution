export interface ExtractedFile {
  path: string      // relative path within archive (normalized, forward slashes)
  data: Uint8Array
}

export type ArchiveStructure =
  | 'game-root'     // archive root contains cstrike/
  | 'cs-subfolder'  // archive root contains maps/, models/, etc.
  | 'bare-files'    // archive root contains .bsp files directly
  | 'wrapped'       // single top-level folder wrapping the above
  | 'unknown'
