import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import holdHero from '../assets/reading/hold-hero.webp'
import GameHero from '../components/GameHero.jsx'
import InkFilter from '../components/InkFilter.jsx'
import HoldMarker from '../components/HoldMarker.jsx'
import { article3 } from '../data/articles.js'
import { HOLD_DATA, HOLD_DATA_VERSION } from '../data/holdData.js'
import { loadHoldProgress, saveHoldProgress } from '../data/holdProgress.js'
import AuthorAvatar from '../components/AuthorAvatar.jsx'
import { formatClock, useReadingClock } from '../lib/useReadingClock.js'
import './Reading.css'
import './HoldReading.css'
import BrandLink from '../components/BrandLink.jsx'
import { useFiling, usePlainNext } from '../lib/companion.js'

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
// the game switch for article 3: the ± marker, and the globe the money travels to
const MarkerIcon = () => (<svg {...iconProps}><path d="M12 4v9M7.5 8.5h9" /><path d="M7 19h10" /></svg>)
const GlobeIcon = () => (<svg {...iconProps}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.3 3.8 8.5S14.6 18.1 12 20.5M12 3.5C9.4 5.9 8.2 8.8 8.2 12s1.2 6.1 3.8 8.5" /></svg>)

function HoldReading({ article = article3 }) {
  const navigate = useNavigate()
  const location = useLocation()
  const clock = formatClock(useReadingClock())
  const [game, setGame] = useState(() => location.state?.game ?? false)
  const [saved] = useState(loadHoldProgress)
  const [holds, setHolds] = useState(saved.holds)
  const [activeHold, setActiveHold] = useState(null)
  const events = useRef(saved.events)
  const seq = useRef(saved.events.length)
  const opened = useRef(typeof performance !== 'undefined' ? performance.now() : 0)
  const session = useRef(`s${Date.now().toString(36)}`)

  const persist = (nextHolds) => saveHoldProgress({ holds: nextHolds, events: events.current })
  // rows are never edited or deduplicated: one per press, release, end, tap or interruption
  const logEvent = (holdId) => (action, week) => {
    events.current = [...events.current, {
      sessionId: session.current, articleId: 3, holdId, action, week,
      ms: Math.round((typeof performance !== 'undefined' ? performance.now() : 0) - opened.current), seq: seq.current++, dataVersion: HOLD_DATA_VERSION,
    }]
    persist(holds)
  }
  const settle = (holdId) => (result) => {
    const next = { ...holds, [holdId]: result }
    setHolds(next)
    saveHoldProgress({ holds: next, events: events.current })
  }
  // filing: one row when she moves on to the receipt
  const fileReading = (from) => {
    events.current = [...events.current, {
      sessionId: session.current, articleId: 3, type: 'file', from,
      ms: Math.round((typeof performance !== 'undefined' ? performance.now() : 0) - opened.current), seq: seq.current++,
    }]
    persist(holds)
  }
  useEffect(() => { persist(holds) }, [])

  const plainNext = usePlainNext()
  useFiling(3, (from) => { fileReading(from); navigate('/receipt/3') }, setGame)

  return (
    <main className={`read read--banking read--hold${game ? ' read--game' : ''}`}>
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
        </div>} article={article} image={holdHero} game={game} setGame={setGame} KnobIcon={MarkerIcon} EndIcon={GlobeIcon} />

      <article className="read__body">

        <div className="read__author">
          <AuthorAvatar name={article.author} />
          <span className="read__author-name">{article.author}</span>
          <span id="game-info-slot" className="game-info-slot" />
        </div>


        {article.body.map((block, i) => {
          if (block.h) return <h2 className="hold__heading" key={i}>{block.h}</h2>
          if (block.p) return <p key={i}>{block.p}</p>
          // a paragraph with a hold: without the game it reads as the whole article
          return (
            <p key={i} className="hold__para">
              {block.lead}{' '}
              {game ? (
                <HoldMarker
                  id={block.hold}
                  holdText={block.holdText}
                  after={block.after}
                  result={holds[block.hold]}
                  busy={activeHold !== null && activeHold !== block.hold}
                  onActive={(on) => setActiveHold(on ? block.hold : null)}
                  onEvent={logEvent(block.hold)}
                  onSettle={settle(block.hold)}
                  label={`Hold: ${HOLD_DATA[block.hold].label}`}
                />
              ) : (
                <>{block.holdText} {block.after}</>
              )}
            </p>
          )
        })}

        <div className="read__actions">
          {!game && <button type="button" className="read__next" onClick={() => navigate(plainNext)}>Next article</button>}
        </div>
      </article>
    </main>
  )
}

export default HoldReading
