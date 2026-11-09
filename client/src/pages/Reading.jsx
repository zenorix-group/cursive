import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import plateImg from '../assets/landing/plate-1.png'
import authorProfile from '../assets/author-profile.jpg'
import gameHero from '../assets/reading/game-hero.png'
import feather from '../assets/reading/feather.png'
import { article1 } from '../data/articles.js'
import { loadReadingProgress, saveReadingProgress } from '../data/readingProgress.js'
import { callLines, getCallOptions, loadCallProgress, saveCallProgress } from '../data/callProgress.js'
import './Reading.css'

function Reading({ article = article1 }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [game, setGame] = useState(() => location.state?.game ?? false)
  const [callProgress, setCallProgress] = useState(loadCallProgress)
  const [activeBlank, setActiveBlank] = useState(null)
  const choiceRef = useRef(null)
  const [hintOpen, setHintOpen] = useState(false)
  const hintRef = useRef(null)
  const [activeGap, setActiveGap] = useState(null)
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
      </header>

      <figure className="hero">
        <img className="hero__img" src={game || article.number === 2 ? gameHero : plateImg} alt="" draggable="false" />
        <div className="hero__shade" />
        {(game || article.number === 2) && (
          <div className="game-hint" ref={hintRef}>
            <button
              type="button"
              className="game-hint__button"
              aria-label="Game hints"
              aria-expanded={hintOpen}
              aria-controls="game-instructions"
              onClick={() => setHintOpen((open) => !open)}
            >
              <img src={feather} alt="" />
            </button>
            {hintOpen && (
              <aside id="game-instructions" className="game-hint__card" aria-labelledby="game-instructions-title">
                <h2 id="game-instructions-title">Three sections of the article are missing.</h2>
                <p>Choose the line from the conversation that best completes each sentence. Each gap includes a hint to help you find the right kind of detail.</p>
                <p>You can review the conversation, use hints, and change your answers whenever you need. Wrong answers are part of the process.</p>
              </aside>
            )}
          </div>
        )}
        <figcaption className="hero__meta">
          Article {String(article.number).padStart(2, '0')} / {String(article.minutes).padStart(2, '0')} min
        </figcaption>

        <div className="hero__game">
          <p className="hero__tip">Click Here To<br />{game ? 'Disable' : 'Enable'} The Game.</p>
          <button
            type="button"
            className={`toggle${game ? ' is-on' : ''}`}
            role="switch"
            aria-checked={game}
            aria-label="Game mode"
            onClick={() => {
              setGame((g) => !g)
              setHintOpen(false)
              setActiveGap(null)
              setActiveBlank(null)
            }}
          >
            <span className="toggle__knob">
              <img className="toggle__feather" src={feather} alt="" />
            </span>
            <img className={`toggle__idle-feather${game ? '' : ' toggle__idle-feather--right'}`} src={feather} alt="" />
          </button>
        </div>
      </figure>

      <article className="read__body">
        <h1 className="read__title">{article.readingTitle ? article.readingTitle.map((line) => <span key={line}>{line}</span>) : article.headline}</h1>

        {article.sectionLabel ? <button type="button" className="read__section-label" onClick={openCall}><span aria-hidden="true">☎</span> {article.sectionLabel}</button> : <div className="read__author">
          <img className="read__avatar" src={authorProfile} alt={`${article.author} profile`} />
          <span className="read__author-name">{article.author}</span>
        </div>}

        {article.body.map((para, i) => (
          <Fragment key={i}>
            <p className={activeGap !== null && [activeGap, activeGap + 1].includes(i) ? 'read__context' : undefined}>{para}{article.inlineBlankAfter?.includes(i) && <button
              type="button"
              id={`call-blank-${i}`}
              className={`read__inline-blank${callProgress.answers[i] ? ' read__inline-blank--filled' : ''}`}
              aria-label={`Blank ${i}: ${callProgress.answers[i] ? 'change selected line' : 'choose a transcript line'}`}
              title={callLines.find((line) => line.id === callProgress.answers[i])?.text || 'Choose a line'}
              aria-expanded={activeBlank === i}
              aria-controls={`call-options-${i}`}
              onClick={() => { setActiveBlank((previous) => previous === i ? null : i); setGame(true); setHintOpen(false) }}
            >{callProgress.answers[i] ? null : <span aria-hidden="true">…</span>}</button>}</p>
            {article.number === 2 && activeBlank === i && <section className="call-options" ref={choiceRef} id={`call-options-${i}`} aria-labelledby={`call-options-title-${i}`}>
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
              activeGap === i ? (
                <section className="question-panel" ref={questionRef} role="dialog" aria-labelledby={`question-title-${i}`}>
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
                </section>
              ) : (
                <button
                  type="button"
                  ref={(node) => { gapRefs.current[i] = node }}
                  className={`game-gap game-gap--${answers[i] ? 'answered' : visitedGaps[i] ? 'visited' : 'unopened'}`}
                  aria-label={`Question ${(i + 1) / 2}: ${answers[i] ? 'answered' : visitedGaps[i] ? 'opened, unanswered' : 'unopened'}`}
                  aria-haspopup="dialog"
                  onClick={() => openQuestion(i)}
                >
                  <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
                </button>
              )
            )}
          </Fragment>
        ))}

        <div className={game || article.number === 2 ? 'read__actions read__actions--game' : 'read__actions'}>
          {(game || article.number === 2) && <button type="button" className="read__submit" onClick={() => {
            saveReadingProgress(article.number, { answers, visitedGaps })
            if (article.number === 2) saveCallProgress(callProgress)
          }}>Submit Answers</button>}
          <button type="button" className="read__next" onClick={() => {
            saveReadingProgress(article.number, { answers, visitedGaps })
            if (article.number === 2) saveCallProgress(callProgress)
            navigate(article.number === 2 ? '/receipt/2' : '/receipt')
          }}>Next Article {(game || article.number === 2) && <span aria-hidden="true">→</span>}</button>
        </div>
      </article>
    </main>
  )
}

export default Reading
