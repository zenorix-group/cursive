import { loadReadingProgress } from '../data/readingProgress.js'
import { loadCallProgress } from '../data/callProgress.js'
import { haptic } from './haptics.js'
import { kvGet, kvSet } from '../data/cursiveStore.js'

// "Overture" is the floating button: where saved things go. Pages talk to it through one window event,
// so they never need to know where it is on screen.
const reduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const buttonEl = () => document.querySelector('.at__button')

// something was saved: fly a small chip from `fromEl` into the overture, then let it react
export function absorb(kind, fromEl) {
  const rect = fromEl?.getBoundingClientRect()
  window.dispatchEvent(new CustomEvent('overture:absorb', { detail: { kind, rect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null } }))
}

// While a receipt is being put away the page swap is shortened (see PageTransition), so nothing blank shows between the two pages.
let handoffUntil = 0
export const isHandoff = () => Date.now() < handoffUntil

// a receipt was read and put away: it shrinks toward the overture like a genie, the overture takes it in, and the next
// page starts to appear while the last of it is still going, so there is no empty moment in between
export function storeIntoOverture(el, articleNumber) {
  markReceiptStored(articleNumber)
  const btn = buttonEl()
  const absorbNow = () => window.dispatchEvent(new CustomEvent('overture:absorb', { detail: { kind: 'receipt', rect: null } }))
  if (!el || !btn || reduce() || typeof el.animate !== 'function') {
    absorbNow()
    return Promise.resolve()
  }
  const to = btn.getBoundingClientRect()
  const from = el.getBoundingClientRect()
  const cx = to.left + to.width / 2 - from.left
  const cy = to.top + to.height / 2 - from.top
  const DURATION = 560
  el.style.transformOrigin = `${cx}px ${cy}px`
  el.style.willChange = 'transform, opacity'
  el.style.pointerEvents = 'none'
  haptic(6)
  // transform and opacity only: a blur on a page-sized element repaints badly and can flash blank
  el.animate(
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.7)', opacity: 0.95, offset: 0.4 },
      { transform: 'scale(0.05)', opacity: 0 },
    ],
    { duration: DURATION, easing: 'cubic-bezier(0.55, 0, 0.3, 1)', fill: 'forwards' },
  )
  setTimeout(absorbNow, DURATION * 0.72)
  return new Promise((resolve) => {
    setTimeout(() => {
      handoffUntil = Date.now() + 1600
      resolve()
    }, DURATION * 0.9)
  })
}

// ---- which receipts exist ----
// whether a receipt has been put away goes through the same store as the rest of the reading:
// the browser when signed out, the reader's MongoDB account when signed in (never both)
const storedKey = (n) => `cursive:article:${n}:stored:v1`
const isStored = (n) => {
  try { return Boolean(JSON.parse(kvGet(storedKey(n)))?.at) } catch { return false }
}
export function markReceiptStored(n) {
  if (!n) return
  kvSet(storedKey(n), JSON.stringify({ at: Date.now() }))
}

// 'stored' once the reader has put it away, 'ready' when there are answers to make one from, otherwise 'empty'
export function receiptStatus(n) {
  if (isStored(n)) return 'stored'
  const hasAnswers = n === 2
    ? Object.keys(loadCallProgress().answers).length > 0
    : Object.values(loadReadingProgress(1).answers).some((text) => typeof text === 'string' && text.trim())
  return hasAnswers ? 'ready' : 'empty'
}
