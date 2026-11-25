import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion, useAnimationControls } from 'framer-motion'
import { EASE, EASE_IN, SOFT, SPRING, T } from '../lib/motion.js'
import { haptic } from '../lib/haptics.js'
import { GLYPH_LEVELS } from './glyphLevels.js'
import { SIGN_LABEL, TAP_LABEL, doTap, setCompanion, tapRule, useCompanion } from '../lib/companion.js'
import BackPage from './BackPage.jsx'
import ReadingStats from './ReadingStats.jsx'
import { issueCount } from '../data/issue.js'
import { markSignShown, openSign } from '../lib/signs.js'
import { loadBleedItems, openBleed } from '../lib/bleed.js'
import { usePicksVersion } from '../lib/picks.js'
import { useAuth } from '../auth/AuthContext.jsx'
import BleedShelf from './BleedShelf.jsx'
import FileCard from './FileCard.jsx'

const sizeNow = () => (typeof window !== 'undefined' && window.innerWidth >= 900 ? 62 : 47)
const MARGIN = 20 // in from the edge: the Blot's right edge lines up with the text column and the Game info feather

// The Overture is the Blot itself swelling: the panel begins as the square, at the square's own corner, and grows to full size,
// while what is inside comes up out of a blur (after the iPad card and the pill in the reference videos). Folding reverses it.
const panelVariants = {
  hidden: ({ dim, quiet }) => ({ width: dim, height: dim, borderRadius: 14, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, opacity: quiet ? 0 : 1 }),
  show: ({ panelW, dim, below, quiet, fullH }) => ({ width: panelW, height: fullH || 'auto', borderRadius: 28, paddingTop: below ? dim + 10 : 12, paddingBottom: below ? 12 : dim + 10, paddingLeft: 12, paddingRight: 12, opacity: 1, transition: quiet ? { duration: 0 } : { type: 'spring', stiffness: 230, damping: 25, mass: 0.9 } }),
  // the same look with the height handed back to the page (a new view then fits itself), reached with no animation
  settled: ({ panelW, dim, below }) => ({ width: panelW, height: 'auto', borderRadius: 28, paddingTop: below ? dim + 10 : 12, paddingBottom: below ? 12 : dim + 10, paddingLeft: 12, paddingRight: 12, opacity: 1, transition: { duration: 0 } }),
  exit: ({ dim, quiet }) => ({ width: dim, height: dim, borderRadius: 14, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, opacity: quiet ? 0 : 1, transition: quiet ? { duration: 0 } : { duration: 0.38, delay: 0.05, ease: [0.45, 0, 0.2, 1] } }),
}
const contentVariants = {
  hidden: { opacity: 0, filter: 'blur(8px)' },
  show: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.3, delay: 0.08, staggerChildren: 0.025, delayChildren: 0.06 } },
  exit: { opacity: 0, filter: 'blur(6px)', transition: { duration: 0.12 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.82 },
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
  const { playing, swelled, sign, bleed, bleedItems, shelf } = useCompanion()
  // the strip turns through its items every few seconds; hovering or focusing it holds the current one
  const [slide, setSlide] = useState(0)
  const [holding, setHolding] = useState(false)
  const shown = bleed ? (bleedItems[slide] ?? bleed) : null
  const [shelfItems, setShelfItems] = useState([])
  const { user } = useAuth()
  const picks = usePicksVersion()
  const lastTarget = useRef(null)
  const navigate = useNavigate()
  const [ripple, setRipple] = useState(0)
  const [merging, setMerging] = useState(false)
  const [tip, setTip] = useState(false)
  const [backPage, setBackPage] = useState(false)
  const [stats, setStats] = useState(false) // the reading-room card, shown only after a double-click
  const lastTap = useRef(0)
  const [filePhase, setFilePhase] = useState(null) // null | 'saving' | 'stamped': the File now card's own run, kept apart from the page so it plays out even as the page moves on
  const [fileDate, setFileDate] = useState('')
  const fileTimers = useRef([])
  const bleedTimer = useRef(null) // the strip's single tap, waiting to see whether a second one follows
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
  const dim = size
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
  // on a wide screen the strip is three quarters of the width, pulled out leftward from the square; on a phone it is edge to edge
  const wide = bleed ? (window.innerWidth >= 900 ? Math.round(window.innerWidth * 0.75) : window.innerWidth - MARGIN * 2) : dim
  // a strip with a short note is taller, to give the note room under the title; it grows upward so it stays on screen
  const tall = bleed && bleedItems.some((entry) => entry.summary) ? Math.max(dim, 76) : dim
  const lift = tall - dim
  const xFor = (side) => (side === 'left' ? MARGIN : bleed ? window.innerWidth - wide - MARGIN : window.innerWidth - (fixed ? dim : sizeNow()) - MARGIN)

  useLayoutEffect(() => {
    const saved = readSaved()
    setSize(sizeNow())
    const corner = () => window.innerHeight - (fixed ? dim : sizeNow()) - 34
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
  // turn to the next item every few seconds: a still strip for readers who turn animation off, and held while she hovers or the shelf is open
  useEffect(() => { setSlide(0) }, [bleed?.id])
  useEffect(() => {
    if (!bleed || bleedItems.length < 2 || holding || shelf || still) return undefined
    const timer = setInterval(() => setSlide((i) => (i + 1) % bleedItems.length), 6000)
    return () => clearInterval(timer)
  }, [bleed, bleedItems.length, holding, shelf, still])
  // the shelf shows every active item, whichever door opened it
  useEffect(() => { if (shelf) loadBleedItems(Boolean(user)).then(setShelfItems) }, [shelf, picks, user])

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

  useEffect(() => { if (!open) { setView(null); setStats(false) } }, [open])

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

  useLayoutEffect(() => { place(xFor(pos.side), pos.y - lift) }, [pos, place, size, dim, bleed, lift])

  useEffect(() => () => { clearTimeout(bleedTimer.current); fileTimers.current.forEach(clearTimeout) }, [])

  // File now: the page starts filing at once; the card shows Saving, then a dated FILED stamp, then folds into the Blot
  const startFiling = () => {
    if (filePhase) return
    haptic(12)
    setFileDate(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase())
    setFilePhase('saving')
    const quick = still ? 0.3 : 1
    // the page files once the stamp has had a moment to be seen (filing moves her on to the receipt)
    fileTimers.current = [
      setTimeout(() => setFilePhase('stamped'), 1000 * quick),
      setTimeout(() => doTap(), 1750 * quick),
      setTimeout(() => setFilePhase(null), 2600 * quick),
    ]
  }

  // a tap in an article does the next thing the page allows (§3); outside one it opens the menu
  const tap = () => {
    haptic(8)
    const now = Date.now()
    const twice = now - lastTap.current < 320
    lastTap.current = now
    // in an article a second tap that quick is a slip, not a second command: it must not play, then file
    if (fixed && twice && !sign && !bleed) return
    // the strip: a tap on "+N more" opens the shelf; a tap on the strip opens its link, or, with no link, the shelf at that item
    // A second tap that quick opens the Overture instead: the strip folds and the reading-room card comes up. So the first tap's
    // action waits a beat (the double-tap window) to see whether a second one follows.
    if (bleed) {
      if (twice && bleedTimer.current) {
        clearTimeout(bleedTimer.current)
        bleedTimer.current = null
        setCompanion({ bleed: null, bleedItems: [] })
        setStats(true); setOpen(true)
        return
      }
      const toShelf = lastTarget.current?.closest?.('.at__more') || !shown?.url
      const item = shown
      bleedTimer.current = setTimeout(() => {
        bleedTimer.current = null
        if (toShelf) setCompanion({ shelf: true })
        else openBleed(item)
      }, 330)
      return
    }
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
    // outside an article one tap opens the Overture; a double-click opens it with the reading-room card on top
    if (!fixed) {
      if (twice) { setStats(true); setOpen(true); return }
      setOpen((value) => !value)
      return
    }
    if (overture || filePhase) { startFiling(); return }
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
    lastTarget.current = event.target
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
  // anchored at the Blot's own corner, so the panel grows out of the square (upward or downward, whichever way has room)
  const panelW = window.innerWidth >= 900 ? 268 : 252
  const panelStyle = {
    [pos.side === 'left' ? 'left' : 'right']: MARGIN,
    [below ? 'top' : 'bottom']: below ? pos.y : window.innerHeight - (pos.y + dim),
    // (padding is animated with the size: room for the Blot's mark, which stays in the corner as the way to fold it)
    overflow: 'hidden',
    // never taller than the room on screen: what does not fit scrolls inside the panel
    maxHeight: below ? window.innerHeight - pos.y - 12 : pos.y + dim - 64 - 12,
  }

  // The panel grows to its full height, measured here once it has mounted: asking the animation library to find "auto" itself
  // came out short when a row (Receipts) had not been laid out yet, so the panel stopped early and then jumped. We measure it at its
  // final width and padding, then hand over a number. Once it has grown, the height goes back to auto so a new view fits itself.
  const panelRef = useRef(null)
  const [fullH, setFullH] = useState(0)
  const [settled, setSettled] = useState(false)
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!open || !el) { setFullH(0); setSettled(false); return }
    const keep = el.style.cssText
    Object.assign(el.style, { width: `${panelW}px`, height: 'auto', maxHeight: 'none', paddingLeft: '12px', paddingRight: '12px', paddingTop: below ? `${dim + 10}px` : '12px', paddingBottom: below ? '12px' : `${dim + 10}px` })
    const natural = Math.ceil(el.getBoundingClientRect().height)
    el.style.cssText = keep
    setFullH(Math.min(natural, panelStyle.maxHeight))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

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
              ref={panelRef}
              className="at__panel"
              role="menu"
              aria-label={title || 'Main'}
              style={panelStyle}
              variants={panelVariants}
              custom={{ dim, panelW, below, quiet: still, fullH }}
              initial="hidden"
              animate={fullH ? (settled ? 'settled' : 'show') : 'hidden'}
              onAnimationComplete={(name) => { if (name === 'show') setSettled(true) }}
              exit="exit"
            >
              <AnimatePresence mode="wait" initial={false} propagate>
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
                      {stats && <ReadingStats />}
                      {title && !stats && <motion.p className="at__title" variants={itemVariants}>{title}</motion.p>}
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
        className={`at__button${shelf ? ' is-shelf' : ''}${bleed ? ' at__button--bleed' : ''}${fixed ? ' at__button--fixed' : ''}${snapping ? ' is-snapping' : ''}${open ? ' is-open' : ''}${filePhase ? ' is-filing' : ''}${filePhase === 'stamped' ? ' is-filed' : ''}${absorbing ? ` is-absorbing is-absorbing--${absorbing}` : ''}`}
        style={{ width: wide, height: tall, borderRadius: bleed ? 10 : fixed ? 6 : size * 0.3 }}
        aria-label={shown ? `${shown.priority === 'breaking' ? 'Breaking' : shown.kind === 'news' ? 'News' : 'Opportunity'}: ${shown.title}. ${shown.url ? 'Open it' : 'Read more'}` : fixed || sign ? `${(sign && SIGN_LABEL[sign.kind]) || TAP_LABEL[rule] || 'Open your apps'}${progress !== null ? `, ${Math.round(progress * 100)}% read` : ''}` : open ? 'Close menu' : progress !== null ? `Open menu, ${Math.round(progress * 100)}% read` : 'Open menu'}
        aria-expanded={open}
        onPointerEnter={() => setHolding(true)}
        onPointerLeave={() => setHolding(false)}
        onFocus={() => setHolding(true)}
        onBlur={() => setHolding(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); tap() } }}
      >
        <Glyph progress={progress} pulse={pulse} land={landLevel} hideFirst={playing && fixed} />
        {filePhase === 'stamped' && <span className="at__stamp" aria-hidden="true">FILED</span>}
        {shown && (
          <MotionConfig reducedMotion="user">
            <AnimatePresence mode="wait" initial>
              <motion.span key={shown.id} className="at__bleed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: T.state, ease: EASE }}>
                <small className={shown.priority === 'breaking' ? 'is-breaking' : undefined}>{shown.priority === 'breaking' ? 'Breaking' : shown.kind === 'news' ? 'News' : shown.type && shown.type !== 'other' ? shown.type : 'Opportunity'}</small>
                <strong>{shown.title}</strong>
                {shown.summary && <em>{shown.summary}</em>}
              </motion.span>
            </AnimatePresence>
          </MotionConfig>
        )}
        {bleed?.more > 0 && <span className="at__more">+{bleed.more} more</span>}
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

          </AnimatePresence>
        </MotionConfig>
      </button>
      <BleedShelf open={shelf} items={shelfItems} bottom={window.innerHeight - (pos.y - lift + tall)} onClose={() => setCompanion({ shelf: false })} />
      <AnimatePresence>
        <BackPage key="backpage" open={backPage} onClose={() => setBackPage(false)} onPick={(lens) => { setBackPage(false); navigate(`/receipt/vault?lens=${lens.id}`) }} />
      </AnimatePresence>
      <AnimatePresence>
        {(overture || filePhase) && (
          <FileCard key="filecard" phase={filePhase || 'ready'} side={pos.side} margin={MARGIN} bottom={window.innerHeight - pos.y + 10} still={still} date={fileDate} />
        )}
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
      {bleed && (
        // for keyboards and screen readers: the strip is one button, so the shelf has its own
        <button type="button" className="at__apps at__apps--news" onClick={() => setCompanion({ shelf: true })}>Show all news and opportunities</button>
      )}
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
