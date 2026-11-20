import { kvGet, kvSet } from './cursiveStore.js'
import { SENTENCE_IDS, article4 } from './articles.js'

// What the reader did in article 4 (Hindsight Highlights). `marked` are the sentences marked now; `offered` the six words drawn from
// them at FILE; `kept` the (up to) two she keeps; `line` is what she wrote, exactly as typed (never corrected, trimmed or shortened).
// `events` is the raw log: mark, offer, keep, line, plus game and file, one row each, never edited and never deduplicated.
const KEY = 'cursive:article:4:highlights:v1'
export const MARKS_NEEDED = 2
export const WORDS_OFFERED = 6
export const WORDS_KEPT = 2

// a small seeded shuffle, so the six words keep their order for the reader across reloads
function seeded(text) {
  let h = 1779033703 ^ text.length
  for (let i = 0; i < text.length; i += 1) { h = Math.imul(h ^ text.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}
const shuffled = (items, random) => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]] }
  return out
}

// Six words drawn from the sentences she marked: nouns and verbs from the drawer, at most two from any one sentence, one from each
// sentence before a second from any, and fewer than six when the drawer runs out. Below two marked sentences nothing is offered.
export function drawWords(marked, seed) {
  const ids = SENTENCE_IDS.filter((id) => marked.includes(id))
  if (ids.length < MARKS_NEEDED) return []
  const random = seeded(`${seed}:${ids.join(',')}`)
  const taken = new Map()
  const chosen = []
  const used = new Set()
  for (let round = 0; round < 2 && chosen.length < WORDS_OFFERED; round += 1) {
    for (const id of shuffled(ids, random)) {
      if (chosen.length >= WORDS_OFFERED) break
      const word = article4.drawer[id].find((w) => !used.has(w.toLowerCase()) && !(taken.get(id) || []).includes(w))
      if (!word) continue
      used.add(word.toLowerCase())
      taken.set(id, [...(taken.get(id) || []), word])
      chosen.push({ word, sentenceId: id })
    }
  }
  return shuffled(chosen, random)
}

const isWord = (w) => w && typeof w.word === 'string' && SENTENCE_IDS.includes(w.sentenceId)

export function normalizeHighlights(value) {
  const marked = Array.isArray(value?.marked) ? SENTENCE_IDS.filter((id) => value.marked.includes(id)) : []
  const offered = Array.isArray(value?.offered) ? value.offered.filter(isWord).map(({ word, sentenceId }) => ({ word, sentenceId })).slice(0, WORDS_OFFERED) : []
  const kept = Array.isArray(value?.kept)
    ? value.kept.filter((k) => isWord(k) && offered.some((o) => o.word === k.word)).map(({ word, sentenceId }) => ({ word, sentenceId })).slice(0, WORDS_KEPT)
    : []
  return {
    game: value?.game === true,
    marked,
    filed: value?.filed === true,
    offered,
    kept,
    line: typeof value?.line === 'string' ? value.line : '',
    submitted: value?.submitted === true,
    events: Array.isArray(value?.events) ? value.events.filter((e) => e && typeof e === 'object') : [],
  }
}

export function loadHighlights() {
  try { return normalizeHighlights(JSON.parse(kvGet(KEY))) } catch { return normalizeHighlights(null) }
}

export function saveHighlights(progress) {
  try { return kvSet(KEY, JSON.stringify(normalizeHighlights(progress))) } catch { return false }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// a kept word counts as present in any inflected form: drawer satisfies drawers
export const hasWord = (text, word) => {
  const stem = esc(word.toLowerCase().replace(/(?<=.{3})s$/, ''))
  return text.toLowerCase().split(/[^\p{L}\p{N}’']+/u).some((token) => new RegExp(`^${stem}(s|es|ed|d|ing|’s|'s)?$`, 'u').test(token))
}
