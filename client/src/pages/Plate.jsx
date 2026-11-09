import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import plateImg from '../assets/landing/plate-1.png'
import { outsidePath, plate1 as plate } from '../data/plates.js'
import './Plate.css'

// "U.K.", " the  UK " and "United Kingdom" all compare equal
const normalise = (v) =>
  v.toLowerCase().replace(/\./g, '').replace(/^the\s+/, '').replace(/\s+/g, ' ').trim()

function Plate() {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(null)
  const [shown, setShown] = useState(false)
  const closeTimer = useRef(null)
  const navTimer = useRef(null)
  const [answers, setAnswers] = useState({})
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [hint, setHint] = useState(false)

  const { w, h } = plate.size
  const open = plate.flags.find((f) => f.id === openId)
  const done = Object.keys(answers).length
  const complete = done === plate.flags.length

  // keep the popup mounted for the fade-out, then drop it
  const openFlag = (id) => {
    clearTimeout(closeTimer.current)
    setDraft(answers[id] ?? '')
    setError('')
    setOpenId(id)
    setShown(true)
  }

  const closeFlag = () => {
    setShown(false)
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenId(null), 240)
  }

  useEffect(() => () => {
    clearTimeout(closeTimer.current)
    clearTimeout(navTimer.current)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    const value = draft.trim()
    if (!value) {
      setError('Please type a country name.')
      return
    }
    if (!open.accept.includes(normalise(value))) {
      setError('Your entered country is not correct. Try again.')
      return
    }
    setAnswers((a) => ({ ...a, [openId]: value }))
    closeFlag()
    // a flag with a `next` article opens it once the popup has faded out
    if (open.next) {
      clearTimeout(navTimer.current)
      navTimer.current = setTimeout(() => navigate(open.next), 320)
    }
  }

  useEffect(() => {
    if (!openId) return
    const onKey = (e) => e.key === 'Escape' && closeFlag()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId])

  return (
    <main className="plate">
      {/* roughens the title edges like wet ink */}
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="wet-ink" x="-2%" y="-5%" width="104%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      </svg>

      <header className="plate__bar">
        <Link to="/" className="plate__brand">cursive</Link>
      </header>

      {open && <div className={`plate__veil${shown ? ' is-shown' : ''}`} onClick={closeFlag} />}

      <div className="plate__body">
        <section className="sheet">
          <p className="sheet__prompt">{plate.prompt}</p>

          <div className={`sheet__image${open ? ' is-lit' : ''}`}>
            <img src={plateImg} alt="A hooded figure with a laptop and card before the UK and Indian flags" draggable="false" />

            <svg className="sheet__hot" viewBox={`0 0 ${w} ${h}`} aria-label="Flags you can point to">
              {open && (
                <>
                  <path
                    className={`sheet__dim${shown ? ' is-shown' : ''}`}
                    fillRule="evenodd"
                    d={outsidePath(open.points, w, h)}
                  />
                  <defs>
                    <clipPath id="lit-flag">
                      <polygon points={open.points} />
                    </clipPath>
                  </defs>
                  <image
                    className={`sheet__lit${shown ? ' is-shown' : ''}`}
                    href={plateImg}
                    width={w}
                    height={h}
                    clipPath="url(#lit-flag)"
                  />
                  <polygon className={`sheet__outline${shown ? ' is-shown' : ''}`} points={open.points} />
                  <polygon className={`sheet__run${shown ? ' is-shown' : ''}`} points={open.points} pathLength="1" />
                </>
              )}
              {plate.flags.map((f) => (
                <polygon
                  key={f.id}
                  points={f.points}
                  className={`sheet__flag${hint ? ' is-hint' : ''}${answers[f.id] ? ' is-done' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${f.country} flag`}
                  onClick={() => openFlag(f.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openFlag(f.id)}
                />
              ))}
            </svg>

            <button
              type="button"
              className={`sheet__hint${hint ? ' is-on' : ''}`}
              aria-pressed={hint}
              aria-label="Show where to point"
              onClick={() => setHint((v) => !v)}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M5 3l14 8-6 2-3 6z" fill="currentColor" />
              </svg>
            </button>

            {open && (
              <form className={`ask${shown ? ' is-shown' : ''}`} onSubmit={submit}>
                <div className="ask__head">
                  <span>{open.segment}</span>
                  <button type="button" className="ask__x" aria-label="Close" onClick={closeFlag}>
                    X
                  </button>
                </div>
                <label className="ask__q" htmlFor="country">Which Country ?</label>
                <input
                  id="country"
                  className="ask__input"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setError('')
                  }}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'ask-error' : undefined}
                  placeholder="Type Country"
                  autoComplete="off"
                  autoFocus
                />
                {error && (
                  <p id="ask-error" className="ask__error" role="alert" key={error + draft.length}>
                    {error}
                  </p>
                )}
                <button type="submit" className="ask__go">Submit</button>
              </form>
            )}
          </div>

          <div className="sheet__foot">
            <span className="sheet__no">Plate {plate.numeral}</span>
            <span key={done} className="sheet__count">{done}/{plate.flags.length}</span>
          </div>
        </section>

        <div className="plate__copy">
        <h1 className="plate__title">{plate.title}</h1>

        {complete ? (
          <Link to="/article/1" className="plate__begin is-ready">
            Begin Reading <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span className="plate__begin" aria-disabled="true">
            Begin Reading <span aria-hidden="true">→</span>
          </span>
        )}
        <Link to="/article/1" className="plate__skip">Skip</Link>
        </div>
      </div>
    </main>
  )
}

export default Plate
