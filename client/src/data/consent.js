// Every use of her reading data stays off until she signs in and agrees (§7 of the companion document). The choice is kept with the
// account (on the user record), so it follows her across devices. The one use so far is the Bleed's picks (lib/picks.js); any new use must ask first.
// The wording below is a draft: for the German pilot it needs a privacy policy and a lawful basis under GDPR, checked by someone who knows the law.
export const CONSENT_VERSION = 'draft-1'

let current = null // { agreed, version } as the account has it; null for a guest
const listeners = new Set()
export const subscribeConsent = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
const announce = () => listeners.forEach((fn) => fn())

// the auth provider hands over the signed-in user (or null) so the choice is known everywhere without another request
export function setConsentFromUser(user) {
  current = user ? { agreed: user.readingConsent?.agreed === true, version: user.readingConsent?.version || '' } : null
  announce()
}

export const readingConsent = () => Boolean(current?.agreed) && current.version === CONSENT_VERSION

export function saveReadingConsent(agreed) {
  current = { agreed: Boolean(agreed), version: CONSENT_VERSION }
  announce()
  // stored on the account; if it cannot be saved the next sign-in shows the old choice
  return fetch('/api/auth/consent', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
    body: JSON.stringify({ agreed: Boolean(agreed), version: CONSENT_VERSION }),
  }).catch(() => {})
}
