import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import quixote from '../assets/site/quixote.jpg'
import GameHero from '../components/GameHero.jsx'
import { article5 } from '../data/articles.js'
import { MOVABLE, loadMoves, saveMoves } from '../data/moveProgress.js'
import { formatClock, useReadingClock } from '../lib/useReadingClock.js'
import './Reading.css'
import './ReArrange.css'

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
// the game switch for article 5: the pilcrow marker, and the book the moments come from
const PilcrowIcon = () => (<svg {...iconProps}><path d="M13 4.5v15M17 4.5v15M13 4.5H9.5a3.5 3.5 0 000 7H13" /></svg>)
const BookIcon = () => (<svg {...iconProps}><path d="M12 6.5C10 5 7 4.8 4 5.2v12.6c3-.4 6 0 8 1.7 2-1.7 5-2.1 8-1.7V5.2c-3-.4-6-.2-8 1.3z" /><path d="M12 6.5v13" /></svg>)

const PICKUP_MS = 200
const MOVE_SLOP = 10
const GLIDE_MS = 550
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const nowMs = (since) => Math.round(performance.now() - since)

// the first sentence, for the one-line fold
const firstSentence = (text) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text

function ReArrange({ article = article5 }) {
  const navigate = useNavigate()
  const location = useLocation()
  const clock = formatClock(useReadingClock())
  const [game, setGame] = useState(() => location.state?.game ?? true)
  const [state, setState] = useState(loadMoves)
  const [drag, setDrag] = useState(null) // { title, from, over, x, y, mode: 'pointer' | 'key' }
  const [folded, setFolded] = useState(false)
  const [announce, setAnnounce] = useState('')
  const stateRef = useRef(state)
  const dragRef = useRef(null)
  const press = useRef(null)
  const events = useRef(state.events)
  const seq = useRef(state.events.length)
  const openedAt = useRef(0)
  const session = useRef(`s${Date.now().toString(36)}`)
  const focusTitle = useRef(null)
  const foldRef = useRef(null)

  const moments = article.moments
  const indexOf = (id) => moments.findIndex((m) => m.id === id)
  const titleOf = (m) => (m.movable ? state.placement[m.id] : m.title)
  const shown = (m) => !!state.opened[m.id] || (m.movable && state.revealed)

  useEffect(() => { openedAt.current = performance.now() }, [])
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { dragRef.current = drag }, [drag])

  const update = (patch) => {
    const next = { ...stateRef.current, ...patch, events: events.current }
    stateRef.current = next
    setState(next)
    saveMoves(next)
  }
  // rows are never edited or removed
  const log = (type, extra = {}) => {
    events.current = [...events.current, { sessionId: session.current, articleId: 5, type, ...extra, ms: nowMs(openedAt.current), seq: seq.current++ }]
  }

  // one record the first time each marker is tapped
  const openMarker = (id) => {
    if (stateRef.current.opened[id]) return
    log('tap', { momentId: id })
    update({ opened: { ...stateRef.current.opened, [id]: true } })
  }

  const scrollTo = (id) => requestAnimationFrame(() => {
    document.getElementById(`moment-${id}`)?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' })
  })

  const endDrag = () => {
    dragRef.current = null
    setDrag(null)
    press.current = null
  }

  // dropping on another ¶ moment swaps the two titles; dropping anywhere else puts the title back
  const drop = (over) => {
    const current = dragRef.current
    if (!current) return
    const { from } = current
    const { placement } = stateRef.current
    if (over && over !== from) {
      const next = { ...placement, [from]: placement[over], [over]: placement[from] }
      log('move', { title: placement[from], from, to: over, placement: next })
      update({ placement: next, revealed: true })
      setAnnounce(`${next[over]} is now at moment ${indexOf(over) + 1}, and ${next[from]} is now at moment ${indexOf(from) + 1}.`)
      focusTitle.current = over
      endDrag()
      // the swapped titles glide to their places in the fold, then the article opens at the paragraph she dropped on
      setTimeout(() => { setFolded(false); scrollTo(over) }, reducedMotion() ? 0 : GLIDE_MS)
    } else {
      endDrag()
      setFolded(false)
      focusTitle.current = from
      scrollTo(from)
    }
  }
  const dropRef = useRef(drop)
  useEffect(() => { dropRef.current = drop })

  const targetAt = (x, y, from) => {
    const id = document.elementFromPoint(x, y)?.closest('[data-drop]')?.getAttribute('data-drop')
    return id && id !== from && MOVABLE.includes(id) ? id : null
  }

  // pointer: press a ¶ title for 200 ms without moving to pick it up; a touch that moves first is a scroll
  const down = (event, id) => {
    if (state.filed || press.current || dragRef.current) return
    if (event.button !== undefined && event.button !== 0) return
    const { clientX: x, clientY: y, pointerId } = event
    press.current = { id, x, y, pointerId, timer: setTimeout(() => {
      press.current = null
      const title = stateRef.current.placement[id]
      const picked = { title, from: id, over: null, x, y, mode: 'pointer' }
      dragRef.current = picked
      setDrag(picked)
      setFolded(true)
      update({ revealed: true })
      window.scrollTo({ top: Math.max(0, (foldRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 90) })
    }, PICKUP_MS) }
  }
  const moveBeforePickup = (event) => {
    const p = press.current
    if (p && Math.hypot(event.clientX - p.x, event.clientY - p.y) > MOVE_SLOP) { clearTimeout(p.timer); press.current = null }
  }
  const cancelPress = () => { if (press.current) { clearTimeout(press.current.timer); press.current = null } }

  // while a title is held, follow the pointer and block page scroll; the listeners live on the window because the article
  // folds under the finger
  useEffect(() => {
    const move = (event) => {
      const current = dragRef.current
      if (!current || current.mode !== 'pointer') return
      const over = targetAt(event.clientX, event.clientY, current.from)
      const next = { ...current, x: event.clientX, y: event.clientY, over }
      dragRef.current = next
      setDrag(next)
    }
    const up = () => { const c = dragRef.current; if (c?.mode === 'pointer') dropRef.current(c.over) }
    const cancel = () => { const c = dragRef.current; if (c?.mode === 'pointer') dropRef.current(null) }
    const block = (event) => { if (dragRef.current?.mode === 'pointer' || press.current) event.preventDefault() }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('touchmove', block, { passive: false })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('touchmove', block)
    }
  }, [])
  useEffect(() => () => cancelPress(), [])

  // keyboard: Space or Enter picks a ¶ title up, the arrow keys move it between the three middle moments,
  // Space or Enter drops it and swaps, Escape puts it back. The article stays open.
  const keyPick = (id) => {
    const others = MOVABLE.filter((m) => m !== id)
    const picked = { title: stateRef.current.placement[id], from: id, over: others[0], x: 0, y: 0, mode: 'key' }
    dragRef.current = picked
    setDrag(picked)
    setAnnounce(`${picked.title} picked up. Use the arrow keys to choose a moment, Space to drop, Escape to put it back.`)
  }
  useEffect(() => {
    if (drag?.mode !== 'key') return undefined
    const onKey = (event) => {
      const current = dragRef.current
      if (!current) return
      if (event.key === 'Escape') { event.preventDefault(); setAnnounce(`${current.title} put back.`); dropRef.current(null); return }
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); dropRef.current(current.over); return }
      const step = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 0
      if (!step) return
      event.preventDefault()
      const others = MOVABLE.filter((m) => m !== current.from)
      const over = others[(others.indexOf(current.over) + step + others.length) % others.length]
      const next = { ...current, over }
      dragRef.current = next
      setDrag(next)
      setAnnounce(`Moment ${indexOf(over) + 1}, currently ${stateRef.current.placement[over]}.`)
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [drag?.mode])

  // after a drop, keep focus on the title that moved
  useEffect(() => {
    if (folded || !focusTitle.current) return
    const id = focusTitle.current
    focusTitle.current = null
    requestAnimationFrame(() => document.getElementById(`title-${id}`)?.focus({ preventScroll: true }))
  }, [folded, state.placement])

  const file = useCallback(() => {
    if (!stateRef.current.filed) {
      log('file')
      update({ filed: true })
    }
    navigate('/receipt/5')
  }, [navigate])

  const markerLabel = (m, n) => `Title of moment ${n}, ${shown(m) ? `shown: ${titleOf(m)}` : 'hidden'}`

  // a plain function, not a component: it must not remount on every render, or a held press would be lost
  const renderMarker = (m, n) => (
    <div className="rearr__marker-row" key={`marker-${m.id}`}>
      <button type="button" className={`rearr__marker${m.movable ? ' is-movable' : ''}`} aria-label={markerLabel(m, n)} onClick={() => openMarker(m.id)}>
        <span aria-hidden="true">{m.movable ? '¶' : ''}</span>
      </button>
      {shown(m) && (m.movable ? (
        <motion.button
          layoutId={`title-${titleOf(m)}`}
          type="button"
          id={`title-${m.id}`}
          className={`rearr__title is-movable${state.filed ? ' is-locked' : ''}${drag?.from === m.id && drag.mode === 'key' ? ' is-held' : ''}`}
          aria-label={`${titleOf(m)}, title of moment ${n}. Press Space to pick it up.`}
          disabled={state.filed}
          onPointerDown={(event) => down(event, m.id)}
          onPointerMove={moveBeforePickup}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => { if ((event.key === ' ' || event.key === 'Enter') && !dragRef.current) { event.preventDefault(); keyPick(m.id) } }}
        >¶ {titleOf(m)}</motion.button>
      ) : <span className="rearr__title">{titleOf(m)}</span>)}
    </div>
  )

  return (
    <main className={`read read--banking read--rearrange${game ? ' read--game' : ''}${folded ? ' is-folded' : ''}`}>
      <header className="read__bar">
        <Link to="/" className="read__brand">cursive</Link>
        <span className="read__time" role="timer" aria-label={`Time on this article: ${clock}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="read__time-text">{clock}</span>
        </span>
      </header>

      <GameHero article={article} image={quixote} game={game} setGame={setGame} KnobIcon={PilcrowIcon} EndIcon={BookIcon} />

      <article className="read__body">
        <h1 className="read__title">{article.readingTitle.map((line) => <span key={line}>{line}</span>)}</h1>
        <p className="rearr__subtitle">{article.subtitle}</p>
        <div className="read__author"><span className="read__author-name">{article.author}</span></div>
        <p className="rearr__standfirst">{article.standfirst}</p>
        {game && <p className="rearr__instruction">{article.instruction}</p>}
        <span className="visually-hidden" role="status" aria-live="polite">{announce}</span>

        {game && folded ? (
          <ol className="rearr__fold" ref={foldRef} aria-label="The six moments, folded">
            {moments.map((m, i) => {
              const target = drag && m.movable && m.id !== drag.from
              const held = drag?.from === m.id
              const visible = m.movable ? true : !!state.opened[m.id]
              return (
                <li key={m.id} data-drop={target ? m.id : undefined} className={`rearr__line${target ? ' is-drop' : ''}${drag?.over === m.id ? ' is-over' : ''}${held ? ' is-from' : ''}`}>
                  <span className={`rearr__marker rearr__marker--static${m.movable ? ' is-movable' : ''}`} aria-hidden="true">{m.movable ? '¶' : ''}</span>
                  {visible && !held && <motion.span layoutId={`title-${titleOf(m)}`} className={`rearr__title${m.movable ? ' is-movable' : ''}`}>{m.movable ? '¶ ' : ''}{titleOf(m)}</motion.span>}
                  <span className="rearr__first">{firstSentence(m.text)}</span>
                  <span className="visually-hidden">Moment {i + 1}</span>
                </li>
              )
            })}
          </ol>
        ) : (
          moments.map((m, i) => (
            <section key={m.id} id={`moment-${m.id}`} className={`rearr__moment${drag?.mode === 'key' && m.movable && m.id !== drag.from ? ' is-drop' : ''}${drag?.over === m.id && drag.mode === 'key' ? ' is-over' : ''}`} data-drop={drag?.mode === 'key' && m.movable && m.id !== drag.from ? m.id : undefined}>
              {game && renderMarker(m, i + 1)}
              <p>{m.text}</p>
            </section>
          ))
        )}

        {drag?.mode === 'pointer' && <div className="rearr__ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">¶ {drag.title}</div>}

        <div className="read__actions">
          <button type="button" className="read__next" onClick={file}>
            {game ? 'File' : 'Next Article'} {game && <span aria-hidden="true">→</span>}
          </button>
        </div>
      </article>
    </main>
  )
}

export default ReArrange
