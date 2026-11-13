// Onboarding is the reader's first reading: whichever article they pick, read it and see its receipt.
// Until that is done a visitor cannot create an account, and the app proper (reading room, overture) stays closed.
// It is remembered per browser; a signed-in reader has by definition already been through it.
const KEY = 'cursive:onboarding:v1'

export function onboardingDone() {
  try { return localStorage.getItem(KEY) === 'done' } catch { return false }
}

export function markOnboardingDone() {
  try { localStorage.setItem(KEY, 'done') } catch { /* optional */ }
}
