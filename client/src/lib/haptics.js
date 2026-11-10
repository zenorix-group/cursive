// tiny haptic tick. Android: Vibration API. iOS 18+: toggling a hidden native switch input gives a light tap.
// Does nothing on desktop, or when the reader prefers reduced motion.
let label

function iosTick() {
  if (!label) {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.id = 'haptic-switch'
    label = document.createElement('label')
    label.htmlFor = input.id
    label.setAttribute('aria-hidden', 'true')
    Object.assign(label.style, { position: 'fixed', left: '-9999px', top: '0', opacity: '0', pointerEvents: 'none' })
    input.tabIndex = -1
    label.append(input)
    document.body.append(label)
  }
  label.click()
}

export function haptic(ms = 10) {
  try {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (navigator.vibrate) navigator.vibrate(ms)
    else if (/iP(hone|ad)/.test(navigator.userAgent)) iosTick()
  } catch {
    // haptics are a nicety, never an error
  }
}
