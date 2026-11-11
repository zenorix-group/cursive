import { useLayoutEffect } from 'react'

const TARGETS = [
  '.receipt__section-heading', '.receipt__description', '.receipt__card', '.receipt__path-item', '.receipt__legend',
  '.receipt__observations li', '.receipt__table', '.receipt__note', '.lift-receipt__prose p', '.lift-receipt__observation', '.lift-receipt__kept li',
].join(',')

// Receipt content eases in as it scrolls into view, and the graph draws itself. Classes are added before the first paint
// so nothing flashes; with reduced motion nothing is hidden at all.
export function useReveal(ready) {
  useLayoutEffect(() => {
    if (!ready || typeof IntersectionObserver === 'undefined') return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const root = document.querySelector('.receipt__sections')
    if (!root) return undefined

    const els = [...root.querySelectorAll(TARGETS)]
    els.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((c) => c.matches(TARGETS))
      el.style.setProperty('--d', `${Math.min(siblings.indexOf(el), 5) * 70}ms`)
      el.classList.add('rv')
    })
    const marks = [...root.querySelectorAll('.lift-mark')]

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    els.forEach((el) => io.observe(el))

    const markIo = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        markIo.unobserve(entry.target)
      }
    }, { threshold: 0.4 })
    marks.forEach((el) => markIo.observe(el))

    return () => {
      io.disconnect()
      markIo.disconnect()
      els.forEach((el) => el.classList.remove('rv', 'is-in'))
      marks.forEach((el) => el.classList.remove('is-in'))
    }
  }, [ready])
}
