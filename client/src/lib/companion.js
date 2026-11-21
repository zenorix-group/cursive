import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'

// What the companion (the Blot in the corner) needs from the page, and what a tap on it does.
// A reading page reports its game with usePlaying(game) and hands over its filing with useFiling(articleId, file, setGame);
// the Blot reads the state with useCompanion() and asks tapRule() what a tap means right now (§3 of the companion document).
let state = { playing: false, swelled: false, first: false, articleId: null, sign: null, signKey: null, bleed: null }
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

export const useCompanion = () => useSyncExternalStore(subscribe, snapshot, snapshot)

// ----- records the companion sends: switch, swell, next. Kept in the browser until there is a server for them; never edited. -----
const EVENTS_KEY = 'cursive:companion:events:v1'
const FILED_KEY = 'cursive:companion:filed:v1'
const sessionId = `s${Date.now().toString(36)}`
let reader = null // her account id once she signs in; until then her session stands in
export const setReader = (id) => { reader = id }
let openedAt = typeof performance !== 'undefined' ? performance.now() : 0
let seq = null // continues from the stored records, so it counts every one across visits

export function logCompanion(type, data) {
  let all = []
  try { all = JSON.parse(localStorage.getItem(EVENTS_KEY)) || [] } catch { /* storage can be unavailable */ }
  if (seq === null) seq = all.reduce((top, entry) => Math.max(top, Number(entry.seq) + 1 || 0), 0)
  const row = { sessionId, readerId: reader || sessionId, type, ...data, ms: Math.round(performance.now() - openedAt), seq: seq++ }
  try { localStorage.setItem(EVENTS_KEY, JSON.stringify([...all, row].slice(-400))) } catch { /* optional */ }
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
