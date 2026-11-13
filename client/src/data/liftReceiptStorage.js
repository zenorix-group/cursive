import { kvGet, kvSet } from './cursiveStore.js'
import { normalizeCallProgress } from './callProgress.js'

const key = 'cursive:article:2:lift-receipt:v1'
const pending = new Map()
const fingerprint = (progress) => {
  const normalized = normalizeCallProgress(progress)
  return JSON.stringify({ selectedIds: [...normalized.selectedIds].sort((a, b) => a - b), answers: normalized.answers })
}

export function getCachedLiftReceipt(progress) {
  try {
    const stored = JSON.parse(kvGet(key))
    if (stored?.fingerprint === fingerprint(progress) && stored.receipt?.kind === 'lift' &&
        Array.isArray(stored.receipt.prose) && Array.isArray(stored.receipt.placements) && stored.receipt.placements.length === 3 &&
        Array.isArray(stored.receipt.kept) && typeof stored.receipt.confidence === 'string') return stored.receipt
  } catch { /* Reading still works when storage is unavailable. */ }
  return null
}

export function generateLiftReceipt(progress) {
  const signature = fingerprint(progress)
  if (pending.has(signature)) return pending.get(signature)
  const request = (async () => {
    const response = await fetch('/api/receipts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleNumber: 2, progress: normalizeCallProgress(progress) }),
      signal: AbortSignal.timeout(120000),
    })
    let data
    try { data = await response.json() } catch { throw new Error('The receipt service is unavailable. Please start the server and retry.') }
    if (!response.ok) throw new Error(data.message || 'Could not generate your reading receipt. Please retry.')
    if (data.kind !== 'lift' || !Array.isArray(data.prose) || !Array.isArray(data.placements) || data.placements.length !== 3 || !Array.isArray(data.kept)) {
      throw new Error('The receipt was incomplete. Please retry.')
    }
    try { kvSet(key, JSON.stringify({ fingerprint: signature, receipt: data })) } catch { /* Keep displaying the generated receipt. */ }
    return data
  })().finally(() => pending.delete(signature))
  pending.set(signature, request)
  return request
}
