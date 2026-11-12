import { kvGet, kvSet } from './cursiveStore.js'
import { getCachedReceipt, getReceiptQuestions } from './receiptStorage.js'
import { getCachedLiftReceipt } from './liftReceiptStorage.js'
import { loadCallProgress } from './callProgress.js'

// The narrative receipt reads both games together. It is built from the two receipts the reader already has.
const key = 'cursive:article:2:narrative:v1'
let pending = null

// what the server needs, or null until both receipts exist and there is a question and a marked line to read
export function narrativeRequest() {
  try {
    const first = getCachedReceipt(1, getReceiptQuestions(1))
    const progress = loadCallProgress()
    const second = getCachedLiftReceipt(progress)
    if (!first || !second) return null
    const readable = first.inquiries.some((item) => item.text?.trim() && !['skipped', 'unclear'].includes(item.outcome))
    if (!readable || !progress.selectedIds.length) return null
    return {
      questions: first.inquiries.map((item) => ({ id: item.id, text: item.text || '', label: item.label, outcome: item.outcome })),
      progress,
      summaries: { first: first.observations.join(' '), second: second.prose.join(' ') },
    }
  } catch {
    return null
  }
}

const fingerprint = (request) => JSON.stringify({ questions: request.questions, progress: request.progress })
const complete = (receipt) => receipt?.kind === 'narrative' && typeof receipt.reasoning === 'string' && receipt.drawing && receipt.together &&
  typeof receipt.confidence === 'string' && typeof receipt.closingQuestion === 'string'

export function getCachedNarrative(request = narrativeRequest()) {
  if (!request) return null
  try {
    const stored = JSON.parse(kvGet(key))
    if (stored?.fingerprint === fingerprint(request) && complete(stored.receipt)) return stored.receipt
  } catch { /* storage may be unavailable */ }
  return null
}

export function generateNarrative(request = narrativeRequest()) {
  if (!request) return Promise.reject(new Error('Finish both articles to get this receipt.'))
  if (pending) return pending
  pending = (async () => {
    const response = await fetch('/api/receipts/narrative', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request), signal: AbortSignal.timeout(130000),
    })
    let data
    try { data = await response.json() } catch { throw new Error('The receipt service is unavailable. Please retry.') }
    if (!response.ok) throw new Error(data.message || 'Could not write your combined receipt. Please retry.')
    if (!complete(data)) throw new Error('The receipt was incomplete. Please retry.')
    kvSet(key, JSON.stringify({ fingerprint: fingerprint(request), receipt: data }))
    return data
  })().finally(() => { pending = null })
  return pending
}
