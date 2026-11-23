import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import earth from '../assets/site/earth.jpg'
import GameHero from '../components/GameHero.jsx'
import InkFilter from '../components/InkFilter.jsx'
import { SENTENCE_IDS, article4 } from '../data/articles.js'
import { WORDS_KEPT, drawWords, loadHighlights, saveHighlights } from '../data/highlightProgress.js'
import { formatClock, useReadingClock } from '../lib/useReadingClock.js'
import './Reading.css'
import './HighlightsReading.css'
import BrandLink from '../components/BrandLink.jsx'
import { useFiling, usePlainNext } from '../lib/companion.js'

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
// the game switch for article 4: a highlighter, and a leaf
const MarkerIcon = () => (<svg {...iconProps}><path d="M4 20h6M14.5 4.5l5 5-8 8H6.5v-5z" /><path d="M12.5 6.5l5 5" /></svg>)
const LeafIcon = () => (<svg {...iconProps}><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" /><path d="M5 19c3-4 6-6 9-8" /></svg>)

function HighlightsReading({ article = article4 }) {
  const navigate = useNavigate()
  const clock = formatClock(useReadingClock())
  const [state, setState] = useState(loadHighlights)
  const [bars, setBars] = useState([])
  const [active, setActive] = useState(0)
  const [wordActive, setWordActive] = useState(0)
  const stateRef = useRef(state)
  const events = useRef(state.events)
  const seq = useRef(state.events.length)
  const openedAt = useRef(0)
  const session = useRef(`s${Date.now().toString(36)}`)
  const bodyRef = useRef(null)
  const sentenceRefs = useRef({})
  const wordRefs = useRef({})
  const lineRef = useRef(null)
  const { game, marked, filed, offered, kept, line } = state

  useEffect(() => { openedAt.current = performance.now() }, [])

  const update = (patch) => {
    const next = { ...stateRef.current, ...patch, events: events.current }
    stateRef.current = next
    setState(next)
    saveHighlights(next)
  }
  // rows are never edited and never deduplicated: a mark, a release and a mark again are three rows
  const log = (type, extra = {}) => {
    events.current = [...events.current, { sessionId: session.current, articleId: 4, type, ...extra, ms: Math.round(performance.now() - openedAt.current), seq: seq.current++ }]
  }

  const setGame = (value) => {
    const on = typeof value === 'function' ? value(stateRef.current.game) : value
    if (on === stateRef.current.game) return
    log('game', { on })
    update({ game: on })
  }

  const toggleMark = (sentenceId) => {
    const current = stateRef.current
    if (current.submitted) return
    const was = current.marked.includes(sentenceId)
    // the Blot can file at any moment, so a tap on a sentence after filing goes back to marking instead of doing nothing:
    // the words offered are dropped, as with "Back to marking"
    const reopening = current.filed
    if (reopening) {
      current.kept.forEach((k) => log('keep', { word: k.word, sentenceId: k.sentenceId, action: 'release' }))
      log('reopen')
    }
    log('mark', { sentenceId, action: was ? 'unmark' : 'mark' })
    update({
      ...(reopening ? { filed: false, offered: [], kept: [] } : {}),
      marked: was ? current.marked.filter((id) => id !== sentenceId) : SENTENCE_IDS.filter((id) => id === sentenceId || current.marked.includes(id)),
    })
  }

  // FILE closes the marking. With two or more marks the six words are drawn from them and offered once.
  const file = (from = 'overture') => {
    const current = stateRef.current
    if (current.filed) return
    log('file', { marks: current.marked.length, from })
    const words = drawWords(current.marked, session.current)
    if (words.length) log('offer', { words })
    update({ filed: true, offered: words, kept: [] })
  }

  // before she writes, she can go back to marking: the words she kept are released and the offer is dropped
  const reopen = () => {
    const current = stateRef.current
    if (!current.filed || current.submitted) return
    current.kept.forEach((k) => log('keep', { word: k.word, sentenceId: k.sentenceId, action: 'release' }))
    log('reopen')
    update({ filed: false, offered: [], kept: [] })
    bodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleKeep = (entry) => {
    const current = stateRef.current
    const isKept = current.kept.some((k) => k.word === entry.word)
    if (!isKept && current.kept.length >= WORDS_KEPT) return
    log('keep', { word: entry.word, sentenceId: entry.sentenceId, action: isKept ? 'release' : 'keep' })
    update({ kept: isKept ? current.kept.filter((k) => k.word !== entry.word) : [...current.kept, entry] })
  }

  const changeLine = (text) => update({ line: text })
  // anything she has written can be sent; the receipt itself says whether her two words appear in it
  const ready = kept.length === WORDS_KEPT && line.trim().length > 0
  const send = () => {
    if (!ready) return
    log('line', { text: stateRef.current.line, wordA: kept[0].word, wordB: kept[1].word })
    update({ submitted: true })
    navigate('/receipt/4')
  }
  const toOverture = () => { update({ submitted: true }); navigate('/receipt/4') }
  const plainNext = usePlainNext()
  useFiling(4, file, setGame, filed)

  // the highlight sits at the text edge, aligned to the cap height of the sentence's first line box
  const measure = () => {
    const body = bodyRef.current
    if (!body) return
    const box = body.getBoundingClientRect()
    const left = Math.max((parseFloat(getComputedStyle(body).paddingLeft) || 0) - 14, -14)
    const next = []
    for (const id of marked) {
      const el = sentenceRefs.current[id]
      const first = el?.getClientRects()[0]
      if (!first) continue
      const size = parseFloat(getComputedStyle(el).fontSize) || 17
      const cap = Math.round(size * 0.72)
      next.push({ id, left, top: first.top - box.top + (first.height - cap) / 2 + size * 0.04, height: cap })
    }
    setBars(next)
  }
  useLayoutEffect(() => { measure() }, [marked, game, filed])
  useEffect(() => {
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [marked])

  // keyboard: arrows move between the sentences, Enter marks (a sentence is a button)
  const moveBetween = (event, index, ids, setIndex, refs) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const next = (index + step + ids.length) % ids.length
    setIndex(next)
    refs.current[ids[next]]?.focus()
  }

  useLayoutEffect(() => {
    const el = lineRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [line, kept.length])

  const sentence = (s) => {
    const index = SENTENCE_IDS.indexOf(s.id)
    if (!game) return <span key={s.id}>{s.text} </span>
    const on = marked.includes(s.id)
    return (
      <span key={s.id}>
        <span
          role="button"
          className={`hh__s${on ? ' is-marked' : ''}`}
          ref={(el) => { sentenceRefs.current[s.id] = el }}
          aria-pressed={on}
          tabIndex={index === active ? 0 : -1}
          onFocus={() => setActive(index)}
          onClick={() => toggleMark(s.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleMark(s.id); return }
            moveBetween(event, index, SENTENCE_IDS, setActive, sentenceRefs)
          }}
        >
          {s.text}
        </span>{' '}
      </span>
    )
  }

  const optionIds = useMemo(() => (kept.length === WORDS_KEPT ? kept : offered).map((o) => o.word), [kept, offered])
  const shown = kept.length === WORDS_KEPT ? kept : offered
  const needTwo = filed && offered.length === 0

  return (
    <MotionConfig reducedMotion="user">
    <main className={`read read--banking read--hh${game ? ' read--game' : ''}`}>
      <InkFilter />
      <header className="read__bar">
        <BrandLink className="read__brand" />
        <span className="read__time" role="timer" aria-label={`Time on this article: ${clock}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="read__time-text">{clock}</span>
        </span>
      </header>

      <div className="read__head">
        <h1 className="read__title">{article.readingTitle.map((l) => <span key={l}>{l} </span>)}</h1>
        {article.subtitle && <p className="read__subtitle">{article.subtitle}</p>}
      </div>

      <GameHero article={article} image={earth} game={game} setGame={setGame} KnobIcon={MarkerIcon} EndIcon={LeafIcon} switchLabel="Play Hindsight Highlights" />

      <article className="read__body hh" ref={bodyRef}>

        <div role={game ? 'group' : undefined} aria-label={game ? 'The article. Each sentence is a button that marks it.' : undefined}>
          {article.body.map((block, i) => {
            if (block.byline) {
              const [name, dateline] = block.byline.split(' · ')
              return (
                <motion.div className="read__author hh__author" key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
                  <span className="hh__initials" aria-hidden="true">{name.split(' ').map((w) => w[0]).join('')}</span>
                  <span className="read__author-name">{name}</span>
                  <span className="hh__dateline">{dateline}</span>
                </motion.div>
              )
            }
            if (block.h) return <h2 className="hh__h" key={i}>{block.h}</h2>
            if (block.q) return <p className="hh__quote" key={i}>{block.q.map(sentence)}</p>
            return <p key={i}>{block.s.map(sentence)}</p>
          })}
        </div>

        <AnimatePresence>
          {game && bars.map((bar) => (
            <motion.span
              className="hh__bar"
              key={bar.id}
              aria-hidden="true"
              style={{ top: bar.top, left: bar.left, height: bar.height }}
              initial={{ opacity: 0, scaleY: 0.15 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.15, transition: { duration: 0.16 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            />
          ))}
        </AnimatePresence>

        <div className="read__actions hh__actions">
          {game ? (
            <>
              <AnimatePresence initial={false}>
                {!filed && (
                  <motion.div key="file" className="hh__filebar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}>
                    <p className="hh__count" role="status">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span key={marked.length} className="hh__count-text" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
                          {marked.length === 0 ? 'Nothing marked yet.' : `${marked.length} marked. Tap a marked sentence again to unmark it.`}
                        </motion.span>
                      </AnimatePresence>
                    </p>
                    <p className="hh__pointer">When you are ready, tap <b>File now</b> in the corner.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <button type="button" className="read__next" onClick={() => navigate(plainNext)}>Next article</button>
          )}
        </div>

        {game && filed && (
          <motion.section className="hh__stage" aria-label="Your words" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            {needTwo ? (
              <div className="hh__plain">
                <p>The piece needs two marked sentences.</p>
                <button type="button" className="hh__skip hh__back" onClick={reopen}>← Back to marking</button>
                <button type="button" className="read__next" onClick={toOverture}>Go to the Overture <span aria-hidden="true">→</span></button>
              </div>
            ) : (
              <>
                <div className="hh__stage-head">
                  <p className="hh__stage-title" id="hh-words-title">Keep two words.</p>
                  <button type="button" className="hh__skip hh__back" onClick={reopen}>← Back to marking</button>
                </div>
                <motion.div layout role="listbox" aria-labelledby="hh-words-title" aria-multiselectable="true" className="hh__words">
                  <AnimatePresence initial={false}>
                    {shown.map((entry, order) => {
                      const on = kept.some((k) => k.word === entry.word)
                      const index = optionIds.indexOf(entry.word)
                      return (
                        <motion.button
                          key={entry.word}
                          type="button"
                          role="option"
                          aria-selected={on}
                          className={`hh__word${on ? ' is-kept' : ''}`}
                          ref={(el) => { wordRefs.current[entry.word] = el }}
                          tabIndex={index === wordActive ? 0 : -1}
                          onFocus={() => setWordActive(index)}
                          onClick={() => toggleKeep(entry)}
                          onKeyDown={(event) => moveBetween(event, index, optionIds, setWordActive, wordRefs)}
                          layout
                          initial={{ opacity: 0, y: 12, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: order * 0.06, type: 'spring', stiffness: 360, damping: 24 } }}
                          exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.2 } }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.94 }}
                        >
                          {entry.word}
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>
                </motion.div>

                <AnimatePresence>
                {kept.length === WORDS_KEPT && (
                  <motion.div className="hh__write" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }} transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 }}>
                    <label htmlFor="hh-line" className="hh__label">{kept[0].word} · {kept[1].word}</label>
                    <textarea
                      id="hh-line"
                      ref={lineRef}
                      rows={1}
                      value={line}
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      onChange={(event) => { changeLine(event.target.value) }}
                      onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault() }}
                    />
                    <motion.span className="hh__rule" aria-hidden="true" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.25 }} />
                    <div className="hh__send">
                      <motion.button type="button" className="read__next" onClick={send} aria-disabled={!ready || undefined} animate={{ opacity: ready ? 1 : 0.45 }} whileHover={ready ? { y: -2 } : undefined} whileTap={ready ? { scale: 0.97 } : undefined}>Send <span aria-hidden="true">→</span></motion.button>
                      <button type="button" className="hh__skip" onClick={toOverture}>Go to the Overture without writing</button>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
                {kept.length !== WORDS_KEPT && <button type="button" className="hh__skip" onClick={toOverture}>Go to the Overture without writing</button>}
              </>
            )}
          </motion.section>
        )}
      </article>
    </main>
    </MotionConfig>
  )
}

export default HighlightsReading
