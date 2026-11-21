import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import room912 from '../assets/site/room912.jpg'
import GameHero from '../components/GameHero.jsx'
import InkFilter from '../components/InkFilter.jsx'
import { article7 } from '../data/articles.js'
import { MAX_WORDS, countWords, limitWords, loadFiles, saveFiles } from '../data/fileProgress.js'
import { formatClock, useReadingClock } from '../lib/useReadingClock.js'
import './Reading.css'
import './TwoFilesReading.css'
import BrandLink from '../components/BrandLink.jsx'
import { useFiling, usePlainNext } from '../lib/companion.js'

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
// the game switch for article 7: a file, and a door
const FileIcon = () => (<svg {...iconProps}><path d="M7 3.5h7l4 4V20.5H7z" /><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6" /></svg>)
const DoorIcon = () => (<svg {...iconProps}><path d="M6 20.5V4.5h12v16M4 20.5h16" /><circle cx="14.5" cy="12.5" r="0.8" fill="currentColor" /></svg>)

const REACH = ['b1', 'b2', 'morning', 'end']
const IDLE_MS = 2000
const LABELS = { hotel: 'Hotel record:', bureau: 'Bureau of Unfiled Incidents:' }
const NAMES = { hotel: 'Hotel record', bureau: 'Bureau of Unfiled Incidents' }

// one note: a label and a field that grows to fit, with a count at its right
function Note({ file, at, value, onChange, onLeave, announce }) {
  const ref = useRef(null)
  const n = countWords(value)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  const id = `note-${at}-${file}`
  const label = `${NAMES[file]}, ${at === 'b1' ? 'first' : 'second'} break, up to twelve words`
  return (
    <div className="files__note">
      <label htmlFor={id} className="files__label">{LABELS[file]}</label>
      <div className="files__field">
        <textarea
          id={id}
          ref={ref}
          rows={1}
          value={value}
          placeholder="Up to twelve words"
          aria-label={label}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          onChange={(event) => onChange(file, at, event.target.value)}
          onFocus={(event) => event.target.scrollIntoView({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
          onBlur={() => onLeave(file, at)}
        />
        <span className="files__count" aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={n} className="files__count-n" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }}>{n} of {MAX_WORDS}</motion.span>
          </AnimatePresence>
        </span>
        <span className="files__rule" aria-hidden="true" />
      </div>
      {announce === id && <span className="visually-hidden" role="status" aria-live="polite">{n} of {MAX_WORDS} words used</span>}
    </div>
  )
}

function TwoFilesReading({ article = article7 }) {
  const navigate = useNavigate()
  const clock = formatClock(useReadingClock())
  const [state, setState] = useState(loadFiles)
  const [announce, setAnnounce] = useState('')
  const stateRef = useRef(state)
  const events = useRef(state.events)
  const seq = useRef(state.events.length)
  const openedAt = useRef(0)
  const session = useRef(`s${Date.now().toString(36)}`)
  const reached = useRef(-1) // index into REACH of the furthest point that has been on her screen
  const recorded = useRef({ hotel: state.notes.hotel, bureau: state.notes.bureau })
  const timers = useRef({})
  const bodyRef = useRef(null)
  const anchor = useRef(null) // keeps her place while the breaks' spaces appear or go
  const { notes, game } = state

  useEffect(() => { openedAt.current = performance.now() }, [])

  const update = (patch) => {
    const next = { ...stateRef.current, ...patch, events: events.current }
    stateRef.current = next
    setState(next)
    saveFiles(next)
  }
  // rows are never edited or removed
  const log = (type, extra = {}) => {
    events.current = [...events.current, { sessionId: session.current, articleId: 7, type, ...extra, ms: Math.round(performance.now() - openedAt.current), seq: seq.current++ }]
  }

  // how far she has read: the furthest of the two breaks, the league's announcement and the last line, measured as she scrolls
  const check = () => {
    for (const el of document.querySelectorAll('[data-reach]')) {
      if (el.getBoundingClientRect().top < window.innerHeight) reached.current = Math.max(reached.current, REACH.indexOf(el.getAttribute('data-reach')))
    }
  }
  useEffect(() => {
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [game])
  const reachedNow = () => {
    check()
    return reached.current < 0 ? 'none' : REACH[reached.current]
  }

  const setGame = (value) => {
    const on = typeof value === 'function' ? value(stateRef.current.game) : value
    if (on === stateRef.current.game) return
    const first = [...(bodyRef.current?.children ?? [])].find((el) => el.getBoundingClientRect().bottom > 90)
    anchor.current = first ? { el: first, top: first.getBoundingClientRect().top } : null
    log('game', { on })
    update({ game: on })
  }

  // a note record goes out when she leaves a field, or stops typing in it for two seconds, and its text has changed
  const flush = (file, at) => {
    clearTimeout(timers.current[file])
    const text = stateRef.current.notes[file]
    if (text === recorded.current[file]) return
    recorded.current[file] = text
    log('note', { file, at, text, words: countWords(text), reached: reachedNow() })
    saveFiles({ ...stateRef.current, events: events.current })
  }
  const change = (file, at, raw) => {
    const text = limitWords(raw)
    update({ notes: { ...stateRef.current.notes, [file]: text } })
    setAnnounce('')
    clearTimeout(timers.current[file])
    timers.current[file] = setTimeout(() => { flush(file, at); setAnnounce(`note-${at}-${file}`) }, IDLE_MS)
  }
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  useLayoutEffect(() => {
    const held = anchor.current
    anchor.current = null
    if (!held?.el?.isConnected) return
    const shift = held.el.getBoundingClientRect().top - held.top
    if (shift) window.scrollBy(0, shift)
  }, [game])

  const file = (from = 'overture') => {
    flush('hotel', 'b2')
    flush('bureau', 'b2')
    if (!stateRef.current.filed) {
      log('file', { from, hotel: stateRef.current.notes.hotel, bureau: stateRef.current.notes.bureau, reached: reachedNow() })
      update({ filed: true })
    }
    navigate('/receipt/7')
  }
  const plainNext = usePlainNext()
  useFiling(7, file, setGame)

  // a break sits in the gap between two paragraphs: its line, the hotel's note and the Bureau's note
  const breakBlock = (id) => (
    <motion.section className="files__break" key={id} data-reach={id} aria-label={id === 'b1' ? 'First break' : 'Second break'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
      <p className="files__line">{article.breaks[id]}</p>
      <Note file="hotel" at={id} value={notes.hotel} onChange={change} onLeave={flush} announce={announce} />
      <Note file="bureau" at={id} value={notes.bureau} onChange={change} onLeave={flush} announce={announce} />
    </motion.section>
  )

  return (
    <MotionConfig reducedMotion="user">
    <main className={`read read--banking read--files${game ? ' read--game' : ''}`}>
      <InkFilter />
      <header className="read__bar">
        <BrandLink className="read__brand" />
        <span className="read__time" role="timer" aria-label={`Time on this article: ${clock}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="read__time-text">{clock}</span>
        </span>
      </header>

      <div className="read__head">
        <h1 className="read__title">{article.readingTitle.map((line) => <span key={line}>{line} </span>)}</h1>
        {article.subtitle && <p className="read__subtitle">{article.subtitle}</p>}
      </div>

      <GameHero article={article} image={room912} game={game} setGame={setGame} KnobIcon={FileIcon} EndIcon={DoorIcon} switchLabel="Play Two Files" />

      <article className="read__body" ref={bodyRef}>
        <div className="read__author files__author">
          <span className="files__seal" aria-hidden="true"><FileIcon /></span>
          <span className="read__author-name">{article.author}</span>
        </div>

        {article.body.map((block, i) => {
          if (block.break) return game ? breakBlock(block.break) : null
          if (block.status) return <p className="files__status" key={i}>{block.status}</p>
          if (block.itinerary) return <ul className="files__itinerary" key={i}>{block.itinerary.map((line) => <li key={line}>{line}</li>)}</ul>
          if (block.credit) return <p className="files__credit" key={i}>{block.credit}</p>
          if (block.mark) return <p key={i} data-reach={block.mark}>{block.p}</p>
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

export default TwoFilesReading
