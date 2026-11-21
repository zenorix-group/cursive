import { useEffect } from 'react'
import { logCompanion, setCompanion } from './companion.js'

// The Bleed: on the homepage the Blot stretches edge to edge when something new has arrived, and folds back once she opens it or
// leaves. Everyone sees the same items until she signs in and agrees to the use of her reading data (not built yet).
const SEEN = 'cursive:bleed:seen:v1'
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN)) || {} } catch { return {} } }
const markSeen = (id) => { try { localStorage.setItem(SEEN, JSON.stringify({ ...readSeen(), [id]: true })) } catch { /* optional */ } }

const ARRIVE_MS = 1200 // a beat after the page settles, so the stretch is noticed

export function useBleed(enabled) {
  useEffect(() => {
    if (!enabled) return undefined
    let live = true
    let timer = 0
    let item = null
    let stretched = false
    fetch('/api/bleed', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(({ items }) => {
        if (!live) return
        const seen = readSeen()
        item = (items || []).find((entry) => !seen[entry.id]) || null
        if (!item) return
        timer = setTimeout(() => {
          if (!live) return
          stretched = true
          setCompanion({ bleed: item })
          logCompanion('bleed', { itemId: item.id, action: 'shown' })
        }, ARRIVE_MS)
      })
      .catch(() => { /* the Bleed is optional: no item, no stretch */ })
    return () => {
      live = false
      clearTimeout(timer)
      // leaving folds it back, and an item she saw does not come round again; one she left before it showed does
      if (item && stretched) markSeen(item.id)
      setCompanion({ bleed: null })
    }
  }, [enabled])
}

export function openBleed(item) {
  markSeen(item.id)
  logCompanion('bleed', { itemId: item.id, action: 'opened' })
  setCompanion({ bleed: null })
  if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer')
}
