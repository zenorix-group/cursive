import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import gentleman from '../assets/site/gentleman.jpg'
import GameHero from '../components/GameHero.jsx'
import InkFilter from '../components/InkFilter.jsx'
import { article6 } from '../data/articles.js'
import { SEAT_IDS, loadCups, saveCups } from '../data/cupProgress.js'
import { formatClock, useReadingClock } from '../lib/useReadingClock.js'
import './Reading.css'
import './CupsReading.css'
import BrandLink from '../components/BrandLink.jsx'
import AuthorAvatar from '../components/AuthorAvatar.jsx'
import { useFiling, usePlainNext } from '../lib/companion.js'

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
// the game switch for article 6: a cup of tea, and the tree
const CupIcon = () => (<svg {...iconProps}><path d="M5 9h11v4a5 5 0 01-5 5h-1a5 5 0 01-5-5z" /><path d="M16 10h1.5a2 2 0 010 4H16M8 4c0 1 1 1 1 2M12 4c0 1 1 1 1 2" /></svg>)
const TreeIcon = () => (<svg {...iconProps}><path d="M12 20v-6M12 14c-3 0-5-2-5-4.5S9 5 12 4c3 1 5 3 5 5.5S15 14 12 14z" /></svg>)

// a small clay cup, drawn by hand: wobbling lines that do not quite meet, a rim and a saucer pencilled twice. Filled when it is one of hers,
// an empty outline for a seat or a cup she has set elsewhere
function Cup({ filled }) {
  return (
    <svg className={`cup${filled ? ' is-filled' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.3 8.2c3.9-.5 8.6-.4 13.3-.1.2 1.6.1 3.2-.5 4.7-.9 2.5-3 4.3-5.5 4.5-2.6.2-5-1-6-3.4-.8-1.8-1.2-3.8-1.3-5.7z" />
      <path d="M17.6 9.4c1.6-.5 3.2.4 3.2 2.1 0 1.8-1.7 2.8-3.5 2.5" />
      <path d="M2.8 20.2c4.8-.6 10.9-.7 17.6-.1" />
      <path d="M4.9 7.7c4.2-.4 8.2-.2 12.7.2" />
      <path d="M3.6 20.8c5-.4 10.2-.3 14.9 0" />
    </svg>
  )
}

const seatIndex = (id) => SEAT_IDS.indexOf(id) + 1

function CupsReading({ article = article6 }) {
  const navigate = useNavigate()
  const clock = formatClock(useReadingClock())
  const [state, setState] = useState(loadCups)
  const [showSeats, setShowSeats] = useState(false)
  const [announce, setAnnounce] = useState('')
  const stateRef = useRef(state)
  const events = useRef(state.events)
  const seq = useRef(state.events.length)
  const openedAt = useRef(0)
  const session = useRef(`s${Date.now().toString(36)}`)
  const reached = useRef(0) // the furthest seat whose sentence has been on her screen, 0 for none
  const origins = useRef({}) // where each set cup flew in from, as an offset from its seat
  const lastBack = useRef({ dx: 0, dy: -60 }) // where the cup she just took back flies to
  const anchor = useRef(null) // keeps her place while the game's spaces appear or go
  const bodyRef = useRef(null)

  useEffect(() => { openedAt.current = performance.now() }, [])
  const { cups, game } = state
  const left = cups.filter((c) => c === null).length
  const seatName = (id) => article.seats.find((s) => s.id === id).name

  const update = (patch) => {
    const next = { ...stateRef.current, ...patch, events: events.current }
    stateRef.current = next
    setState(next)
    saveCups(next)
  }
  // rows are never edited or removed
  const log = (type, extra = {}) => {
    events.current = [...events.current, { sessionId: session.current, articleId: 6, type, ...extra, ms: Math.round(performance.now() - openedAt.current), seq: seq.current++ }]
  }

  // the furthest seat sentence that has been on her screen, whether or not the game is on. A seat counts once its sentence has
  // come into view; scrolling past it counts too. It is measured as she scrolls and again whenever a record is made.
  const checkReached = () => {
    for (const a of document.querySelectorAll('[data-anchor]')) {
      if (a.getBoundingClientRect().top < window.innerHeight) reached.current = Math.max(reached.current, Number(a.getAttribute('data-anchor')))
    }
  }
  useEffect(() => {
    checkReached()
    window.addEventListener('scroll', checkReached, { passive: true })
    window.addEventListener('resize', checkReached)
    return () => {
      window.removeEventListener('scroll', checkReached)
      window.removeEventListener('resize', checkReached)
    }
  }, [])
  const reachedSeat = () => {
    checkReached()
    return reached.current ? SEAT_IDS[reached.current - 1] : 's0'
  }

  const setGame = (value) => {
    const on = typeof value === 'function' ? value(stateRef.current.game) : value
    if (on === stateRef.current.game) return
    // note a paragraph on screen, so the page can hold her place once the spaces appear or go
    const blocks = [...(bodyRef.current?.children ?? [])]
    const first = blocks.find((el) => el.getBoundingClientRect().bottom > 90)
    anchor.current = first ? { el: first, top: first.getBoundingClientRect().top } : null
    log('game', { on })
    update({ game: on })
  }

  const toggleSeats = () => {
    if (!stateRef.current.seen) { log('seats'); update({ seen: true }) }
    setShowSeats((s) => !s)
  }

  // a cup flies between the nearest row of four and its seat: an arc from a row on the screen; with none on the screen, a slide in
  // from the screen edge nearest a row
  const flight = (seatId) => {
    const target = document.querySelector(`[data-seat="${seatId}"] .cups__empty`)?.getBoundingClientRect()
    const rows = [...document.querySelectorAll('.cups__row')].map((r) => r.getBoundingClientRect())
    if (!target || !rows.length) return { dx: 0, dy: -60 }
    const cx = target.left + target.width / 2
    const cy = target.top + target.height / 2
    const vh = window.innerHeight
    const onScreen = rows.filter((r) => r.bottom > 0 && r.top < vh)
    if (onScreen.length) {
      const near = onScreen.reduce((a, b) => (Math.abs(a.top - target.top) <= Math.abs(b.top - target.top) ? a : b))
      return { dx: near.left + near.width / 2 - cx, dy: near.top + near.height / 2 - cy }
    }
    const near = rows.reduce((a, b) => (Math.abs(a.top - target.top) <= Math.abs(b.top - target.top) ? a : b))
    return near.top < 0 ? { dx: 0, dy: -cy - 40 } : { dx: 0, dy: vh - cy + 40 }
  }

  const setCup = (seat) => {
    const idx = stateRef.current.cups.indexOf(null)
    if (idx === -1) return
    const next = stateRef.current.cups.map((c, i) => (i === idx ? seat : c))
    const remaining = next.filter((c) => c === null).length
    origins.current[idx] = flight(seat)
    log('cup', { seatId: seat, reached: reachedSeat(), left: remaining })
    update({ cups: next })
    setAnnounce(`Cup set after ${seatName(seat)}. ${remaining} left among the four.`)
  }
  const takeBack = (idx) => {
    const seat = stateRef.current.cups[idx]
    if (!seat) return
    const next = stateRef.current.cups.map((c, i) => (i === idx ? null : c))
    const remaining = next.filter((c) => c === null).length
    lastBack.current = flight(seat)
    log('back', { seatId: seat, reached: reachedSeat(), left: remaining })
    update({ cups: next })
    setAnnounce(`Cup taken back from ${seatName(seat)}. ${remaining} left among the four.`)
  }

  useLayoutEffect(() => {
    const held = anchor.current
    anchor.current = null
    if (!held?.el?.isConnected) return
    const shift = held.el.getBoundingClientRect().top - held.top
    if (shift) window.scrollBy(0, shift)
  }, [game])

  const file = (from = 'overture') => {
    if (!stateRef.current.filed) { log('file', { from }); update({ filed: true }) }
    navigate('/receipt/6')
  }
  const plainNext = usePlainNext()
  useFiling(6, file, setGame)

  // one row of four: tapping it shows or hides the seats; a cup she has set leaves an empty outline here
  const row = (key) => (
    <motion.button key={key} type="button" className="cups__row" aria-expanded={showSeats} aria-label="Four cups of tea, show the seats" onClick={toggleSeats} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
      {cups.map((seat, i) => (
        <motion.span
          key={i}
          className="cups__row-cup"
          initial={{ opacity: 0, y: 10 }}
          animate={state.seen ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -5, 0] }}
          transition={state.seen ? { type: 'spring', stiffness: 300, damping: 20, delay: i * 0.06 } : { duration: 1.1, delay: 1 + i * 0.12, repeat: 3, repeatDelay: 2.4, ease: 'easeInOut' }}
        ><Cup filled={seat === null} /></motion.span>
      ))}
    </motion.button>
  )

  const allSet = left === 0
  // the seat after a sentence: a space held for it, her cups beside its empty cup
  const seat = (id) => {
    const mine = cups.map((c, i) => ({ c, i })).filter((x) => x.c === id)
    const place = id === 's7' ? 'beside' : 'after'
    return (
      <span key={id} className="cups__seat" data-seat={id}>
        <span className="cups__anchor" data-anchor={seatIndex(id)} aria-hidden="true" />
        {game && (
          <>
            <button
              type="button"
              className={`cups__empty${showSeats && !allSet ? ' is-on' : ''}`}
              aria-label={`Seat ${place} ${seatName(id)}, set a cup here`}
              tabIndex={showSeats && !allSet ? 0 : -1}
              aria-hidden={!(showSeats && !allSet)}
              onClick={() => setCup(id)}
            ><Cup /></button>
            <AnimatePresence initial={false} custom={lastBack.current}>
              {mine.map(({ i }) => (
                <motion.button
                  key={i}
                  type="button"
                  className="cups__mine"
                  aria-label={`Your cup ${place} ${seatName(id)}, take it back`}
                  custom={origins.current[i] || { dx: 0, dy: -60 }}
                  variants={{
                    from: (o) => ({ opacity: 0, x: o.dx, y: o.dy, scale: 0.7 }),
                    seated: { opacity: 1, x: 0, y: 0, scale: 1, transition: { x: { duration: 0.6, ease: 'easeOut' }, y: { duration: 0.6, ease: 'easeIn' }, opacity: { duration: 0.2 }, scale: { type: 'spring', stiffness: 300, damping: 14, delay: 0.35 } } },
                    back: (o) => ({ opacity: 0, x: o.dx, y: o.dy, scale: 0.7, transition: { x: { duration: 0.5, ease: 'easeIn' }, y: { duration: 0.5, ease: 'easeOut' }, opacity: { duration: 0.5, delay: 0.15 } } }),
                  }}
                  initial="from"
                  animate="seated"
                  exit="back"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => takeBack(i)}
                ><Cup filled /></motion.button>
              ))}
            </AnimatePresence>
          </>
        )}
      </span>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
    <main className={`read read--banking read--cups${game ? ' read--game' : ''}`}>
      <InkFilter />
      <header className="read__bar">
        <BrandLink className="read__brand" />
        <span className="read__time" role="timer" aria-label={`Time on this article: ${clock}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="read__time-text">{clock}</span>
        </span>
      </header>

      <GameHero headline={<div className="read__head">
          <h1 className="read__title">{article.readingTitle.map((line) => <span key={line}>{line} </span>)}</h1>
          {article.subtitle && <p className="read__subtitle">{article.subtitle}</p>}
        </div>} article={article} image={gentleman} game={game} setGame={setGame} KnobIcon={CupIcon} EndIcon={TreeIcon} switchLabel="Play Four Cups" />

      <article className="read__body" ref={bodyRef}>
        <div className="read__author cups__author">
          <AuthorAvatar name={article.author} />
          <span className="read__author-name">{article.author}</span>
          <span id="game-info-slot" className="game-info-slot" />
        </div>

        <span className="visually-hidden" role="status" aria-live="polite">{announce}</span>

        {article.body.map((block, i) => {
          if (block.q) return <blockquote className="cups__quote" key={i}>{block.q}</blockquote>
          if (block.row) {
            const rows = article.body.slice(0, i + 1).filter((b) => b.row).length
            // the scene break: the author's mark with the game off, the four cups with it on
            return game ? <div className="cups__break" key={i}>{row(`row-${rows}`)}</div> : (rows === 1 ? <div className="cups__break cups__break--mark" key={i} aria-hidden="true">· · ·</div> : null)
          }
          if (block.segs) {
            return <p key={i} className="cups__para">{block.segs.map((s, k) => (typeof s === 'string' ? <span key={k}>{s}</span> : seat(s.seat)))}</p>
          }
          return <p key={i}>{block.p}</p>
        })}

        <div className="read__actions">
          {!game && <motion.button type="button" className="read__next" onClick={() => navigate(plainNext)} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>Next article</motion.button>}
        </div>
      </article>
    </main>
    </MotionConfig>
  )
}

export default CupsReading
