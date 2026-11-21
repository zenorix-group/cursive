import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { HOLD_DATA } from '../data/holdData.js'
import { closingSentence, lastWeek, monthEndWeek, playingParts } from '../data/holdLogic.js'

// The ± and its sentence. Press and hold (150 ms without moving) to start: the hold sentence rests for a second,
// then a real year plays one week at a time. Letting go is the move. Nothing here says right or wrong.
const PRESS_MS = 150
const SETUP_MS = 1000
const WEEK_MS = 500
const KEYBOARD_WEEK_MS = 1000 // readers on a keyboard get a slower year
const MOVE_SLOP = 10

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// hand-drawn ±: a loose ring and a pen-drawn plus over a bar, round ends, slightly off true like ink on paper
function PlusMinus() {
  return (
    <svg className="hold__glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path className="hold__ring" d="M12.3 1.9c5.7-.2 10 4.1 9.8 9.9-.2 5.8-4.5 10.2-10.2 10.1C6 21.8 1.8 17.6 1.9 12 2 6.3 6.4 2.2 12.3 1.9c.8-.1 1.5 0 2.1.2" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <g className="hold__pm" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.1 5.6c-.1 2-.1 4.1 0 6.1" />
        <path d="M8.9 8.7c2.1-.1 4.3 0 6.4.1" />
        <path d="M8.5 16.1c2.4-.2 4.8-.2 7.1 0" />
      </g>
    </svg>
  )
}

// props: id, holdText, after, result (the saved last release or end, or undefined), busy (another hold is playing),
// onActive(isActive), onEvent(action, week), onSettle({ action, week }), label (accessible name)
function HoldMarker({ id, holdText, after, result, busy, onActive, onEvent, onSettle, label }) {
  const last = lastWeek(id)
  // idle | pending | setup | playing | done
  const [phase, setPhase] = useState(result ? 'done' : 'idle')
  const [week, setWeek] = useState(result ? (result.action === 'end' ? last : result.week) : 0)
  const [announce, setAnnounce] = useState('')
  const [hint, setHint] = useState(false)
  const hintTimer = useRef(0)
  const showHint = () => {
    setHint(true)
    setAnnounce('Press and hold to play this year.')
    clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => { setHint(false); setAnnounce('') }, 2600)
  }
  const phaseRef = useRef(phase)
  const weekRef = useRef(week)
  const pressTimer = useRef(0)
  const setupTimer = useRef(0)
  const weekTimer = useRef(0)
  const start = useRef(null)
  const viaKeyboard = useRef(false)
  const lock = useRef(null)

  const go = (next) => { phaseRef.current = next; setPhase(next) }
  const setWk = (next) => { weekRef.current = next; setWeek(next) }
  const clearTimers = () => { clearTimeout(pressTimer.current); clearTimeout(setupTimer.current); clearInterval(weekTimer.current) }

  // while a hold plays the page must not scroll
  const stopScroll = useCallback((event) => event.preventDefault(), [])
  const lockScroll = () => {
    if (lock.current) return
    lock.current = true
    document.addEventListener('touchmove', stopScroll, { passive: false })
  }
  const unlockScroll = () => {
    if (!lock.current) return
    lock.current = null
    document.removeEventListener('touchmove', stopScroll)
  }

  const finish = (action, atWeek) => {
    clearTimers()
    unlockScroll()
    onActive(false)
    onEvent(action, atWeek)
    onSettle({ action, week: atWeek })
    setAnnounce('')
    go('done')
  }

  // a tap, or an interruption: the underline clears, the sentence goes back to the article, and she can press again
  const reset = (action) => {
    clearTimers()
    unlockScroll()
    onActive(false)
    onEvent(action, weekRef.current)
    setAnnounce('')
    setWk(0)
    go('idle')
  }

  const begin = () => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'pending') return
    onActive(true)
    onEvent('press', 0)
    setHint(false)
    lockScroll()
    setWk(0)
    go('setup')
    setAnnounce(holdText)
    setupTimer.current = setTimeout(() => {
      go('playing')
      setAnnounce('')
      const stepMs = viaKeyboard.current ? KEYBOARD_WEEK_MS : WEEK_MS
      weekTimer.current = setInterval(() => {
        const next = weekRef.current + 1
        if (next >= last) {
          setWk(last)
          finish('end', last)
          return
        }
        setWk(next)
        // a live region reads the month, the value and the share once a month
        if (HOLD_DATA[id].weeks[next][1] !== HOLD_DATA[id].weeks[next - 1][1]) {
          const p = playingParts(id, next)
          setAnnounce(`${p.month}, ${p.value}, ${p.share} per cent of your portfolio`)
        }
      }, stepMs)
    }, SETUP_MS)
  }

  const press = (keyboard) => {
    if (busy || phaseRef.current !== 'idle') return
    viaKeyboard.current = keyboard
    if (keyboard) { begin(); return }
    go('pending')
    pressTimer.current = setTimeout(begin, PRESS_MS)
  }

  const release = () => {
    const current = phaseRef.current
    if (current === 'pending') { clearTimers(); go('idle'); onEvent('tap', 0); showHint(); return }
    // letting go before the year starts moving is a tap
    if (current === 'setup' || (current === 'playing' && weekRef.current === 0)) { reset('tap'); showHint(); return }
    if (current === 'playing') finish('release', weekRef.current)
  }

  const interrupt = () => {
    const current = phaseRef.current
    if (current === 'pending') { clearTimers(); go('idle'); return }
    if (current === 'setup' || current === 'playing') reset('interrupt')
  }

  // pointer: a touch that moves first is a scroll
  const down = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    start.current = { x: event.clientX, y: event.clientY }
    try { event.currentTarget.setPointerCapture?.(event.pointerId) } catch { /* a pointer that is already gone */ }
    press(false)
  }
  const move = (event) => {
    if (phaseRef.current !== 'pending' || !start.current) return
    if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > MOVE_SLOP) { clearTimers(); go('idle') }
  }

  // an interruption such as a phone call or switching away
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') interrupt() }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('blur', interrupt)
    return () => {
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('blur', interrupt)
    }
  })
  // a touch that has already started cannot be stopped from scrolling by a listener added later (iOS), so one stays on the window
  // and blocks the page only while a hold plays; before the hold begins, a moving finger is an ordinary scroll
  useEffect(() => {
    const block = (event) => { if (phaseRef.current === 'setup' || phaseRef.current === 'playing') event.preventDefault() }
    window.addEventListener('touchmove', block, { passive: false })
    return () => window.removeEventListener('touchmove', block)
  }, [])
  useEffect(() => () => { clearTimers(); clearTimeout(hintTimer.current); unlockScroll() }, [])

  const playing = phase === 'setup' || phase === 'playing' || phase === 'done'
  const shownWeek = phase === 'setup' ? 0 : week
  // the underline grows toward the full stop, which stands for the last week; with reduced motion a month at a time
  const underWeek = phase === 'done' && result?.action === 'end' ? last : (reducedMotion() ? monthEndWeek(id, shownWeek) : shownWeek)
  const progress = phase === 'setup' ? 0 : underWeek / last
  const p = playingParts(id, shownWeek)

  return (
    <MotionConfig reducedMotion="user">
      <span className="hold__anchor">
      <motion.button
        type="button"
        whileHover={phase === 'idle' ? { scale: 1.14 } : undefined}
        whileTap={phase === 'idle' || phase === 'pending' ? { scale: 0.9 } : undefined}
        animate={phase === 'setup' || phase === 'playing' ? { scale: 1.14 } : phase === 'done' ? { scale: [1.3, 0.94, 1] } : { scale: 1 }}
        transition={phase === 'done' ? { duration: 0.5, ease: 'easeOut' } : { type: 'spring', stiffness: 420, damping: 22 }}
        className={`hold__marker${phase === 'setup' || phase === 'playing' ? ' is-down' : ''}${phase === 'done' ? ' is-done' : ''}`}
        aria-label={label}
        aria-pressed={phase === 'setup' || phase === 'playing'}
        disabled={busy && phase === 'idle'}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={interrupt}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.repeat) return
          if (event.key === ' ') { event.preventDefault(); press(true) }
          if (event.key === 'Enter') {
            event.preventDefault()
            if (phaseRef.current === 'idle') press(true)
            else release()
          }
        }}
        onKeyUp={(event) => { if (event.key === ' ') { event.preventDefault(); release() } }}
      >
        {phase === 'idle' && !result && (
          <motion.span
            className="hold__pulse"
            aria-hidden="true"
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 1.9], opacity: [0.55, 0] }}
            transition={{ duration: 2.2, ease: 'easeOut', delay: 1.2, repeat: 3, repeatDelay: 0.8 }}
          />
        )}
        <PlusMinus />
      </motion.button>
      <AnimatePresence>
        {hint && (
          <motion.span
            key="hint"
            className="hold__hint"
            aria-hidden="true"
            initial={{ opacity: 0, y: 8, x: '-50%', scale: 0.85 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: 4, x: '-50%', scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          >
            Press and hold
          </motion.span>
        )}
      </AnimatePresence>
      </span>
      <span className="visually-hidden" role="status" aria-live="polite">{announce}</span>
      {playing && (
        <>
          {' '}
          <span className={`hold__line${phase === 'done' ? ' is-done' : ''}`} style={{ '--p': progress }}>
            {phase === 'setup' ? holdText : (
              <>
                In <span className="hold__fig hold__fig--month">{p.month},</span> your ₹1 lakh abroad is worth <span className="hold__fig hold__fig--value">{p.value},</span> <span className="hold__fig hold__fig--share">{p.share}</span> per cent of your portfolio.
              </>
            )}
          </span>
          {phase === 'done' && <> {closingSentence(id)} {after}</>}
        </>
      )}
    </MotionConfig>
  )
}

export default HoldMarker
