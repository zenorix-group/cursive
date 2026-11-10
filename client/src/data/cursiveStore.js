// Where a reader's saved reading lives.
//
//   Signed out: this browser's localStorage, so a guest can read the first article and see a receipt.
//   Signed in:  the reader's account in MongoDB. The page keeps a copy in memory and writes every change
//               through to the server. Nothing is written to localStorage while signed in, and whatever
//               a guest had saved is moved into the account (and removed from the browser) at sign in.
//
// Keys look like `cursive:article:<number>:<kind>:v1`, the same ones the storage modules have always used,
// so they map straight onto the server's article records.

const KEY = /^cursive:article:(\d+):([a-z-]+):v1$/
const WRITE_DELAY_MS = 500
const RETRY_DELAY_MS = 5000
const MAX_RETRIES = 5

let signedIn = false
const memory = new Map()
const timers = new Map()
const tries = new Map()

const jsonHeaders = { 'Content-Type': 'application/json' }

function recordUrl(key) {
  const match = KEY.exec(key)
  return match ? `/api/me/records/${match[1]}/${match[2]}` : null
}

async function send(key, { keepalive = false } = {}) {
  const url = recordUrl(key)
  const value = memory.get(key)
  if (!url || value === undefined) return
  const response = await fetch(url, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({ data: JSON.parse(value) }),
    credentials: 'same-origin',
    keepalive,
  })
  if (!response.ok) throw new Error(`Saving failed (${response.status})`)
}

function schedule(key, delay = WRITE_DELAY_MS) {
  clearTimeout(timers.get(key))
  timers.set(key, setTimeout(async () => {
    timers.delete(key)
    try {
      await send(key)
      tries.delete(key)
    } catch {
      const attempt = (tries.get(key) || 0) + 1
      tries.set(key, attempt)
      if (signedIn && attempt <= MAX_RETRIES) schedule(key, RETRY_DELAY_MS)
    }
  }, delay))
}

// push anything still waiting, e.g. when the tab is closed or the reader signs out
export async function flushSaves({ keepalive = false } = {}) {
  const waiting = [...timers.keys()]
  waiting.forEach((key) => clearTimeout(timers.get(key)))
  timers.clear()
  await Promise.allSettled(waiting.map((key) => send(key, { keepalive })))
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { if (signedIn) flushSaves({ keepalive: true }) })
  document.addEventListener('visibilitychange', () => {
    if (signedIn && document.visibilityState === 'hidden') flushSaves({ keepalive: true })
  })
}

export function kvGet(key) {
  if (signedIn) return memory.get(key) ?? null
  try { return localStorage.getItem(key) } catch { return null }
}

export function kvSet(key, value) {
  if (signedIn) {
    memory.set(key, value)
    schedule(key)
    return true
  }
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function guestKeys() {
  const keys = []
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && KEY.test(key)) keys.push(key)
    }
  } catch { /* storage unavailable */ }
  return keys
}

// Called once the reader is signed in: load their saved reading, fold in what they did as a guest, switch to the account.
export async function enterAccount() {
  const response = await fetch('/api/me/records', { credentials: 'same-origin' })
  if (!response.ok) throw new Error('Your saved reading could not be loaded.')
  const { records } = await response.json()
  memory.clear()
  for (const { articleNumber, kind, data } of records) {
    memory.set(`cursive:article:${articleNumber}:${kind}:v1`, JSON.stringify(data))
  }

  const uploads = []
  for (const key of guestKeys()) {
    let value = null
    try { value = localStorage.getItem(key) } catch { /* ignore */ }
    // the account's own copy wins; a guest copy only fills a gap
    if (value && !memory.has(key)) {
      try {
        JSON.parse(value)
        memory.set(key, value)
        uploads.push(send(key))
      } catch { /* skip a corrupt guest entry */ }
    }
  }
  await Promise.allSettled(uploads)
  // only after the upload has had its chance, remove the guest copies from this browser
  for (const key of guestKeys()) {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }
  signedIn = true
}

export async function leaveAccount() {
  await flushSaves()
  signedIn = false
  memory.clear()
  tries.clear()
}
