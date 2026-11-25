import { useEffect } from 'react'

// The top bar steps out of the way while she reads: it tucks up as she scrolls down and comes back the moment she scrolls up,
// and it always shows near the top of the page. The bar is sticky, so tucking it never moves the text.
const SHOW_NEAR_TOP = 80
const SLOP = 6

export function useAutoHideBar(selector, enabled) {
  useEffect(() => {
    if (!enabled) return undefined
    let last = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - last
      if (Math.abs(delta) < SLOP) return
      last = y
      const bar = document.querySelector(selector)
      if (bar) bar.classList.toggle('is-tucked', y > SHOW_NEAR_TOP && delta > 0)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      document.querySelector(selector)?.classList.remove('is-tucked')
    }
  }, [selector, enabled])
}
