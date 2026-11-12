import { receiptsPdf } from './receiptImage.js'
import { generateNarrative, getCachedNarrative, narrativeRequest } from '../data/narrativeStorage.js'
import { getCachedReceipt, getReceiptQuestions } from '../data/receiptStorage.js'
import { getCachedLiftReceipt } from '../data/liftReceiptStorage.js'
import { loadCallProgress } from '../data/callProgress.js'
import { flushSaves, kvGet, kvSet } from '../data/cursiveStore.js'

const SENT_KEY = 'cursive:article:2:emailed:v1'

const toBase64 = async (blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

// Both receipts exist once the reader has finished both articles.
function bothReceipts() {
  try {
    return Boolean(getCachedReceipt(1, getReceiptQuestions(1)) && getCachedLiftReceipt(loadCallProgress()))
  } catch {
    return false
  }
}

// The combined receipt is the narrative receipt: one page that reads both games together. When there is too little
// to read (no question in the first story, or no marked line in the second), the two receipts are sent instead.
async function combinedPdf() {
  const request = narrativeRequest()
  if (request) {
    try {
      if (!getCachedNarrative(request)) await generateNarrative(request)
      await flushSaves() // the capture loads the page afresh, so the receipt must be in the account first
      return await receiptsPdf(['/receipt/narrative'])
    } catch (failure) {
      if (!/at least one question|can read/.test(failure.message)) throw failure
    }
  }
  return receiptsPdf(['/receipt', '/receipt/2'])
}

// Emails the combined PDF to the signed-in reader, once. Resolves { sent, email } or { sent: false } when nothing to do.
export async function emailCombinedReceipt() {
  if (kvGet(SENT_KEY)) return { sent: false }
  if (!bothReceipts()) return { sent: false }
  const response = await fetch('/api/me/combined-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ pdf: await toBase64(await combinedPdf()) }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || 'The combined receipt could not be sent.')
  kvSet(SENT_KEY, JSON.stringify({ at: Date.now() }))
  return { sent: true, email: body.email }
}
