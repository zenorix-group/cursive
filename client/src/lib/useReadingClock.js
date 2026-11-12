import { useEffect, useState } from 'react'

// whole seconds the reader has spent on the page; it only runs while the tab is visible
export function useReadingClock() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    let elapsed = 0
    let last = Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      if (document.visibilityState === 'visible') elapsed += now - last
      last = now
      setSeconds((previous) => {
        const next = Math.floor(elapsed / 1000)
        return next === previous ? previous : next
      })
    }, 250)
    return () => clearInterval(id)
  }, [])
  return seconds
}

export function formatClock(total) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const two = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`
}
