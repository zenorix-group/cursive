import { kvGet, kvSet } from './cursiveStore.js'
import { loadHoldProgress } from './holdProgress.js'

// The receipt for article 3 is written on the server from the holds she played. It is cached with a fingerprint of those holds,
// so it is only written again if she goes back and plays one.
const key = 'cursive:article:3:receipt:v1'
const pending = new Map()

// only each hold's last release or end matters; taps, interruptions and timings do not
export const receiptHolds = () => loadHoldProgress().holds

const valid = (receipt) => receipt?.kind === 'hold' && typeof receipt.habitText === 'string' && Array.isArray(receipt.stories) &&
  receipt.stories.length === 3 && Array.isArray(receipt.marks) && Array.isArray(receipt.questions)

export function getCachedHoldReceipt(holds) {
  try {
    const stored = JSON.parse(kvGet(key))
    if (stored?.fingerprint === JSON.stringify(holds) && valid(stored.receipt)) return stored.receipt
  } catch { /* the receipt can still be written again */ }
  return null
}

export function generateHoldReceipt(holds) {
  const fingerprint = JSON.stringify(holds)
  if (pending.has(fingerprint)) return pending.get(fingerprint)
  const request = (async () => {
    const response = await fetch('/api/receipts/hold', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holds }), signal: AbortSignal.timeout(30000),
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
