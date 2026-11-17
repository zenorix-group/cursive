import { kvGet, kvSet } from './cursiveStore.js'
import { loadMoves } from './moveProgress.js'

// The receipt for article 5 is written on the server from her tap and move records. It is cached with a fingerprint of those
// records, so it is only written again if she goes back and moves something.
const key = 'cursive:article:5:receipt:v1'
const pending = new Map()

// only the tap and move records matter; the file record and timings do not
export const receiptEvents = () => loadMoves().events
  .filter((e) => e.type === 'tap' || e.type === 'move')
  .map((e) => (e.type === 'tap' ? { type: 'tap', momentId: e.momentId } : { type: 'move', from: e.from, to: e.to }))

const valid = (receipt) => receipt?.kind === 'rearrange' && Array.isArray(receipt.reading) && Array.isArray(receipt.moments) &&
  receipt.moments.length === 3 && Array.isArray(receipt.ending) && Array.isArray(receipt.questions) && Array.isArray(receipt.drawing?.lines)

export function getCachedRearrangeReceipt(events) {
  try {
    const stored = JSON.parse(kvGet(key))
    if (stored?.fingerprint === JSON.stringify(events) && valid(stored.receipt)) return stored.receipt
  } catch { /* the receipt can still be written again */ }
  return null
}

export function generateRearrangeReceipt(events) {
  const fingerprint = JSON.stringify(events)
  if (pending.has(fingerprint)) return pending.get(fingerprint)
  const request = (async () => {
    const response = await fetch('/api/receipts/rearrange', {
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
