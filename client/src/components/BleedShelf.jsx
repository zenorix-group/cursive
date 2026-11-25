import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EASE, T } from '../lib/motion.js'
import { openBleed, readBleed, readMap } from '../lib/bleed.js'
import { isPick } from '../lib/picks.js'
import { useAuth } from '../auth/AuthContext.jsx'

// The shelf: the Bleed's strip grown upward into a list of everything still open, newest first, breaking items on top.
// A row with a link opens it; a row without one opens in place, so nothing just folds away. The bottom bar is where the strip was.
const label = (item) => (item.priority === 'breaking' ? 'Breaking' : item.kind === 'news' ? 'News' : item.type && item.type !== 'other' ? item.type : 'Opportunity')
const when = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }

function BleedShelf({ open, items, bottom, onClose }) {
  const [opened, setOpened] = useState({}) // rows opened in place
  const [done, setDone] = useState(() => readMap())
  const closeRef = useRef(null)
  const quiet = useReducedMotion()
  const { user } = useAuth()

  useEffect(() => {
    if (!open) return undefined
    setDone(readMap())
    closeRef.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const press = (item) => {
    if (item.url) { openBleed(item); setDone((d) => ({ ...d, [item.id]: true })); return }
    readBleed(item)
    setDone((d) => ({ ...d, [item.id]: true }))
    setOpened((o) => ({ ...o, [item.id]: !o[item.id] }))
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="shelf-scrim" className="shelf__scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: quiet ? 0 : T.feedback }} onClick={onClose} />
          <motion.section
            key="shelf"
            className="shelf"
            role="dialog"
            aria-label="News and opportunities"
            style={{ bottom }}
            initial={quiet ? false : { opacity: 0, scaleY: 0.4 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={quiet ? { opacity: 0 } : { opacity: 0, scaleY: 0.4 }}
            transition={{ duration: quiet ? 0 : T.state, ease: EASE }}
          >
            <ul className="shelf__list">
              {items.length === 0 && <li className="shelf__empty">Nothing new right now.</li>}
              {items.map((item) => {
                const isOpen = !!opened[item.id]
                return (
                  <li key={item.id} className={`shelf__item${item.priority === 'breaking' ? ' is-breaking' : ''}${done[item.id] ? ' is-read' : ''}`}>
                    <button type="button" className="shelf__row" aria-expanded={item.url ? undefined : isOpen} onClick={() => press(item)}>
                      <span className="shelf__meta">
                        <small className="shelf__label">{label(item)}</small>
                        <small className="shelf__date">{when(item.createdAt)}{item.endsAt ? ` · until ${when(item.endsAt)}` : ''}</small>
                        {isPick(item, { signedIn: Boolean(user) }) && <small className="shelf__pick">For you</small>}
                        {done[item.id] && <small className="shelf__read">Read</small>}
                      </span>
                      <strong>{item.title}</strong>
                      {item.summary && <em className={isOpen ? 'is-open' : undefined}>{item.summary}</em>}
                      <span className="shelf__go" aria-hidden="true">{item.url ? '↗' : isOpen ? '–' : '+'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <button ref={closeRef} type="button" className="shelf__bar" onClick={onClose}>
              <span>News &amp; opportunities</span>
              <span aria-hidden="true">Close ⌄</span>
            </button>
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default BleedShelf
