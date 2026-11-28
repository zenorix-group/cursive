import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { STACKS } from '../data/stacks.js'
import { ISSUE_ID, ISSUE_NEEDED, VAULT_RECEIPT_ON, issueCount } from '../data/issue.js'
import { logCompanion, setCompanion } from './companion.js'

// The Blot's signs. One waits at a time. Only the second drop (a stack's narrative receipt is ready) is built so far;
// the show-through (the vault receipt) joins when the issue is.
const KEY = 'cursive:companion:signs:v1'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const write = (value) => { try { localStorage.setItem(KEY, JSON.stringify(value)) } catch { /* optional */ } }

const LINES = {
  narrative: 'A second drop: your two receipts are ready to read together. Tap it.',
  vault: 'Print shows through from behind: your issue is ready to read through a lens. Tap to turn the page.',
}

// the sign waiting for her now, or null: a stack whose articles both count and whose narrative she has not opened
export function waitingSign() {
  const saved = read()
  for (const stack of STACKS) {
    if (!stack.narrative || saved.opened?.[`narrative:${stack.id}`]) continue
    let ready = false
    try { ready = stack.narrative.ready() } catch { ready = false }
    // a development switch to see the sign without writing two receipts first; stripped from production builds
    if (import.meta.env.DEV && localStorage.getItem('cursive:dev:sign') === stack.id) ready = true
    if (ready) return { kind: 'narrative', id: stack.id, path: stack.narrative.path, line: LINES.narrative, first: !saved.shown?.narrative }
  }
  // one sign waits at a time: the show-through follows once the narrative has been opened
  if (VAULT_RECEIPT_ON && !saved.opened?.[`vault:${ISSUE_ID}`]) {
    let ready = false
    try { ready = issueCount() >= ISSUE_NEEDED } catch { ready = false }
    if (import.meta.env.DEV && localStorage.getItem('cursive:dev:sign') === 'vault') ready = true
    if (ready) return { kind: 'vault', id: ISSUE_ID, line: LINES.vault, first: !saved.shown?.vault }
  }
  return null
}

// called when the Blot actually draws a sign: the first time, it is recorded and its first-time line is used up
export function markSignShown(sign) {
  const key = `${sign.kind}:${sign.id}`
  const saved = read()
  if (saved.shownIds?.[key]) return
  write({ ...saved, shown: { ...saved.shown, [sign.kind]: true }, shownIds: { ...saved.shownIds, [key]: true } })
  logCompanion('sign', { kind: sign.kind, id: sign.id, action: 'shown' })
}

export function openSign(sign) {
  const saved = read()
  write({ ...saved, opened: { ...saved.opened, [`${sign.kind}:${sign.id}`]: true } })
  logCompanion('sign', { kind: sign.kind, id: sign.id, action: 'opened' })
  setCompanion({ sign: null })
}

// keeps the store's sign current as she moves between pages; the first time one appears it is recorded and explains itself
export function useWaitingSign(enabled) {
  const { pathname } = useLocation()
  useEffect(() => {
    const sign = enabled ? waitingSign() : null
    const current = sign ? `${sign.kind}:${sign.id}` : null
    setCompanion({ sign, signKey: current })
  }, [pathname, enabled])
}
