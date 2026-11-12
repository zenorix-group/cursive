import { Fragment, useEffect, useLayoutEffect, useRef, startTransition, useState } from 'react'
import { AnimatePresence, animate, motion, useAnimationControls, useMotionValue } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import authorProfile from '../assets/author-profile.jpg'
import gameHero from '../assets/reading/game-hero.png'
import feather from '../assets/reading/feather.png'
import { article1 } from '../data/articles.js'
import { loadReadingProgress, saveReadingProgress } from '../data/readingProgress.js'
import { callLines, getCallOptions, loadCallProgress, saveCallProgress } from '../data/callProgress.js'
import { haptic } from '../lib/haptics.js'
import { absorb } from '../lib/overture.js'
import { formatClock, useReadingClock } from '../lib/useReadingClock.js'
import './Reading.css'

// Game-switch icons, one pair per article, drawn as plain black line pictograms (print-glossary style):
// article 1 is the court case and the flight out of Heathrow, article 2 is the phone call and the card it is about.
const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
const GavelIcon = () => (
  <svg {...iconProps}><path d="M12.5 4.5l5 5-3 3-5-5z" /><path d="M15 3l6 6" /><path d="M11 11.5l-7 7" /><path d="M3 21h9" /></svg>
)
const PlaneIcon = () => (
  <svg {...iconProps}><path d="M21 3L3 10.5l6.5 2.5L12 19.5 21 3z" /><path d="M9.5 13L21 3" /></svg>
)
const PhoneIcon = () => (
  <svg {...iconProps}><path d="M6.5 4h3l1.2 4-2 1.3a10 10 0 005 5l1.3-2 4 1.2v3c0 .8-.7 1.5-1.5 1.5C10.8 18.5 5.5 13.2 5.5 6c0-1 .3-2 1-2z" /></svg>
)
const CardIcon = () => (
  <svg {...iconProps}><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="M3 10h18M6.5 15h4" /></svg>
)
const GAME_ICONS = { 1: { knob: GavelIcon, end: PlaneIcon }, 2: { knob: PhoneIcon, end: CardIcon } }

// split a paragraph into sentences, keeping the closing punctuation and spacing
const sentences = (text) => text.match(/[^.!?]+(?:[.!?]+["”’')\]]*\s*|$)/g)?.filter((s) => s.trim()) ?? [text]

// while a question is open, only the sentence right before / after it stays sharp.
// A single paper-coloured shape (one outline, one shadow) is drawn behind that sentence's lines.
function FocusText({ text, which, leaving }) {
  const parts = sentences(text)
  const keep = parts.length < 2 ? 0 : which === 'before' ? parts.length - 1 : 0
  const spanRef = useRef(null)
  const [shape, setShape] = useState(null)

  useLayoutEffect(() => {
    const span = spanRef.current
    const host = span?.parentElement
    if (!span || !host) return undefined
    const measure = () => {
      const base = host.getBoundingClientRect()
      const lines = [...span.getClientRects()].filter((r) => r.width > 1).sort((p, q) => p.top - q.top)
      if (!lines.length) return
      const pad = 3
      const vpad = 5
      const rows = lines.map((r, i) => ({
        // fixed width: every line but the last runs to the column's right edge; every line but the first starts at its left edge
        l: (i === 0 ? r.left - base.left : 0) - pad,
        r: (i === lines.length - 1 ? r.right - base.left : base.width) + pad,
        t: i === 0 ? r.top - base.top - vpad : (lines[i - 1].bottom + r.top) / 2 - base.top,
        b: i === lines.length - 1 ? r.bottom - base.top + vpad : (r.bottom + lines[i + 1].top) / 2 - base.top,
      }))
      // walk down the right-hand steps, then back up the left-hand steps
      const pts = []
      rows.forEach((row) => pts.push([row.r, row.t], [row.r, row.b]))
      for (let i = rows.length - 1; i >= 0; i--) pts.push([rows[i].l, rows[i].b], [rows[i].l, rows[i].t])
      setShape({ d: 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L') + 'Z', w: base.width, h: base.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [text, which])

  return (
    <>
      {shape && (
        <svg className={`focus-shape${leaving ? " is-leaving" : ""}`} width={shape.w} height={shape.h} aria-hidden="true">
          <path d={shape.d} />
        </svg>
      )}
      {parts.map((s, k) =>
        k === keep ? <span key={k} ref={spanRef} className="read__focus">{s}</span> : <span key={k} className={`read__dim${leaving ? " is-leaving" : ""}`}>{s}</span>,
      )}
    </>
  )
}

function Reading({ article = article1 }) {
  const navigate = useNavigate()
  // a plain counter of the time spent on this page
  const clock = formatClock(useReadingClock())
  const location = useLocation()
  const { knob: KnobIcon, end: EndIcon } = GAME_ICONS[article.number] ?? GAME_ICONS[1]
  const [game, setGame] = useState(() => location.state?.game ?? true)
  const [callProgress, setCallProgress] = useState(loadCallProgress)
  const [activeBlank, setActiveBlank] = useState(null)
  const choiceRef = useRef(null)
  const [hintOpen, setHintOpen] = useState(false)
  // idle cue for the hint button, like the one on the game switch: until the reader has used it,
  // wiggle the feather, pulse a ring and pop a small tip every few seconds
  const hintControls = useAnimationControls()
  const [hintTouched, setHintTouched] = useState(false)
  const [hintTip, setHintTip] = useState(false)
  const [hintRing, setHintRing] = useState(0)

  // draggable game switch: the knob follows the finger, then springs to the nearer end
  const trackRef = useRef(null)
  const knobRef = useRef(null)
  const knobX = useMotionValue(0)
  const [travel, setTravel] = useState(36)
  const [touched, setTouched] = useState(false)
  const [tipShown, setTipShown] = useState(false)
  const dragged = useRef(false)
  const dragSide = useRef(false)
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef(null)
  const spring = { type: 'spring', stiffness: 210, damping: 26, mass: 0.9 }
  const hintRef = useRef(null)
  const [activeGap, setActiveGap] = useState(null)
  // the focus/blur lags behind the panel on close so it can fade out instead of snapping
  const [focusGap, setFocusGap] = useState(null)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (activeGap !== null) {
      setFocusGap(activeGap)
      setLeaving(false)
      return undefined
    }
    setLeaving(true)
    const id = setTimeout(() => { setFocusGap(null); setLeaving(false) }, 450)
    return () => clearTimeout(id)
  }, [activeGap])

  const resetOverlays = () => {
    setHintOpen(false)
    setActiveGap(null)
    setActiveBlank(null)
  }

  useEffect(() => {
    if (!game || hintTouched || hintOpen || activeBlank !== null || activeGap !== null) {
      setHintTip(false)
      return undefined
    }
    let hide
    const nudge = () => {
      setHintTip(true)
      setHintRing((n) => n + 1)
      hintControls.start({ rotate: [0, -16, 14, -10, 6, 0], scale: [1, 1.12, 1.12, 1.06, 1, 1], transition: { duration: 1.3, ease: 'easeInOut' } })
      clearTimeout(hide)
      hide = setTimeout(() => setHintTip(false), 3200)
    }
    const first = setTimeout(nudge, 4500)
    const id = setInterval(nudge, 9000)
    return () => {
      clearTimeout(first)
      clearTimeout(hide)
      clearInterval(id)
    }
  }, [game, hintTouched, hintOpen, activeBlank, activeGap, hintControls])

  const knobPlaced = useRef(false)
  useLayoutEffect(() => {
    const measure = () => {
      if (trackRef.current && knobRef.current) {
        const end = trackRef.current.clientWidth - knobRef.current.offsetWidth
        setTravel(end)
        // the first time, put the knob straight at its resting end so it does not slide in on load
        if (!knobPlaced.current) { knobPlaced.current = true; knobX.set(game ? end : 0) }
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const controls = animate(knobX, game ? travel : 0, spring)
    return () => controls.stop()
  }, [game, travel])

  // until the reader touches the switch, pop the tip up every few seconds and nudge the knob to show it slides
  useEffect(() => {
    if (touched || game) {
      setTipShown(false)
      return
    }
    let hide
    const show = () => {
      setTipShown(true)
      const from = game ? travel : 0
      const toward = game ? from - travel * 0.45 : from + travel * 0.45
      animate(knobX, [from, toward, from], { duration: 1.4, ease: 'easeInOut', delay: 0.5 })
      clearTimeout(hide)
      hide = setTimeout(() => setTipShown(false), 3200)
    }
    const first = setTimeout(show, 2200)
    const id = setInterval(show, 7500)
    return () => {
      clearTimeout(first)
      clearTimeout(hide)
      clearInterval(id)
    }
  }, [touched, game, travel])
  const [storedProgress] = useState(() => loadReadingProgress(article.number))
  const [visitedGaps, setVisitedGaps] = useState(storedProgress.visitedGaps)
  const [answers, setAnswers] = useState(storedProgress.answers)
  const [draft, setDraft] = useState('')
  const questionRef = useRef(null)
  const gapRefs = useRef({})
  const callOptions = getCallOptions(callProgress)

  useEffect(() => {
    if (article.number === 2 && typeof location.state?.returnScrollY === 'number') {
      window.scrollTo(0, location.state.returnScrollY)
    }
  }, [article.number, location.state])

  useEffect(() => {
    if (article.number === 2) saveCallProgress(callProgress)
  }, [article.number, callProgress])

  useEffect(() => {
    if (activeBlank === null) return
    choiceRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    choiceRef.current?.querySelector('button, a')?.focus({ preventScroll: true })
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setActiveBlank(null)
        document.getElementById(`call-blank-${activeBlank}`)?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [activeBlank])

  const openCall = () => {
    saveCallProgress(callProgress)
    navigate('/read/2/call', { state: { returnScrollY: window.scrollY } })
  }

  useEffect(() => {
    saveReadingProgress(article.number, { answers, visitedGaps })
  }, [article.number, answers, visitedGaps])

  const closeQuestion = () => {
    setActiveGap(null)
    requestAnimationFrame(() => gapRefs.current[activeGap]?.focus({ preventScroll: true }))
  }

  const openQuestion = (id) => {
    haptic(6)
    setVisitedGaps((previous) => ({ ...previous, [id]: true }))
    setDraft(answers[id] ?? '')
    setHintOpen(false)
    setActiveGap(id)
  }

  useEffect(() => {
    if (activeGap === null) return
    questionRef.current?.querySelector('input')?.focus({ preventScroll: true })
    questionRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
    const closeOutside = (event) => {
      if (!questionRef.current?.contains(event.target) && !event.target.closest('.game-gap')) {
        setActiveGap(null)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setActiveGap(null)
        requestAnimationFrame(() => gapRefs.current[activeGap]?.focus({ preventScroll: true }))
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [activeGap])

  useEffect(() => {
    if (!hintOpen) return
    const closeOutside = (event) => {
      if (!hintRef.current?.contains(event.target)) setHintOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setHintOpen(false)
        hintRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [hintOpen])

  return (
    <main className={`read${game ? ' read--game' : ''}${article.number === 2 ? ' read--banking' : ''}${activeGap !== null ? ' read--question-open' : ''}`}>
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="wet-ink" x="-2%" y="-5%" width="104%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      </svg>
      <header className="read__bar">
        <Link to="/" className="read__brand">cursive</Link>
        <span className="read__time" role="timer" aria-label={`Time on this article: ${clock}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="read__time-text">{clock}</span>
        </span>
      </header>

      <figure className="hero">
        <img className="hero__img" src={gameHero} alt="" draggable="false" />
        <div className="hero__shade" />
        {game && (
          <div className="game-hint" ref={hintRef}>
            <AnimatePresence>
              {hintTip && !hintOpen && (
                <motion.p
                  key="hint-tip"
                  className="game-hint__tip"
                  initial={{ opacity: 0, x: 10, scale: 0.85 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 6, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  Game info
                </motion.p>
              )}
            </AnimatePresence>
            <motion.button
              type="button"
              className="game-hint__button"
              aria-label="Game info"
              aria-expanded={hintOpen}
              aria-controls="game-instructions"
              animate={hintControls}
              onPointerDown={() => setHintTouched(true)}
              onClick={() => {
                setHintTouched(true)
                setHintOpen((open) => !open)
              }}
            >
              {hintRing > 0 && (
                <motion.span
                  key={hintRing}
                  className="game-hint__ring"
                  aria-hidden="true"
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 1.3, ease: 'easeOut' }}
                />
              )}
              <img src={feather} alt="" />
            </motion.button>
            {hintOpen && (
              <aside id="game-instructions" className="game-hint__card" aria-labelledby="game-instructions-title">
                <h2 id="game-instructions-title">{article.gameInfo.title}</h2>
                {article.gameInfo.body.map((line) => <p key={line}>{line}</p>)}
              </aside>
            )}
          </div>
        )}
        <figcaption className="hero__meta">
          Article {String(article.number).padStart(2, '0')} / {String(article.minutes).padStart(2, '0')} min
        </figcaption>

        <div className="hero__game">
          <AnimatePresence>
            {tipShown && !touched && (
              <motion.p
                key="tip"
                className="hero__tip"
                initial={{ opacity: 0, y: 10, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                Slide to<br />{game ? 'leave' : 'enable'} the game.
              </motion.p>
            )}
          </AnimatePresence>
          <button
            type="button"
            ref={trackRef}
            className={`toggle${game ? ' is-on' : ''}`}
            role="switch"
            aria-checked={game}
            aria-label="Game mode"
            onPointerDown={() => setTouched(true)}
            onClick={() => {
              if (dragged.current) return
              haptic(10)
              animate(knobX, game ? 0 : travel, spring)
              startTransition(() => setGame((g) => !g))
              resetOverlays()
            }}
          >
            <motion.span
              ref={knobRef}
              className="toggle__knob"
              style={{ x: knobX }}
              drag="x"
              dragConstraints={{ left: 0, right: travel }}
              dragElastic={0.06}
              dragMomentum={false}
              whileTap={{ scale: 0.97 }}
              onDrag={() => {
                const side = knobX.get() > travel / 2
                if (side !== dragSide.current) {
                  dragSide.current = side
                  haptic(5)
                }
              }}
              onDragStart={() => {
                dragSide.current = knobX.get() > travel / 2
                dragged.current = true
                setTouched(true)
              }}
              onDragEnd={(_, info) => {
                const pos = knobX.get()
                const next = Math.abs(info.velocity.x) > 350 ? info.velocity.x > 0 : pos > travel / 2
                setTimeout(() => (dragged.current = false), 60)
                if (next !== game) {
                  haptic(10)
                  animate(knobX, next ? travel : 0, spring)
                  startTransition(() => setGame(next))
                  resetOverlays()
                } else {
                  animate(knobX, game ? travel : 0, spring)
                }
              }}
            >
              <span className="toggle__icon" aria-hidden="true"><KnobIcon /></span>
            </motion.span>
            <span className={`toggle__idle-feather${game ? '' : ' toggle__idle-feather--right'}`} aria-hidden="true"><EndIcon /></span>
          </button>
        </div>
      </figure>

      <article className="read__body">
        <h1 className="read__title">{article.readingTitle ? article.readingTitle.map((line) => <span key={line}>{line}</span>) : article.headline}</h1>

        <div className="read__author">
          <img className="read__avatar" src={authorProfile} alt={`${article.author} profile`} />
          <span className="read__author-name">{article.author}</span>
        </div>
        {article.sectionLabel && game && <button type="button" className={`read__section-label${article.number === 2 && callProgress.selectedIds.length === 0 ? ' is-nudge' : ''}`} onClick={openCall}><span aria-hidden="true">☎</span> {article.sectionLabel}</button>}

        {article.body.map((para, i) => (
          <Fragment key={i}>
            <p className={focusGap !== null && [focusGap, focusGap + 1].includes(i) ? 'read__context' : undefined}>{focusGap !== null && i === focusGap ? <FocusText text={para} which="before" leaving={leaving} /> : focusGap !== null && i === focusGap + 1 ? <FocusText text={para} which="after" leaving={leaving} /> : para}{game && article.inlineBlankAfter?.includes(i) && <button
              type="button"
              id={`call-blank-${i}`}
              className={`read__inline-blank${callProgress.answers[i] ? ' read__inline-blank--filled' : ''}`}
              aria-label={`Blank ${i}: ${callProgress.answers[i] ? 'change selected line' : 'choose a transcript line'}`}
              title={callLines.find((line) => line.id === callProgress.answers[i])?.text || 'Choose a line'}
              aria-expanded={activeBlank === i}
              aria-controls={`call-options-${i}`}
              onClick={() => { setActiveBlank((previous) => previous === i ? null : i); setGame(true); setHintOpen(false) }}
            >{callProgress.answers[i] ? null : <span aria-hidden="true">…</span>}</button>}{game && article.inlineBlankAfter?.includes(i) && callProgress.answers[i] && <span className="read__placed"> {callLines.find((line) => line.id === callProgress.answers[i])?.text}</span>}</p>
            {game && article.number === 2 && activeBlank === i && <section className="call-options" ref={choiceRef} id={`call-options-${i}`} aria-labelledby={`call-options-title-${i}`}>
              <header><h2 id={`call-options-title-${i}`}><span aria-hidden="true">▪</span> Place a line</h2><span>Target paragraph</span></header>
              <p className="call-options__description">Choose a line from the transcript to re-anchor the sequence.</p>
              {callProgress.selectedIds.length ? <ul>{callOptions.map((line, index) => <li key={line.id} className={line.used ? 'call-options__used' : undefined} data-used={line.used}><button
                type="button"
                aria-pressed={callProgress.answers[i] === line.id}
                aria-label={`${line.text}${line.used ? ' (already placed)' : ''}`}
                onClick={() => {
                  setCallProgress((previous) => ({ ...previous, answers: { ...previous.answers, [i]: line.id } }))
                  setActiveBlank(null)
                  document.getElementById(`call-blank-${i}`)?.focus({ preventScroll: true })
                }}
              ><span className="call-options__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}.</span><span>“{line.text}”</span></button></li>)}</ul> : <p>No lines selected yet. Open The Call to choose up to five.</p>}
              <footer><span>Tap line to set in copy</span><button type="button" onClick={() => { setActiveBlank(null); document.getElementById(`call-blank-${i}`)?.focus({ preventScroll: true }) }}>Dismiss</button></footer>
              <div className="call-options__tools"><button type="button" onClick={openCall}>Review The Call</button>{callProgress.answers[i] && <button type="button" onClick={() => { setCallProgress((previous) => { const nextAnswers = { ...previous.answers }; delete nextAnswers[i]; return { ...previous, answers: nextAnswers } }); requestAnimationFrame(() => choiceRef.current?.querySelector('button')?.focus({ preventScroll: true })) }}>Clear answer</button>}</div>
            </section>}
            {game && article.number !== 2 && [1, 3, 5].includes(i) && (
              <AnimatePresence initial={false}>
              {activeGap === i ? (
                <motion.div
                  key="panel"
                  className="question-wrap"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: { height: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.35, delay: 0.1 } } }}
                  exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.45, ease: [0.32, 0.72, 0, 1] }, opacity: { duration: 0.25, ease: "easeOut" } } }}
                >
                <motion.section
                  className="question-panel"
                  initial={{ y: -18, scale: 0.96 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: -12, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }} ref={questionRef} role="dialog" aria-labelledby={`question-title-${i}`}>
                  <div className="question-panel__header">
                    <span>Q{(i + 1) / 2} / LABEL</span>
                    <div className="question-panel__tools">
                      <span className="question-panel__marks" aria-hidden="true">— — —</span>
                      <button type="button" aria-label="Close question" onClick={closeQuestion}>×</button>
                    </div>
                  </div>
                  <form className="question-panel__form" onSubmit={(event) => {
                    event.preventDefault()
                    if (!draft.trim()) return
                    setAnswers((previous) => ({ ...previous, [i]: draft }))
                    closeQuestion()
                  }}>
                    <div className="question-panel__label">
                      <label id={`question-title-${i}`} htmlFor={`question-input-${i}`}>What has to be answered next?</label>
                      <span>MARGINALIA</span>
                    </div>
                    <input id={`question-input-${i}`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} autoComplete="off" />
                    <div className="question-panel__actions">
                      <button type="submit" disabled={!draft.trim()}>Save Question</button>
                      <button type="button" className="question-panel__clear" onClick={() => {
                        setDraft('')
                        setAnswers((previous) => ({ ...previous, [i]: '' }))
                        questionRef.current?.querySelector('input')?.focus()
                      }}>Clear</button>
                    </div>
                  </form>
                </motion.section>
                </motion.div>
              ) : (
                <motion.div
                  key="gap"
                  className="gap-wrap"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1, transition: { height: { duration: 0.45, ease: [0.32, 0.72, 0, 1] }, opacity: { duration: 0.3, delay: 0.1 } } }}
                  exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.45, ease: [0.32, 0.72, 0, 1] }, opacity: { duration: 0.15 } } }}
                >
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  type="button"
                  ref={(node) => { gapRefs.current[i] = node }}
                  className={`game-gap game-gap--${answers[i] ? 'answered' : visitedGaps[i] ? 'visited' : 'unopened'}`}
                  aria-label={`Question ${(i + 1) / 2}: ${answers[i] ? 'answered' : visitedGaps[i] ? 'opened, unanswered' : 'unopened'}`}
                  aria-haspopup="dialog"
                  onClick={() => openQuestion(i)}
                >
                  <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
                </motion.button>
                </motion.div>
              )}
              </AnimatePresence>
            )}
          </Fragment>
        ))}

        <div className={game ? 'read__actions read__actions--game' : 'read__actions'}>
          {game && <button type="button" className="read__submit" onClick={(event) => {
            // include an answer that is typed in an open question but not yet saved
            const pending = activeGap !== null && draft.trim() ? { ...answers, [activeGap]: draft } : answers
            if (pending !== answers) setAnswers(pending)
            saveReadingProgress(article.number, { answers: pending, visitedGaps })
            if (article.number === 2) saveCallProgress(callProgress)
            setSaved(true)
            absorb('answers', event.currentTarget)
            clearTimeout(savedTimer.current)
            savedTimer.current = setTimeout(() => setSaved(false), 1600)
          }}>{saved ? "Saved ✓" : "Submit Answers"}</button>}
          <button type="button" className="read__next" onClick={() => {
            saveReadingProgress(article.number, { answers, visitedGaps })
            if (article.number === 2) saveCallProgress(callProgress)
            navigate(article.number === 2 ? '/receipt/2' : '/receipt')
          }}>Next Article {game && <span aria-hidden="true">→</span>}</button>
        </div>
      </article>
    </main>
  )
}

export default Reading
