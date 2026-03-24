// SERVER-SIDE ONLY — uses Node.js crypto module. Do NOT import this in browser/client code.
// For client-side SHA-256, use crypto.subtle.digest (see install.ts browserSHA256).
import { createHash } from 'crypto'

export async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
  return createHash('sha256')
    .update(Buffer.from(buffer))
    .digest('hex')
}
