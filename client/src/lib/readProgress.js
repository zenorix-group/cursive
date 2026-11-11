import { useEffect, useState } from 'react'

// how far down the page the reader is (0..1), or null when not enabled
export function useReadProgress(enabled) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!enabled) return undefined
    let frame = 0
    const update = () => {
      frame = 0
      const room = document.documentElement.scrollHeight - window.innerHeight
      setProgress(room > 0 ? Math.min(Math.max(window.scrollY / room, 0), 1) : 0)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null
    observer?.observe(document.body)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
    }
  }, [enabled])
  return enabled ? progress : null
}
