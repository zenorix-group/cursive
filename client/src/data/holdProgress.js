import { kvGet, kvSet } from './cursiveStore.js'

// What the reader did in article 3. `holds` is each hold's last result (the one the receipt reads);
// `events` is the raw log for engineering: press, release, end, tap, interrupt, one row each, never edited.
const KEY = 'cursive:article:3:holds:v1'
export const HOLD_IDS = ['h1', 'h2', 'h3']
const MAX_EVENTS = 300

export function normalizeHolds(value) {
  const holds = {}
  for (const id of HOLD_IDS) {
    const hold = value?.holds?.[id]
    if ((hold?.action === 'release' || hold?.action === 'end') && Number.isInteger(hold.week) && hold.week >= 0) {
      holds[id] = { action: hold.action, week: hold.week }
    }
  }
  const events = Array.isArray(value?.events) ? value.events.filter((e) => e && typeof e === 'object').slice(-MAX_EVENTS) : []
  return { holds, events }
}

export function loadHoldProgress() {
  try { return normalizeHolds(JSON.parse(kvGet(KEY))) } catch { return { holds: {}, events: [] } }
}

export function saveHoldProgress(progress) {
  try { return kvSet(KEY, JSON.stringify(normalizeHolds(progress))) } catch { return false }
}
