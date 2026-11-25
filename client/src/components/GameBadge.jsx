import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { article1, article2, article3, article4, article5, article6, article7 } from '../data/articles.js'
import { EASE } from '../lib/motion.js'

// A small game icon on every article picture in the reading room, so a reader knows there is a game and which kind before opening it.
// Hovering the picture, focusing the icon or tapping it shows the game's name and one line on how it is played.
const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICONS = {
  1: <svg {...p}><path d="M12.5 4.5l5 5-3 3-5-5z" /><path d="M15 3l6 6" /><path d="M11 11.5l-7 7" /><path d="M3 21h9" /></svg>, // the gavel: The Next Question
  2: <svg {...p}><path d="M6.5 4h3l1.2 4-2 1.3a10 10 0 005 5l1.3-2 4 1.2v3c0 .8-.7 1.5-1.5 1.5C10.8 18.5 5.5 13.2 5.5 6c0-1 .3-2 1-2z" /></svg>, // the phone: The Call You Trust
  3: <svg {...p}><path d="M12 4v9M7.5 8.5h9" /><path d="M7 19h10" /></svg>, // the ±: The Hold
  4: <svg {...p}><path d="M4 20h6M14.5 4.5l5 5-8 8H6.5v-5z" /><path d="M12.5 6.5l5 5" /></svg>, // the highlighter: Hindsight Highlights
  5: <svg {...p}><path d="M13 4.5v15M17 4.5v15M13 4.5H9.5a3.5 3.5 0 000 7H13" /></svg>, // the pilcrow: Re-Arrange
  6: <svg {...p}><path d="M5 9h11v4a5 5 0 01-5 5h-1a5 5 0 01-5-5z" /><path d="M16 10h1.5a2 2 0 010 4H16M8 4c0 1 1 1 1 2M12 4c0 1 1 1 1 2" /></svg>, // the cup: Four Cups
  7: <svg {...p}><path d="M7 3.5h7l4 4V20.5H7z" /><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6" /></svg>, // the file: Two Files
}
const ARTICLES = { 1: article1, 2: article2, 3: article3, 4: article4, 5: article5, 6: article6, 7: article7 }

function GameBadge({ number, hovering }) {
  const article = ARTICLES[number]
  const ref = useRef(null)
  const [tapped, setTapped] = useState(false)
  const [focused, setFocused] = useState(false)
  const [at, setAt] = useState(null)
  const open = hovering || tapped || focused

  // place the card against the icon, above it when there is room and below it when there is not
  useLayoutEffect(() => {
    if (!open || !ref.current) { setAt(null); return }
    const r = ref.current.getBoundingClientRect()
    const above = r.top > 150
    setAt({ right: Math.max(12, window.innerWidth - r.right), ...(above ? { bottom: window.innerHeight - r.top + 10 } : { top: r.bottom + 10 }) })
  }, [open])

  // a tapped card goes when she taps elsewhere or presses Escape
  useEffect(() => {
    if (!tapped) return undefined
    const away = (event) => { if (!ref.current?.contains(event.target)) setTapped(false) }
    const esc = (event) => { if (event.key === 'Escape') { setTapped(false); setFocused(false) } }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
  }, [tapped])

  if (!article) return null
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`gbadge${open ? ' is-open' : ''}`}
        aria-label={`Game: ${article.mechanic}. ${article.tagline}`}
        aria-expanded={open}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); setTapped((v) => !v) }}
        onFocus={(event) => event.target.matches(':focus-visible') && setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {ICONS[number]}
      </button>
      {createPortal(
        <AnimatePresence>
          {open && at && (
            <motion.div
              key="gcard"
              className="gcard"
              role="status"
              style={at}
              initial={{ opacity: 0, y: 6, scale: 0.94, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <small>Game</small>
              <strong>{article.mechanic}</strong>
              <span>{article.tagline}</span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

export default GameBadge
