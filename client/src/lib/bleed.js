import { useEffect } from 'react'
import { getCompanion, logCompanion, setCompanion } from './companion.js'
import { rankItems, usePicksVersion } from './picks.js'

// The Bleed: news and opportunities. On the home page the Blot stretches edge to edge when something new has arrived, and folds back
// once she opens it or leaves. A breaking item stretches at once and stays until she opens it. Everyone sees the same list until she
// signs in and agrees to the use of her reading data (not built yet). The shelf is the same strip grown into a list of every item.
const SHOWN = 'cursive:bleed:seen:v1' // the strip has shown it (and she left)
const READ = 'cursive:bleed:read:v1' // she opened it
const read = (key) => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }
const mark = (key, id) => { try { localStorage.setItem(key, JSON.stringify({ ...read(key), [id]: true })) } catch { /* optional */ } }

export const readMap = () => read(READ)

const ARRIVE_MS = 1200 // a beat after the page settles, so the stretch is noticed; breaking news does not wait

let lastRaw = [] // the list as the server sent it, so turning the picks on or off can put it in order again
export async function loadBleedItems(signedIn = false) {
  try {
    const response = await fetch('/api/bleed', { credentials: 'include' })
    const { items } = response.ok ? await response.json() : { items: [] }
    lastRaw = items || []
    return rankItems(lastRaw, { signedIn })
  } catch { return [] }
}

// which item the strip shows: a breaking one she has not opened, else the newest she has not seen
export function pickForStrip(items) {
  const shown = read(SHOWN)
  const opened = read(READ)
  return items.find((entry) => entry.priority === 'breaking' && !opened[entry.id]) || items.find((entry) => !shown[entry.id] && !opened[entry.id]) || null
}

export function useBleed(enabled, signedIn = false) {
  const picks = usePicksVersion()
  // she turned the picks on or off while the strip is up: put the turning list in order again (the item showing now stays)
  useEffect(() => {
    const { bleed } = getCompanion()
    if (!enabled || !bleed) return
    setCompanion({ bleedItems: [bleed, ...rankItems(lastRaw, { signedIn }).filter((entry) => entry.id !== bleed.id)] })
  }, [picks])
  useEffect(() => {
    if (!enabled) return undefined
    let live = true
    let timer = 0
    let item = null
    let stretched = false
    loadBleedItems(signedIn).then((items) => {
      if (!live) return
      setCompanion({ bleedCount: items.length })
      item = pickForStrip(items)
      if (!item) return
      timer = setTimeout(() => {
        if (!live) return
        stretched = true
        // the strip shows the picked item first, then turns through the rest (see AssistiveTouch)
        setCompanion({ bleed: { ...item, more: Math.max(0, items.length - 1) }, bleedItems: [item, ...items.filter((entry) => entry.id !== item.id)] })
        logCompanion('bleed', { itemId: item.id, action: 'shown' })
      }, item.priority === 'breaking' ? 0 : ARRIVE_MS)
    })
    return () => {
      live = false
      clearTimeout(timer)
      // leaving folds it back. A normal item she saw does not come round again; a breaking one stays until she opens it,
      // and one she left before it showed comes round too
      if (item && stretched && item.priority !== 'breaking') mark(SHOWN, item.id)
      setCompanion({ bleed: null, bleedItems: [], bleedCount: 0 })
    }
  }, [enabled])
}

// a hold on the Blot: opens the strip when it is folded, folds it when it is open. Returns 'opened', 'closed', or null when there is nothing to show.
export function toggleBleed(signedIn = false) {
  const { bleed } = getCompanion()
  if (bleed) {
    setCompanion({ bleed: null, bleedItems: [], shelf: false })
    logCompanion('bleed', { itemId: bleed.id, action: 'held-closed' })
    return 'closed'
  }
  const items = rankItems(lastRaw, { signedIn })
  const item = pickForStrip(items) || items[0]
  if (!item) return null
  setCompanion({ bleed: { ...item, more: Math.max(0, items.length - 1) }, bleedItems: [item, ...items.filter((entry) => entry.id !== item.id)] })
  logCompanion('bleed', { itemId: item.id, action: 'held-open' })
  return 'opened'
}

// she opened an item: from the strip, or from a row of the shelf
export function openBleed(item) {
  mark(SHOWN, item.id)
  mark(READ, item.id)
  logCompanion('bleed', { itemId: item.id, action: 'opened' })
  setCompanion({ bleed: null, bleedItems: [] })
  if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer')
}

// an item without a link opens in place on the shelf: that counts as reading it
export function readBleed(item) {
  if (read(READ)[item.id]) return
  mark(SHOWN, item.id)
  mark(READ, item.id)
  logCompanion('bleed', { itemId: item.id, action: 'opened' })
}
