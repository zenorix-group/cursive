import { kvGet, kvSet } from './cursiveStore.js'
import { article6 } from './articles.js'

// What the reader did in article 6. `cups` holds where each of the four cups is now (a seat id, or null while it is among the
// four); `game` is whether the game is on; `seen` whether she has shown the seats. `events` is the raw log: game, seats, cup,
// back and file, one row each, never edited.
const KEY = 'cursive:article:6:cups:v1'
export const SEAT_IDS = article6.seats.map((s) => s.id)
const MAX_EVENTS = 400

export function normalizeCups(value) {
  const cups = [0, 1, 2, 3].map((i) => (SEAT_IDS.includes(value?.cups?.[i]) ? value.cups[i] : null))
  return {
    cups,
    game: value?.game === true,
    seen: value?.seen === true,
    filed: value?.filed === true,
    events: Array.isArray(value?.events) ? value.events.filter((e) => e && typeof e === 'object').slice(-MAX_EVENTS) : [],
  }
}

export function loadCups() {
  try { return normalizeCups(JSON.parse(kvGet(KEY))) } catch { return normalizeCups(null) }
}

export function saveCups(progress) {
  try { return kvSet(KEY, JSON.stringify(normalizeCups(progress))) } catch { return false }
}
