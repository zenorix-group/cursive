import { kvGet, kvSet } from './cursiveStore.js'
import { loadHighlights } from './highlightProgress.js'

// The receipt for article 4 is written on the server from her mark, offer, keep and line rows, and cached with a fingerprint of them,
// so it is only written again if she goes back and changes something.
const key = 'cursive:article:4:highlights-receipt:v1'
const pending = new Map()

export const highlightsReceiptEvents = () => loadHighlights().events
  .filter((e) => ['mark', 'offer', 'keep', 'line'].includes(e.type))
  .map((e) => (e.type === 'mark' ? { type: 'mark', sentenceId: e.sentenceId, action: e.action }
    : e.type === 'offer' ? { type: 'offer', words: e.words }
    : e.type === 'keep' ? { type: 'keep', word: e.word, sentenceId: e.sentenceId, action: e.action }
    : { type: 'line', text: e.text, wordA: e.wordA, wordB: e.wordB }))

const valid = (r) => r?.kind === 'highlights' && Array.isArray(r.sections) && Array.isArray(r.infographic?.rows) && r.infographic.rows.length === 13 &&
  typeof r.confidence?.text === 'string'

export function getCachedHighlightsReceipt(events) {
  try {
    const stored = JSON.parse(kvGet(key))
    if (stored?.fingerprint === JSON.stringify(events) && valid(stored.receipt)) return stored.receipt
  } catch { /* the receipt can still be written again */ }
  return null
}

export function generateHighlightsReceipt(events) {
  const fingerprint = JSON.stringify(events)
  if (pending.has(fingerprint)) return pending.get(fingerprint)
  const request = (async () => {
    const response = await fetch('/api/receipts/highlights', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }), signal: AbortSignal.timeout(120000),
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
