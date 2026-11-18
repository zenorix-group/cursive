import { kvGet, kvSet } from './cursiveStore.js'
import { loadFiles } from './fileProgress.js'

// The receipt for article 7 is written on the server from her game, note and file records, and cached with a fingerprint of them,
// so it is only written again if she goes back and changes a note.
const key = 'cursive:article:7:receipt:v1'
const pending = new Map()

export const filesReceiptEvents = () => loadFiles().events
  .filter((e) => e.type === 'game' || e.type === 'note' || e.type === 'file')
  .map((e) => (e.type === 'game' ? { type: 'game', on: e.on }
    : e.type === 'note' ? { type: 'note', file: e.file, text: e.text, reached: e.reached }
    : { type: 'file', hotel: e.hotel, bureau: e.bureau, reached: e.reached }))

const valid = (r) => r?.kind === 'files' && Array.isArray(r.reading) && Array.isArray(r.files) && r.files.length === 2 &&
  Array.isArray(r.questions) && Array.isArray(r.drawing?.cells)

export function getCachedFilesReceipt(events) {
  try {
    const stored = JSON.parse(kvGet(key))
    if (stored?.fingerprint === JSON.stringify(events) && valid(stored.receipt)) return stored.receipt
  } catch { /* the receipt can still be written again */ }
  return null
}

export function generateFilesReceipt(events) {
  const fingerprint = JSON.stringify(events)
  if (pending.has(fingerprint)) return pending.get(fingerprint)
  const request = (async () => {
    const response = await fetch('/api/receipts/files', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }), signal: AbortSignal.timeout(30000),
    })
    let data
    try { data = await response.json() } catch { throw new Error('The receipt service is unavailable. Please start the server and retry.') }
    if (!response.ok) throw new Error(data.message || 'Could not write your receipt. Please retry.')
    if (!valid(data)) throw new Error('The receipt was incomplete. Please retry.')
    try { kvSet(key, JSON.stringify({ fingerprint, receipt: data })) } catch { /* keep showing the receipt */ }
    return data
  })().finally(() => pending.delete(fingerprint))
  pending.set(fingerprint, request)
  return request
}
