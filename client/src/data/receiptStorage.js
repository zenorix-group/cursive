import { loadReadingProgress } from './readingProgress.js'
import { receiptTargets } from './receiptReferences.js'

export function getReceiptQuestions(articleNumber) {
  const { answers, visitedGaps } = loadReadingProgress(articleNumber)
  return receiptTargets.map(({ id, gapId }) => ({ id, text: answers[gapId] || '', visited: !!visitedGaps[gapId] }))
}

const key = (articleNumber) => `cursive:article:${articleNumber}:receipt:v1`
const pending = new Map()

export function getCachedReceipt(articleNumber, questions) {
  try {
    const stored = JSON.parse(localStorage.getItem(key(articleNumber)))
    if (stored?.fingerprint === JSON.stringify(questions) && Array.isArray(stored.receipt?.inquiries) &&
        stored.receipt.inquiries.length === 3 && Array.isArray(stored.receipt.observations) && Array.isArray(stored.receipt.openFiles)) {
      return stored.receipt
    }
  } catch { /* Storage may be unavailable. */ }
  return null
}

export function generateReceipt(articleNumber, questions) {
  const fingerprint = JSON.stringify({ articleNumber, questions })
  if (pending.has(fingerprint)) return pending.get(fingerprint)
  const request = (async () => {
    const response = await fetch('/api/receipts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleNumber, questions }), signal: AbortSignal.timeout(70000),
    })
    let data
    try { data = await response.json() } catch { throw new Error('The receipt service is unavailable. Start the server and try again.') }
    if (!response.ok) throw new Error(data.message || 'Could not generate your receipt. Please retry.')
    if (!Array.isArray(data.inquiries) || data.inquiries.length !== 3 || !Array.isArray(data.observations) || !Array.isArray(data.openFiles)) {
      throw new Error('The receipt was incomplete. Please retry.')
    }
    try {
      localStorage.setItem(key(articleNumber), JSON.stringify({ fingerprint: JSON.stringify(questions), receipt: data }))
    } catch { /* A receipt can still be read without browser storage. */ }
    return data
  })().finally(() => pending.delete(fingerprint))
  pending.set(fingerprint, request)
  return request
}
