import { kvGet, kvSet } from './cursiveStore.js'
import { article5 } from './articles.js'

// What the reader did in article 5. `placement` is the title each middle moment holds now (m2 to m4); `opened` the markers
// she tapped; `revealed` once the fold has shown the middle titles; `filed` once she has filed. `events` is the raw log: tap, move and file, one row each, never edited.
const KEY = 'cursive:article:5:moves:v1'
export const MOVABLE = article5.moments.filter((m) => m.movable).map((m) => m.id)
export const startPlacement = () => Object.fromEntries(article5.moments.filter((m) => m.movable).map((m) => [m.id, m.title]))
const MAX_EVENTS = 300

export function normalizeMoves(value) {
  const start = startPlacement()
  const titles = Object.values(start)
  const stored = value?.placement
  // a placement is only kept if it is still the same three titles, once each
  const valid = stored && MOVABLE.every((id) => titles.includes(stored[id])) && new Set(MOVABLE.map((id) => stored[id])).size === titles.length
  const opened = {}
  for (const m of article5.moments) if (value?.opened?.[m.id] === true) opened[m.id] = true
  return {
    placement: valid ? Object.fromEntries(MOVABLE.map((id) => [id, stored[id]])) : start,
    opened,
    // the fold shows all three middle titles, and from then on they stay shown
    revealed: value?.revealed === true,
    filed: value?.filed === true,
    events: Array.isArray(value?.events) ? value.events.filter((e) => e && typeof e === 'object').slice(-MAX_EVENTS) : [],
  }
}

export function loadMoves() {
  try { return normalizeMoves(JSON.parse(kvGet(KEY))) } catch { return normalizeMoves(null) }
}

export function saveMoves(progress) {
  try { return kvSet(KEY, JSON.stringify(normalizeMoves(progress))) } catch { return false }
}
