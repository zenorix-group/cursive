import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'

// What the companion (the Blot in the corner) needs from the page, and what a tap on it does.
// A reading page reports its game with usePlaying(game) and hands over its filing with useFiling(articleId, file, setGame);
// the Blot reads the state with useCompanion() and asks tapRule() what a tap means right now (§3 of the companion document).
let state = { playing: false, swelled: false, first: false, articleId: null, sign: null, signKey: null, bleed: null, bleedItems: [], bleedCount: 0, shelf: false }
let controls = { file: null, setGame: null, settled: false }
let where = null // who is flipping the game switch: the companion's own tap, or the image's switch (the default)
const listeners = new Set()

const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener) }
const snapshot = () => state

export function setCompanion(patch) {
  const next = { ...state, ...patch }
  // a sign is compared by its key, so a fresh object for the same sign does not wake every listener
  if (Object.keys(patch).every((key) => (key === 'sign' ? next.sign?.id === state.sign?.id && next.sign?.kind === state.sign?.kind : next[key] === state[key]))) return
  state = next
  listeners.forEach((listener) => listener())
}

export const getCompanion = () => state
export const useCompanion = () => useSyncExternalStore(subscribe, snapshot, snapshot)

// ----- records the companion sends: switch, swell, next. Kept in the browser until there is a server for them; never edited. -----
const EVENTS_KEY = 'cursive:companion:events:v1'
const FILED_KEY = 'cursive:companion:filed:v1'
const sessionId = `s${Date.now().toString(36)}`
let reader = null // her account id once she signs in; until then her session stands in
export const setReader = (id) => {
  const signedIn = Boolean(id) && id !== reader
  reader = id
  // she has just signed in: send this session's records again with her account, so the server ties them (and the ones before) to her
  if (signedIn) flushCompanion(true)
}
let openedAt = typeof performance !== 'undefined' ? performance.now() : 0
let seq = null // continues from the stored records, so it counts every one across visits

export function logCompanion(type, data) {
  let all = []
  try { all = JSON.parse(localStorage.getItem(EVENTS_KEY)) || [] } catch { /* storage can be unavailable */ }
  if (seq === null) seq = all.reduce((top, entry) => Math.max(top, Number(entry.seq) + 1 || 0), 0)
  const row = { sessionId, readerId: reader || sessionId, type, ...data, ms: Math.round(performance.now() - openedAt), seq: seq++ }
  try { localStorage.setItem(EVENTS_KEY, JSON.stringify([...all, row].slice(-400))) } catch { /* optional */ }
  clearTimeout(flushTimer)
  flushTimer = setTimeout(() => flushCompanion(), 4000)
}

// ----- sending the records to the server. The browser keeps its copy; a record is sent until the server says it has it. -----
const SENT_KEY = 'cursive:companion:sent:v1'
let flushTimer = null
let flushing = false
const readSent = () => { try { return Number(localStorage.getItem(SENT_KEY)) || 0 } catch { return 0 } }

// join: also send this session's records that went before, so the server can tie them to her account
export async function flushCompanion(join = false) {
  if (flushing || typeof fetch !== 'function') return
  let all = []
  try { all = JSON.parse(localStorage.getItem(EVENTS_KEY)) || [] } catch { return }
  const sent = readSent()
  const events = all.filter((row) => Number(row.seq) >= sent || (join && row.sessionId === sessionId)).slice(-200)
  if (!events.length) return
  flushing = true
  try {
    const response = await fetch('/api/companion/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: true,
      body: JSON.stringify({ events }),
    })
    if (response.ok) {
      const top = events.reduce((max, row) => Math.max(max, Number(row.seq) + 1 || 0), 0)
      try { localStorage.setItem(SENT_KEY, String(Math.max(sent, top))) } catch { /* optional */ }
    }
  } catch { /* offline: the records stay and go with the next one */ } finally { flushing = false }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushCompanion() })
}

const filedBefore = () => { try { return localStorage.getItem(FILED_KEY) === '1' } catch { return false } }
const markFiled = () => { try { localStorage.setItem(FILED_KEY, '1') } catch { /* optional */ } }

// ----- the tap (§3). The rows are checked in order and the first that fits decides. Signs and the Margin join in later. -----
// 'switch'  no drop, in an article: the game goes on and a drop falls in
// 'overture' the article is done and the Blot has swollen: File now
// 'ripple'  a drop in her first article: the drop ripples and nothing more
// 'early'   a drop in any later article: files early
export function tapRule() {
  // the first row: a waiting sign opens what is waiting, on any page
  if (state.bleed) return 'bleed'
  if (state.sign) return 'sign'
  if (!controls.file) return null
  if (!state.playing) return 'switch'
  if (state.swelled) return 'overture'
  if (state.first || controls.settled) return 'ripple'
  return 'early'
}

export const SIGN_LABEL = { narrative: 'Open your narrative receipt', vault: 'Turn the page to your vault receipt' }
export const TAP_LABEL = { sign: 'Open your narrative receipt', switch: 'Play the game', overture: 'File now', ripple: 'Game is on, keep reading', early: 'File early' }

// does the tap; returns what it did so the Blot can react (a ripple, a haptic)
export function doTap() {
  const rule = tapRule()
  if (rule === 'switch') {
    where = 'companion'
    controls.setGame?.(true)
  } else if (rule === 'overture' || rule === 'early') {
    const from = rule === 'overture' ? 'overture' : 'early'
    markFiled()
    controls.file?.(from)
    setCompanion({ swelled: false })
  }
  return rule
}

// called by a reading page: true while its game is on; clears when the page goes away
export function usePlaying(game) {
  const before = useRef(null)
  useEffect(() => {
    setCompanion({ playing: Boolean(game), swelled: game ? state.swelled : false })
    if (before.current !== null && before.current !== Boolean(game)) {
      logCompanion('switch', { articleId: state.articleId, on: Boolean(game), where: where ?? 'image' })
    }
    where = null
    before.current = Boolean(game)
  }, [game])
  // leaving the page clears it; flipping the switch does not, so a swell she has earned is not lost to a double flip
  useEffect(() => () => setCompanion({ playing: false, swelled: false }), [])
}

// called by a reading page that files: hands over its filing, and watches for the last paragraph. The page's own File button
// gives way to this (the Overture); a reader who never plays gets a plain Next article instead.
// settled: the page's own filing is already under way (article 4's words stage), so a tap has nothing left to file
export function useFiling(articleId, file, setGame, settled = false) {
  const { playing } = useCompanion()
  // kept current after every render, so a tap always reaches the page's latest filing
  useEffect(() => { controls = { file, setGame, settled } })
  useEffect(() => {
    openedAt = performance.now()
    setCompanion({ articleId, first: !filedBefore(), swelled: false })
    return () => { controls = { file: null, setGame: null, settled: false }; setCompanion({ articleId: null, swelled: false }) }
  }, [articleId])
  // the Blot swells once the last paragraph has come up the page, and stays swollen until she files or leaves
  useEffect(() => {
    if (!playing) return undefined
    const end = document.querySelector('.read__actions')
    if (!end || typeof IntersectionObserver !== 'function') return undefined
    const watch = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      watch.disconnect()
      if (!state.swelled) {
        setCompanion({ swelled: true })
        logCompanion('swell', { articleId, first: state.first })
      }
    }, { threshold: 0 })
    watch.observe(end)
    return () => watch.disconnect()
  }, [playing, articleId])
}

// where a reader who never played goes on to: no receipt, just the next thing
export function usePlainNext() {
  const { user } = useAuth()
  return user ? '/reading-room' : '/login#create'
}
