import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion'
import feather from '../assets/reading/feather.png'
import { haptic } from '../lib/haptics.js'
import { usePlaying } from '../lib/companion.js'

// The picture at the top of a game article: the "Game info" button and card, and the switch that turns the game on and off.
// Styled by Reading.css. Used by the articles built from article 3 on.
const usedKey = (name) => `cursive:used:${name}`
const wasUsed = (name) => { try { return localStorage.getItem(usedKey(name)) === '1' } catch { return false } }
const markUsed = (name) => { try { localStorage.setItem(usedKey(name), '1') } catch { /* storage unavailable */ } }
const spring = { type: 'spring', stiffness: 210, damping: 26, mass: 0.9 }

// props: article ({ number, minutes, gameInfo, rule }), image, game, setGame, KnobIcon (on the knob), EndIcon (idle end of the track),
// switchLabel (the switch's accessible name)
function GameHero({ article, image, game, setGame, KnobIcon, EndIcon, switchLabel = 'Game mode', headline }) {
  usePlaying(game)
  const [hintOpen, setHintOpen] = useState(false)
  const [tipShown, setTipShown] = useState(false)
  const hintRef = useRef(null)
  const trackRef = useRef(null)
  const knobRef = useRef(null)
  const knobX = useMotionValue(0)
  const [travel, setTravel] = useState(36)
  const placed = useRef(false)

  useLayoutEffect(() => {
    const measure = () => {
      if (!trackRef.current || !knobRef.current) return
      const end = trackRef.current.clientWidth - knobRef.current.offsetWidth
      setTravel(end)
      if (!placed.current) { placed.current = true; knobX.set(game ? end : 0) }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  useEffect(() => {
    const controls = animate(knobX, game ? travel : 0, spring)
    return () => controls.stop()
  }, [game, travel])

  useEffect(() => {
    if (!hintOpen) return undefined
    const closeOutside = (event) => { if (!hintRef.current?.contains(event.target)) setHintOpen(false) }
    const closeOnEscape = (event) => { if (event.key === 'Escape') setHintOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [hintOpen])

  const toggleGame = () => {
    haptic(10)
    markUsed('switch')
    setHintOpen(false)
    setGame((g) => !g)
  }

  // The Game info feather sits in the author row (the page leaves an empty #game-info-slot there); until the slot exists it stays inline
  const [hintSlot, setHintSlot] = useState(null)
  useEffect(() => { const el = document.getElementById('game-info-slot'); setHintSlot((prev) => (prev === el ? prev : el)) })
  const hintNode = game ? (
            <div className="game-hint" ref={hintRef}>
              <AnimatePresence>
                {tipShown && !hintOpen && (
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
              <button
                type="button"
                className="game-hint__button"
                aria-label="Game info"
                aria-expanded={hintOpen}
                aria-controls="game-instructions"
                onClick={() => setHintOpen((open) => !open)}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setTipShown(true)}
                onPointerLeave={() => setTipShown(false)}
                onFocus={(e) => e.target.matches(':focus-visible') && setTipShown(true)}
                onBlur={() => setTipShown(false)}
              >
                <img src={feather} alt="" />
              </button>
              {hintOpen && (
                <aside id="game-instructions" className="game-hint__card" aria-labelledby="game-instructions-title">
                  <h2 id="game-instructions-title">{article.gameInfo.title}</h2>
                  {article.gameInfo.body.map((line) => <p key={line}>{line}</p>)}
                  <p className="game-hint__rules"><b>Rules</b>{article.rule}</p>
                </aside>
              )}
            </div>
  ) : null

  return (
    <>
      {hintSlot && hintNode && createPortal(hintNode, hintSlot)}
      <figure className="hero">
        <img className="hero__img" src={image} alt="" draggable="false" />
        <div className="hero__shade" />
        <figcaption className="hero__meta">
          Article {String(article.number).padStart(2, '0')} / {String(article.minutes).padStart(2, '0')} min
        </figcaption>

      <div className="hero__game">
        <AnimatePresence>
          {!game && (
            <motion.p
              key="tip"
              className="hero__tip"
              initial={{ opacity: 0, y: 10, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              Tap here to<br />turn on the game.
            </motion.p>
          )}
        </AnimatePresence>
        <div className="hero__row">
          {!hintSlot && hintNode}
          <div className="switch-wrap">
            <button
              type="button"
              ref={trackRef}
              className={`toggle${game ? ' is-on' : ''}`}
              role="switch"
              aria-checked={game}
              aria-label={switchLabel}
              onClick={toggleGame}
            >
              <motion.span ref={knobRef} className="toggle__knob" style={{ x: knobX }}>
                <span className="toggle__icon" aria-hidden="true"><KnobIcon /></span>
              </motion.span>
              <span className={`toggle__idle-feather${game ? '' : ' toggle__idle-feather--right'}`} aria-hidden="true"><EndIcon /></span>
            </button>
          </div>
        </div>
      </div>
      </figure>

      {headline}
    </>
  )
}

export default GameHero
