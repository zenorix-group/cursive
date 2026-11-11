import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { haptic } from '../lib/haptics.js'
import { GLYPH_LEVELS } from './glyphLevels.js'

const sizeNow = () => (typeof window !== 'undefined' && window.innerWidth >= 900 ? 62 : 47)
const MARGIN = 10

const panelVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 360, damping: 26 } },
  exit: { opacity: 0, scale: 0.6, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } },
}
const contentVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
  exit: { transition: { duration: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.88 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 28 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}
const KEY = 'cursive:assistive-touch:v1'

const readSaved = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved && (saved.side === 'left' || saved.side === 'right') && Number.isFinite(saved.y)) return saved
  } catch {
    // storage can be unavailable; fall back to the default spot
  }
  return null
}

// The app mark drawn as five levels. Inside an article the levels light up from the top as the reader moves
// down the page (one level per fifth), so the button shows where they are without adding a scrollbar.
function Glyph({ progress }) {
  const reading = progress !== null
  const done = reading && progress >= 0.995
  return (
    <svg className={`at__glyph${done ? ' is-done' : ''}`} viewBox="0 0 47 47" aria-hidden="true">
      <defs>
        <filter id="at-wobble" x="8.9" y="8.9" width="28.6" height="29.3" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0629 0.0885" numOctaves="3" seed="2331" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter="url(#at-wobble)">
        {GLYPH_LEVELS.map((d, i) => {
          const lit = reading ? Math.min(Math.max(progress * GLYPH_LEVELS.length - i, 0), 1) : 1
          return <path key={i} d={d} fill="currentColor" style={{ '--i': i, opacity: reading ? 0.2 + 0.8 * lit : 1 }} />
        })}
      </g>
    </svg>
  )
}

// a floating, draggable button (like iOS AssistiveTouch) that opens a small menu of the main destinations
function AssistiveTouch({ items, title, tone = 'dark', progress = null }) {
  const buttonRef = useRef(null)
  const drag = useRef(null)
  const [open, setOpen] = useState(false)
  const [snapping, setSnapping] = useState(false)
  const [pos, setPos] = useState({ side: 'right', y: 0 })
  const [size, setSize] = useState(sizeNow)
  const [view, setView] = useState(null) // key of an open sub-menu (like Receipts), or null for the main grid
  const [rows, setRows] = useState([])
  const [absorbing, setAbsorbing] = useState(null) // 'answers' | 'receipt' while the overture is taking something in

  const clampY = (y) => Math.min(Math.max(y, 56 + MARGIN), window.innerHeight - sizeNow() - MARGIN - 8)
  const xFor = (side) => (side === 'left' ? MARGIN : window.innerWidth - sizeNow() - MARGIN)

  useLayoutEffect(() => {
    const saved = readSaved()
    setSize(sizeNow())
    setPos({ side: saved?.side ?? 'right', y: clampY(saved?.y ?? window.innerHeight - sizeNow() - 28) })
    const onResize = () => { setSize(sizeNow()); setPos((p) => ({ ...p, y: clampY(p.y) })) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => { if (!open) setView(null) }, [open])

  useEffect(() => {
    const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let timer = 0
    const react = (kind) => {
      haptic(kind === 'receipt' ? 14 : 10)
      setAbsorbing(null)
      requestAnimationFrame(() => {
        setAbsorbing(kind)
        clearTimeout(timer)
        timer = setTimeout(() => setAbsorbing(null), 1100)
      })
    }
    const onAbsorb = (event) => {
      const { kind = 'answers', rect } = event.detail || {}
      const btn = buttonRef.current
      if (!btn) return
      if (!rect || reduce()) { react(kind); return }
      // a small paper chip flies from where it was saved into the overture
      const to = btn.getBoundingClientRect()
      const sx = rect.left + rect.width / 2
      const sy = rect.top + rect.height / 2
      const dx = to.left + to.width / 2 - sx
      const dy = to.top + to.height / 2 - sy
      const chip = document.createElement('div')
      chip.className = 'at__chip'
      chip.innerHTML = '<i></i><i></i><i></i>'
      chip.style.left = `${sx - 22}px`
      chip.style.top = `${sy - 15}px`
      document.body.append(chip)
      haptic(6)
      const flight = chip.animate(
        [
          { transform: 'translate(0px, 0px) scale(1) rotate(-5deg)', opacity: 0 },
          { transform: 'translate(0px, -8px) scale(1.08) rotate(-3deg)', opacity: 1, offset: 0.14 },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.3 - 44}px) scale(0.8) rotate(6deg)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(14deg)`, opacity: 0.15 },
        ],
        { duration: 760, easing: 'cubic-bezier(0.5, 0, 0.25, 1)', fill: 'forwards' },
      )
      flight.finished.then(() => { chip.remove(); react(kind) }).catch(() => chip.remove())
    }
    window.addEventListener('overture:absorb', onAbsorb)
    return () => { window.removeEventListener('overture:absorb', onAbsorb); clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const place = useCallback((x, y) => {
    if (buttonRef.current) buttonRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }, [])

  useLayoutEffect(() => { place(xFor(pos.side), pos.y) }, [pos, place, size])

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    const rect = buttonRef.current.getBoundingClientRect()
    drag.current = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top, sx: event.clientX, sy: event.clientY, moved: false }
    try { buttonRef.current.setPointerCapture(event.pointerId) } catch { /* pointer already gone */ }
    buttonRef.current.dataset.dragging = '1'
    setSnapping(false)
  }

  const onPointerMove = (event) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    if (!d.moved && Math.hypot(event.clientX - d.sx, event.clientY - d.sy) < 6) return
    if (!d.moved) { d.moved = true; setOpen(false) }
    const x = Math.min(Math.max(event.clientX - d.dx, 0), window.innerWidth - sizeNow())
    const y = Math.min(Math.max(event.clientY - d.dy, 0), window.innerHeight - sizeNow())
    place(x, y)
  }

  const onPointerUp = (event) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    drag.current = null
    delete buttonRef.current.dataset.dragging
    if (!d.moved) {
      haptic(8)
      setOpen((value) => !value)
      return
    }
    const rect = buttonRef.current.getBoundingClientRect()
    const side = rect.left + sizeNow() / 2 < window.innerWidth / 2 ? 'left' : 'right'
    const next = { side, y: clampY(rect.top) }
    setSnapping(true)
    setPos(next)
    haptic(6)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* optional */ }
  }

  const choose = (item) => {
    haptic(8)
    if (item.sub) { setRows(item.sub()); setView(item.key); return }
    setOpen(false)
    item.onClick()
  }
  const chooseRow = (row) => {
    haptic(8)
    setOpen(false)
    row.onClick()
  }
  const current = view ? items.find((item) => item.key === view) : null

  const below = pos.y < window.innerHeight / 2
  const panelStyle = {
    [pos.side === 'left' ? 'left' : 'right']: MARGIN,
    [below ? 'top' : 'bottom']: below ? pos.y + sizeNow() + 10 : window.innerHeight - pos.y + 10,
    transformOrigin: `${below ? 'top' : 'bottom'} ${pos.side}`,
  }

  return createPortal(
    <div className="at" data-side={pos.side} data-tone={tone}>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              className="at__scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="panel"
              className="at__panel"
              role="menu"
              aria-label={title || 'Main'}
              style={panelStyle}
              variants={panelVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={view || 'root'} className="at__content" variants={contentVariants} initial="hidden" animate="show" exit="exit">
                  {view ? (
                    <>
                      <motion.div className="at__head" variants={itemVariants}>
                        <button type="button" className="at__back" aria-label="Back" onClick={() => { haptic(6); setView(null) }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <p className="at__title">{current?.label}</p>
                      </motion.div>
                      {rows.map((row) => (
                        <motion.button key={row.key} type="button" role="menuitem" className="at__row" data-state={row.state} variants={itemVariants} whileTap={{ scale: 0.97 }} onClick={() => chooseRow(row)}>
                          <span className="at__row-main"><strong>{row.label}</strong><small>{row.sublabel}</small></span>
                          <span className="at__row-state">{row.badge}</span>
                        </motion.button>
                      ))}
                    </>
                  ) : (
                    <>
                      {title && <motion.p className="at__title" variants={itemVariants}>{title}</motion.p>}
                      {items.map((item) => (
                        <motion.button
                          key={item.key}
                          type="button"
                          role="menuitem"
                          className={`at__item${item.wide ? ' at__item--wide' : ''}`}
                          variants={itemVariants}
                          whileTap={{ scale: 0.95 }}
                          aria-current={item.current ? 'page' : undefined}
                          aria-haspopup={item.sub ? 'menu' : undefined}
                          onClick={() => choose(item)}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                          {item.note && <em className="at__note">{item.note()}</em>}
                          {item.sub && <svg className="at__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </motion.button>
                      ))}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <button
        ref={buttonRef}
        type="button"
        className={`at__button${snapping ? ' is-snapping' : ''}${open ? ' is-open' : ''}${absorbing ? ` is-absorbing is-absorbing--${absorbing}` : ''}`}
        style={{ width: size, height: size, borderRadius: size * 0.3 }}
        aria-label={open ? 'Close menu' : progress !== null ? `Open menu, ${Math.round(progress * 100)}% read` : 'Open menu'}
        aria-expanded={open}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpen((value) => !value) } }}
      >
        <Glyph progress={progress} />
      </button>
    </div>,
    document.body,
  )
}

export default AssistiveTouch
