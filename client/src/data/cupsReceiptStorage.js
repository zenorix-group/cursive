import { kvGet, kvSet } from './cursiveStore.js'
import { loadCups } from './cupProgress.js'

// The receipt for article 6 is written on the server from her game, cup and back records, and cached with a fingerprint of
// them, so it is only written again if she goes back and changes something.
const key = 'cursive:article:6:receipt:v1'
const pending = new Map()

export const cupsReceiptEvents = () => loadCups().events
  .filter((e) => e.type === 'game' || e.type === 'cup' || e.type === 'back')
  .map((e) => (e.type === 'game' ? { type: 'game', on: e.on } : { type: e.type, seatId: e.seatId, reached: e.reached, ms: e.ms }))

const valid = (r) => r?.kind === 'cups' && Array.isArray(r.reading) && Array.isArray(r.seats) && typeof r.tree === 'string' &&
  Array.isArray(r.questions) && Array.isArray(r.drawing?.lines)

export function getCachedCupsReceipt(events) {
  try {
    const stored = JSON.parse(kvGet(key))
    if (stored?.fingerprint === JSON.stringify(events) && valid(stored.receipt)) return stored.receipt
  } catch { /* the receipt can still be written again */ }
  return null
}

export function generateCupsReceipt(events) {
  const fingerprint = JSON.stringify(events)
  if (pending.has(fingerprint)) return pending.get(fingerprint)
  const request = (async () => {
    const response = await fetch('/api/receipts/cups', {
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
