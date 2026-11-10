import { loadReadingProgress } from './readingProgress.js'
import { loadCallProgress } from './callProgress.js'
import { kvGet } from './cursiveStore.js'

const hasReceipt = (key) => {
  try { return !!JSON.parse(kvGet(key))?.receipt } catch { return false }
}

const GAPS = 3

// 'ns' not started, 'ip' in progress, 'done' once the receipt exists; pct is how many of the three gaps are answered
export function articleStatus(articleNumber) {
  if (articleNumber === 1) {
    if (hasReceipt('cursive:article:1:receipt:v1')) return { status: 'done' }
    const { answers, visitedGaps } = loadReadingProgress(1)
    const answered = Object.keys(answers).length
    if (answered || Object.keys(visitedGaps).length) return { status: 'ip', pct: Math.round((answered / GAPS) * 100) }
  }
  if (articleNumber === 2) {
    if (hasReceipt('cursive:article:2:lift-receipt:v1')) return { status: 'done' }
    const { selectedIds, answers } = loadCallProgress()
    const placed = Object.keys(answers).length
    if (selectedIds.length || placed) return { status: 'ip', pct: Math.round((placed / GAPS) * 100) }
  }
  return { status: 'ns' }
}
