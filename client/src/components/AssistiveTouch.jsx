import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion, useAnimationControls } from 'framer-motion'
import { EASE, EASE_IN, SOFT, SPRING, T } from '../lib/motion.js'
import { haptic } from '../lib/haptics.js'
import { GLYPH_LEVELS } from './glyphLevels.js'
import { SIGN_LABEL, TAP_LABEL, doTap, tapRule, useCompanion } from '../lib/companion.js'
import BackPage from './BackPage.jsx'
import { issueCount } from '../data/issue.js'
import { markSignShown, openSign } from '../lib/signs.js'
import { openBleed } from '../lib/bleed.js'

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
// the centre line of each wave in the mark's 47-unit box
const LEVEL_Y = [12.5, 18.3, 23.6, 29, 34.7]

// pulse counts the drops that have landed; land is the wave that was hit: it ripples, and the ripple runs down through the rest
// the mark's first level is a drop, drawn here in the mark's own 47-unit box (the dots of the old mark are now the drop and a foot)
const DROP_D = 'M23.5 8.75C24 10.08 26.06 11.97 26.06 13.7A2.56 2.56 0 0 1 20.94 13.7C20.94 11.97 23 10.08 23.5 8.75Z'

function Glyph({ progress, pulse = 0, land = 0, hideFirst = false }) {
  const controls = useAnimationControls()
  useEffect(() => {
    if (!pulse || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    controls.start((i) => ({
      scaleX: [1, 1.16, 1], y: [0, 1.2, 0],
      transition: { duration: 0.7, ease: 'easeOut', delay: Math.max(0, i - land) * 0.1 },
    }))
  }, [pulse]) // eslint-disable-line react-hooks/exhaustive-deps
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
          return <motion.path key={i} d={i === 0 ? DROP_D : d} custom={i} animate={controls} fill="currentColor" style={{ '--i': i, opacity: i === 0 && hideFirst ? 0.22 : reading ? 0.2 + 0.8 * lit : 1, transformBox: 'view-box', transformOrigin: '23.5px 23.5px' }} />
        })}
      </g>
    </svg>
  )
}

// a floating, draggable button (like iOS AssistiveTouch) that opens a small menu of the main destinations
// fixed: in an article the Blot is pinned in the bottom right corner and cannot be dragged; playing: the reader has the game on,
// so the square holds a drop
function AssistiveTouch({ items, title, tone = 'dark', progress = null, fixed = false }) {
  const { playing, swelled, sign, bleed } = useCompanion()
  const navigate = useNavigate()
  const [ripple, setRipple] = useState(0)
  const [merging, setMerging] = useState(false)
  const [tip, setTip] = useState(false)
  const [backPage, setBackPage] = useState(false)
  const [pulse, setPulse] = useState(0)
  const dropControls = useAnimationControls()
  const splashControls = useAnimationControls()
  const landRef = useRef({ y: 0 })
  const rule = fixed || sign || bleed ? tapRule() : null
  const buttonRef = useRef(null)
  const drag = useRef(null)
  const [open, setOpen] = useState(false)
  const [snapping, setSnapping] = useState(false)
  const [pos, setPos] = useState({ side: 'right', y: 0 })
  const [size, setSize] = useState(sizeNow)
  const [view, setView] = useState(null) // key of an open sub-menu (like Receipts), or null for the main grid
  const [rows, setRows] = useState([])
  const [absorbing, setAbsorbing] = useState(null) // 'answers' | 'receipt' while the overture is taking something in
  const count = open ? issueCount() : 0 // read when the menu opens

  // swollen into the Overture, the Blot is one size larger
  // (while a sign waits a tap opens the sign, so the Blot does not swell into a File now it could not honour)
  const overture = fixed && swelled && !sign
  const still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const dim = overture ? Math.round(size * 1.45) : size
  // the wave the drop lands on is the lowest one she has lit, so where it lands shows how far she has read
  const landLevel = progress === null ? 0 : Math.max(0, Math.min(4, Math.ceil(progress * 5 - 0.001) - 1))
  const scale = dim / 47
  // the live drop is the mark's own first level, the same size and place, so it simply comes alive where it already was
  const dropH = 7.5 * scale
  const dropW = 5.1 * scale
  const restTop = LEVEL_Y[0] * scale - dropH / 2
  const dropBox = { top: restTop, width: dropW, height: dropH, marginLeft: -dropW / 2 }
  // it falls until its stretched foot meets the lit wave; the first two waves are close enough that it ripples in place
  const landY = Math.max(0, (LEVEL_Y[landLevel] - 1.3) * scale - restTop - dropH * 1.3)
  // a sign, the swell and the merge each carry their own meaning, so the drip rests while they play
  const calm = !!sign || overture || merging
  const dripping = playing && fixed && !calm && !still
  const clampY = (y) => Math.min(Math.max(y, 56 + MARGIN), window.innerHeight - sizeNow() - MARGIN - 8)
  // the Bleed stretches the Blot edge to edge
  const wide = bleed ? window.innerWidth - MARGIN * 2 : dim
  const xFor = (side) => (bleed || side === 'left' ? MARGIN : window.innerWidth - (fixed ? dim : sizeNow()) - MARGIN)

  useLayoutEffect(() => {
    const saved = readSaved()
    setSize(sizeNow())
    const corner = () => window.innerHeight - (fixed ? dim : sizeNow()) - 28
    setPos(fixed ? { side: 'right', y: corner() } : { side: saved?.side ?? 'right', y: clampY(saved?.y ?? corner()) })
    const onResize = () => { setSize(sizeNow()); setPos((p) => (fixed ? { side: 'right', y: corner() } : { ...p, y: clampY(p.y) })) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [fixed, dim])

  // swelling or settling moves the square, so let its position and size ease together
  useEffect(() => {
    if (!fixed) return undefined
    setSnapping(true)
    const timer = setTimeout(() => setSnapping(false), 600)
    return () => clearTimeout(timer)
  }, [overture, fixed, bleed])

  useEffect(() => { landRef.current = { y: landY } })

  // one timeline for the drop and the waves: it forms, swells, falls to the lit wave, and the wave takes it in with a ripple
  useEffect(() => {
    if (!playing || !fixed) return undefined
    if (!dripping) { dropControls.set({ opacity: 1, scaleX: 1, scaleY: 1, y: 0 }); return undefined }
    let live = true
    const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })
    // each step is started and then waited out by its own length, so one stalled animation can never freeze the loop
    ;(async () => {
      try {
        await sleep(60) // let the motion elements register with their controls first
        while (live) {
          dropControls.set({ opacity: 0, scaleX: 0.15, scaleY: 0.15, y: 0 })
          dropControls.start({ opacity: 1, scaleX: 1, scaleY: 1, y: 0 }, { duration: 0.9, ease: EASE })
          await sleep(900)
          if (!live) break
          dropControls.start({ scaleY: [1, 1.12, 1] }, { duration: 0.9, ease: 'easeInOut' })
          await sleep(1300)
          if (!live) break
          dropControls.start({ scaleX: 0.8, scaleY: 1.3, y: landRef.current.y }, { duration: 0.8, ease: EASE_IN })
          await sleep(800)
          if (!live) break
          dropControls.start({ opacity: 0, scaleX: 0.3, scaleY: 0.3 }, { duration: 0.12 })
          setPulse((n) => n + 1)
          splashControls.start({ opacity: [0.8, 0], scaleX: [0.2, 1.6] }, { duration: 0.8, ease: 'easeOut' })
          await sleep(700)
        }
      } catch (error) { console.error('drop loop', error) }
    })()
    return () => { live = false; dropControls.stop(); splashControls.stop() }
  }, [playing, fixed, dripping]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!open) setView(null) }, [open])

  // the first time a sign appears it explains itself in a short line, which a screen reader announces once
  const signKey = sign ? `${sign.kind}:${sign.id}` : null
  const firstLine = sign?.first ? sign.line : null
  // a sign counts as shown only once the Blot is on the page to draw it
  useEffect(() => { if (sign) markSignShown(sign) }, [signKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!firstLine) return undefined
    setTip(true)
    const timer = setTimeout(() => setTip(false), 9000)
    return () => clearTimeout(timer)
  }, [signKey, firstLine])

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

  useLayoutEffect(() => { place(xFor(pos.side), pos.y) }, [pos, place, size, dim, bleed])

  // a tap in an article does the next thing the page allows (§3); outside one it opens the menu
  const tap = () => {
    haptic(8)
    if (bleed) { openBleed(bleed); return }
    if (sign) {
      // the sign: the second drop runs into the first as it opens (at once, for readers who turn animation off)
      if (merging) return
      setTip(false)
      if (sign.kind === 'vault') { openSign(sign); setBackPage(true); return }
      setMerging(true)
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      setTimeout(() => { openSign(sign); setMerging(false); navigate(sign.path) }, reduce ? 0 : 450)
      return
    }
    if (!fixed) { setOpen((value) => !value); return }
    if (open) { setOpen(false); return }
    const did = doTap()
    if (did === 'ripple') setRipple((n) => n + 1)
  }

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
    if (!d || d.id !== event.pointerId || bleed) return
    if (fixed) {
      // upward only: the square follows her thumb up the page (this stands in for the Run until the apps are built)
      const up = Math.min(event.clientY - d.sy, 0)
      if (!d.moved && up > -6) return
      d.moved = true
      d.up = up
      place(xFor('right'), pos.y + up)
      return
    }
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
    if (fixed) {
      if (d.moved) {
        // past a quarter of the screen it opens; short of that it falls back
        const opens = -(d.up || 0) > window.innerHeight * 0.25
        setSnapping(true)
        place(xFor('right'), pos.y)
        if (opens) { haptic(10); setOpen(true) }
        return
      }
      tap()
      return
    }
    if (!d.moved) {
      tap()
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
                      {count > 0 && (
                        <motion.p className="at__count" variants={itemVariants} animate={{ opacity: [0, 1, 0.3, 1, 0.6, 1] }} transition={{ duration: 0.7, delay: 0.2 }}>
                          Issue · {count} of 6
                        </motion.p>
                      )}
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
        className={`at__button${bleed ? ' at__button--bleed' : ''}${fixed ? ' at__button--fixed' : ''}${overture ? ' is-swelled' : ''}${snapping ? ' is-snapping' : ''}${open ? ' is-open' : ''}${absorbing ? ` is-absorbing is-absorbing--${absorbing}` : ''}`}
        style={{ width: wide, height: dim, borderRadius: bleed ? 10 : fixed ? 6 : size * 0.3 }}
        aria-label={bleed ? `${bleed.kind === 'news' ? 'News' : 'Opportunity'}: ${bleed.title}. Open it` : fixed || sign ? `${(sign && SIGN_LABEL[sign.kind]) || TAP_LABEL[rule] || 'Open your apps'}${progress !== null ? `, ${Math.round(progress * 100)}% read` : ''}` : open ? 'Close menu' : progress !== null ? `Open menu, ${Math.round(progress * 100)}% read` : 'Open menu'}
        aria-expanded={open}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); tap() } }}
      >
        <Glyph progress={progress} pulse={pulse} land={landLevel} hideFirst={playing && fixed} />
        {bleed && (
          <motion.span className="at__bleed" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
            <small>{bleed.kind === 'news' ? 'News' : bleed.type && bleed.type !== 'other' ? bleed.type : 'Opportunity'}</small>
            <strong>{bleed.title}</strong>
          </motion.span>
        )}
        <MotionConfig reducedMotion="user">
          <AnimatePresence>
            {playing && fixed && (
              <motion.span key="drop" className="at__dropwrap at__dropwrap--live" style={dropBox} aria-hidden="true" exit={{ opacity: 0, scale: 0.6 }}>
                <motion.svg className="at__drop" viewBox="1.4 1.2 9.2 13.5" style={{ transformOrigin: '50% 0%' }} initial={{ opacity: 0, scaleX: 0.15, scaleY: 0.15 }} animate={dropControls}>
                  <path d="M6 1.2C6.9 3.6 10.6 7 10.6 10.1A4.6 4.6 0 0 1 1.4 10.1C1.4 7 5.1 3.6 6 1.2Z" fill="currentColor" />
                </motion.svg>
                {dripping && <motion.span className="at__splash" style={{ top: LEVEL_Y[landLevel] * scale - restTop }} initial={{ opacity: 0, scaleX: 0 }} animate={splashControls} />}
                {ripple > 0 && (
                  <motion.span key={ripple} className="at__ripple" initial={{ scale: 0.4, opacity: 0.7 }} animate={{ scale: 3.2, opacity: 0 }} transition={{ duration: T.state + 0.4, ease: 'easeOut' }} />
                )}
              </motion.span>
            )}
            {!playing && fixed && (
              // no drop: an empty drop, drawn in dashes, tells her the square is where the game goes on
              <motion.span key="ghost" className="at__dropwrap at__dropwrap--ghost" style={dropBox} aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.span className="at__ripple" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.6, 2.6], opacity: [0.55, 0] }} transition={{ duration: T.ambient + 0.8, ease: 'easeOut', repeat: Infinity, repeatDelay: 1.2 }} />
              </motion.span>
            )}
            {sign?.kind === 'vault' && (
              <motion.svg key="through" className="at__through" viewBox="0 0 47 47" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }} transition={{ duration: T.ambient }}>
                {GLYPH_LEVELS.map((d, i) => <path key={i} d={d} fill="currentColor" />)}
              </motion.svg>
            )}
            {sign?.kind === 'narrative' && (
              <motion.span
                key="drop2"
                className="at__dropwrap at__dropwrap--second"
                style={{ ...dropBox, marginLeft: dropW / 2 + 5 }}
                aria-hidden="true"
                initial={{ opacity: 0, y: -26 }}
                animate={merging ? { opacity: 1, y: 0, x: -(dropW + 5), scale: 1.12 } : { opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={merging ? { duration: T.state, ease: EASE } : SOFT}
              >
                <svg className="at__drop" viewBox="1.4 1.2 9.2 13.5"><path d="M6 1.2C6.9 3.6 10.6 7 10.6 10.1A4.6 4.6 0 0 1 1.4 10.1C1.4 7 5.1 3.6 6 1.2Z" fill="currentColor" /></svg>
                {!merging && <motion.span className="at__ripple" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.6, 2.4], opacity: [0.5, 0] }} transition={{ duration: 2, ease: 'easeOut', repeat: Infinity, repeatDelay: 1.4 }} />}
              </motion.span>
            )}
            {overture && (
              <motion.span key="file" className="at__file" aria-hidden="true" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: T.feedback + 0.05, duration: T.state, ease: EASE }}>
                File now
              </motion.span>
            )}
          </AnimatePresence>
        </MotionConfig>
      </button>
      <AnimatePresence>
        <BackPage key="backpage" open={backPage} onClose={() => setBackPage(false)} onPick={(lens) => { setBackPage(false); navigate(`/receipt/vault?lens=${lens.id}`) }} />
      </AnimatePresence>
      <AnimatePresence>
        {tip && sign && (
          <motion.p
            key="signline"
            className="at__tip"
            role="status"
            style={{ [pos.side === 'left' ? 'left' : 'right']: MARGIN, bottom: window.innerHeight - pos.y + 10 }}
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={SPRING}
          >
            {sign.line}
          </motion.p>
        )}
      </AnimatePresence>
      {fixed && (
        // for keyboards and screen readers: stands in for dragging the Blot up
        <button type="button" className="at__apps" aria-haspopup="menu" aria-expanded={open} onClick={() => { haptic(8); setOpen((value) => !value) }}>
          Open your apps
        </button>
      )}
    </div>,
    document.body,
  )
}

export default AssistiveTouch
