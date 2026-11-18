import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import gentleman from '../assets/site/gentleman.jpg'
import GameHero from '../components/GameHero.jsx'
import InkFilter from '../components/InkFilter.jsx'
import { article6 } from '../data/articles.js'
import { SEAT_IDS, loadCups, saveCups } from '../data/cupProgress.js'
import authorProfile from '../assets/author-profile.jpg'
import { formatClock, useReadingClock } from '../lib/useReadingClock.js'
import './Reading.css'
import './CupsReading.css'

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
// the game switch for article 6: a cup of tea, and the tree
const CupIcon = () => (<svg {...iconProps}><path d="M5 9h11v4a5 5 0 01-5 5h-1a5 5 0 01-5-5z" /><path d="M16 10h1.5a2 2 0 010 4H16M8 4c0 1 1 1 1 2M12 4c0 1 1 1 1 2" /></svg>)
const TreeIcon = () => (<svg {...iconProps}><path d="M12 20v-6M12 14c-3 0-5-2-5-4.5S9 5 12 4c3 1 5 3 5 5.5S15 14 12 14z" /></svg>)

// a small clay cup: filled when it is one of hers, an empty outline for a seat or a cup she has set elsewhere
function Cup({ filled }) {
  return (
    <svg className={`cup${filled ? ' is-filled' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 8h13v4.5A5.5 5.5 0 0112 18h-2a5.5 5.5 0 01-5.5-5.5z" />
      <path d="M17.5 9.5h1.2a2.3 2.3 0 010 4.6h-1.2" />
      <path d="M3.5 20h15" />
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

  useEffect(() => { openedAt.current = performance.now() }, [])
  const { cups, game, filed } = state
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
    log('game', { on })
    update({ game: on })
  }

  const toggleSeats = () => {
    if (!stateRef.current.seen) { log('seats'); update({ seen: true }) }
    setShowSeats((s) => !s)
  }

  const setCup = (seat) => {
    const idx = stateRef.current.cups.indexOf(null)
    if (idx === -1 || stateRef.current.filed) return
    const next = stateRef.current.cups.map((c, i) => (i === idx ? seat : c))
    const remaining = next.filter((c) => c === null).length
    log('cup', { seatId: seat, reached: reachedSeat(), left: remaining })
    update({ cups: next })
    setAnnounce(`Cup set after ${seatName(seat)}. ${remaining} left among the four.`)
  }
  const takeBack = (idx) => {
    const seat = stateRef.current.cups[idx]
    if (!seat || stateRef.current.filed) return
    const next = stateRef.current.cups.map((c, i) => (i === idx ? null : c))
    const remaining = next.filter((c) => c === null).length
    log('back', { seatId: seat, reached: reachedSeat(), left: remaining })
    update({ cups: next })
    setAnnounce(`Cup taken back from ${seatName(seat)}. ${remaining} left among the four.`)
  }

  const file = () => {
    if (!stateRef.current.filed) { log('file'); update({ filed: true }) }
    navigate('/receipt/6')
  }

  // one row of four: tapping it shows or hides the seats; a cup she has set leaves an empty outline here
  const row = (key) => (
    <button key={key} type="button" className="cups__row" aria-expanded={showSeats} aria-label="Four cups of tea, show the seats" onClick={toggleSeats}>
      {cups.map((seat, i) => <span key={i} className="cups__row-cup"><Cup filled={seat === null} /></span>)}
    </button>
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
            <AnimatePresence initial={false}>
              {mine.map(({ i }) => (
                <motion.button
                  key={i}
                  type="button"
                  className="cups__mine"
                  aria-label={`Your cup ${place} ${seatName(id)}, take it back`}
                  initial={{ opacity: 0, y: -14, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  onClick={() => takeBack(i)}
                  disabled={filed}
                ><Cup filled /></motion.button>
              ))}
            </AnimatePresence>
          </>
        )}
      </span>
    )
  }

  return (
    <main className={`read read--banking read--cups${game ? ' read--game' : ''}`}>
      <InkFilter />
      <header className="read__bar">
        <Link to="/" className="read__brand">cursive</Link>
        <span className="read__time" role="timer" aria-label={`Time on this article: ${clock}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="read__time-text">{clock}</span>
        </span>
      </header>

      <GameHero article={article} image={gentleman} game={game} setGame={setGame} KnobIcon={CupIcon} EndIcon={TreeIcon} switchLabel="Play Four Cups" />

      <article className="read__body">
        <h1 className="read__title">{article.readingTitle.map((line) => <span key={line}>{line}</span>)}</h1>
        <div className="read__author"><img className="read__avatar" src={authorProfile} alt={`${article.author} profile`} />
          <span className="read__author-name">{article.author}</span></div>
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
          <button type="button" className="read__next" onClick={file}>File <span aria-hidden="true">→</span></button>
        </div>
      </article>
    </main>
  )
}

export default CupsReading
