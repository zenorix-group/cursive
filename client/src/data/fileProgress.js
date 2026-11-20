import { kvGet, kvSet } from './cursiveStore.js'

// What the reader did in article 7. `notes` are her two notes exactly as typed (never corrected, trimmed or shortened); `game` is
// whether the game is on. `events` is the raw log: game, note and file, one row each, never edited.
const KEY = 'cursive:article:7:files:v1'
export const MAX_WORDS = 12

// a field takes no thirteenth word: text past the twelfth word is cut there, and everything before it stays exactly as typed
export function limitWords(text) {
  const cut = /^(\s*\S+){12}/.exec(text)
  return cut && text.slice(cut[0].length).trim() ? cut[0] : text
}
export const countWords = (text) => text.split(/\s+/).filter(Boolean).length

export function normalizeFiles(value) {
  const note = (t) => (typeof t === 'string' ? limitWords(t.slice(0, 400)) : '')
  return {
    notes: { hotel: note(value?.notes?.hotel), bureau: note(value?.notes?.bureau) },
    game: value?.game === true,
    filed: value?.filed === true,
    events: Array.isArray(value?.events) ? value.events.filter((e) => e && typeof e === 'object') : [],
  }
}

export function loadFiles() {
  try { return normalizeFiles(JSON.parse(kvGet(KEY))) } catch { return normalizeFiles(null) }
}

export function saveFiles(progress) {
  try { return kvSet(KEY, JSON.stringify(normalizeFiles(progress))) } catch { return false }
}
