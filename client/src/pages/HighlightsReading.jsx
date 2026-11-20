import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import earth from '../assets/site/earth.jpg'
import GameHero from '../components/GameHero.jsx'
import InkFilter from '../components/InkFilter.jsx'
import { SENTENCE_IDS, article4 } from '../data/articles.js'
import { WORDS_KEPT, drawWords, hasWord, loadHighlights, saveHighlights } from '../data/highlightProgress.js'
import { formatClock, useReadingClock } from '../lib/useReadingClock.js'
import './Reading.css'
import './HighlightsReading.css'

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
    if (stateRef.current.filed) return
    const was = stateRef.current.marked.includes(sentenceId)
    log('mark', { sentenceId, action: was ? 'unmark' : 'mark' })
    update({ marked: was ? stateRef.current.marked.filter((id) => id !== sentenceId) : SENTENCE_IDS.filter((id) => id === sentenceId || stateRef.current.marked.includes(id)) })
  }

  // FILE closes the marking. With two or more marks the six words are drawn from them and offered once.
  const file = () => {
    const current = stateRef.current
    if (current.filed) return
    log('file', { marks: current.marked.length })
    const words = drawWords(current.marked, session.current)
    if (words.length) log('offer', { words })
    update({ filed: true, offered: words, kept: [] })
  }

  const toggleKeep = (entry) => {
    const current = stateRef.current
    const isKept = current.kept.some((k) => k.word === entry.word)
    if (!isKept && current.kept.length >= WORDS_KEPT) return
    log('keep', { word: entry.word, sentenceId: entry.sentenceId, action: isKept ? 'release' : 'keep' })
    update({ kept: isKept ? current.kept.filter((k) => k.word !== entry.word) : [...current.kept, entry] })
  }

  const changeLine = (text) => update({ line: text })
  const ready = kept.length === WORDS_KEPT && kept.every((k) => hasWord(line, k.word))
  const send = () => {
    if (!ready) return
    log('line', { text: stateRef.current.line, wordA: kept[0].word, wordB: kept[1].word })
    update({ submitted: true })
    navigate('/receipt/4')
  }
  const toOverture = () => { update({ submitted: true }); navigate('/receipt/4') }

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
          aria-disabled={filed || undefined}
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
    <main className={`read read--banking read--hh${game ? ' read--game' : ''}`}>
      <InkFilter />
      <header className="read__bar">
        <Link to="/" className="read__brand">cursive</Link>
        <span className="read__time" role="timer" aria-label={`Time on this article: ${clock}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="read__time-text">{clock}</span>
        </span>
      </header>

      <GameHero article={article} image={earth} game={game} setGame={setGame} KnobIcon={MarkerIcon} EndIcon={LeafIcon} switchLabel="Play Hindsight Highlights" />

      <article className="read__body hh" ref={bodyRef}>
        <h1 className="read__title">{article.readingTitle.map((l) => <span key={l}>{l}</span>)}</h1>
        <p className="hh__subtitle">{article.subtitle}</p>

        <div role={game ? 'group' : undefined} aria-label={game ? 'The article. Each sentence is a button that marks it.' : undefined}>
          {article.body.map((block, i) => {
            if (block.byline) return <p className="hh__byline" key={i}>{block.byline}</p>
            if (block.h) return <h2 className="hh__h" key={i}>{block.h}</h2>
            if (block.q) return <p className="hh__quote" key={i}>{block.q.map(sentence)}</p>
            return <p key={i}>{block.s.map(sentence)}</p>
          })}
        </div>

        {game && bars.map((bar) => <span className="hh__bar" key={bar.id} aria-hidden="true" style={{ top: bar.top, left: bar.left, height: bar.height }} />)}

        <div className="read__actions hh__actions">
          {game ? (
            <>
              {!filed && <p className="hh__count" role="status">{marked.length === 0 ? 'Nothing marked yet.' : `${marked.length} marked.`}</p>}
              {!filed && <button type="button" className="read__next" onClick={file}>File <span aria-hidden="true">→</span></button>}
            </>
          ) : (
            <button type="button" className="read__next" onClick={toOverture}>Open the receipt <span aria-hidden="true">→</span></button>
          )}
        </div>

        {game && filed && (
          <section className="hh__stage" aria-label="Your words">
            {needTwo ? (
              <div className="hh__plain">
                <p>The piece needs two marked sentences.</p>
                <button type="button" className="read__next" onClick={toOverture}>Go to the Overture <span aria-hidden="true">→</span></button>
              </div>
            ) : (
              <>
                <p className="hh__stage-title" id="hh-words-title">Keep two words.</p>
                <div role="listbox" aria-labelledby="hh-words-title" aria-multiselectable="true" className="hh__words">
                  <AnimatePresence initial={false}>
                    {shown.map((entry) => {
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
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, transition: { duration: 0.18 } }}
                        >
                          {entry.word}
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>
                </div>

                {kept.length === WORDS_KEPT && (
                  <div className="hh__write">
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
                    <div className="hh__send">
                      <button type="button" className="read__next" onClick={send} aria-disabled={!ready || undefined}>Send <span aria-hidden="true">→</span></button>
                      <button type="button" className="hh__skip" onClick={toOverture}>Go to the Overture without writing</button>
                    </div>
                  </div>
                )}
                {kept.length !== WORDS_KEPT && <button type="button" className="hh__skip" onClick={toOverture}>Go to the Overture without writing</button>}
              </>
            )}
          </section>
        )}
      </article>
    </main>
  )
}

export default HighlightsReading
