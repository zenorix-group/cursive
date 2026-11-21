import { kvGet, kvSet } from './cursiveStore.js'

// Every use of her reading data stays off until she signs in and agrees (§7 of the companion document). The choice is kept with the
// account, so it follows her across devices. Nothing reads her data yet; this is where a future use must ask first.
// The wording below is a draft: for the German pilot it needs a privacy policy and a lawful basis under GDPR, checked by someone who knows the law.
const KEY = 'cursive:consent:reading-data:v1'
export const CONSENT_VERSION = 'draft-1'

export function readingConsent() {
  try {
    const saved = JSON.parse(kvGet(KEY))
    return saved?.agreed === true && saved.version === CONSENT_VERSION
  } catch { return false }
}

export function saveReadingConsent(agreed) {
  kvSet(KEY, JSON.stringify({ agreed: Boolean(agreed), version: CONSENT_VERSION, at: new Date().toISOString() }))
}
