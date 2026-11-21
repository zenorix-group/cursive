import { useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { logCompanion } from '../lib/companion.js'
import { ISSUE_ID } from '../data/issue.js'

// The Overture's reverse: it turns over like a page and she picks the lens her issue is read through. The lenses come from the vault
// receipt's rubric, which editorial has not written yet; these three are the ones the document names.
export const LENSES = [
  { id: 'philosophical', label: 'Philosophical', line: 'What your choices say about how you think.' },
  { id: 'economic', label: 'Economic', line: 'What your choices say about what you weigh and trade off.' },
  { id: 'practical', label: 'Practical', line: 'What your choices say about what you would do next.' },
]

function BackPage({ open, onClose, onPick }) {
  const first = useRef(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }) // so the effect below does not restart (and steal focus) each time the parent renders
  useEffect(() => {
    if (!open) return undefined
    first.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') close.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const pick = (lens) => {
    logCompanion('lens', { issueId: ISSUE_ID, lens: lens.id })
    onPick(lens)
  }

  return createPortal(
    <AnimatePresence>
      {open && <motion.div key="backpage" className="backpage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section
        className="backpage__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backpage-title"
        initial={{ rotateY: -90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="backpage__eyebrow">The Back Page</p>
        <h2 id="backpage-title">Read your issue through one lens.</h2>
        <p className="backpage__note">Six of your articles are in. Pick how they are read together.</p>
        <div className="backpage__lenses">
          {LENSES.map((lens, i) => (
            <motion.button key={lens.id} ref={i === 0 ? first : undefined} type="button" className="backpage__lens" whileTap={{ scale: 0.97 }} onClick={() => pick(lens)}>
              <strong>{lens.label}</strong>
              <span>{lens.line}</span>
            </motion.button>
          ))}
        </div>
        <button type="button" className="backpage__close" onClick={onClose}>Not now</button>
      </motion.section>
    </motion.div>}
    </AnimatePresence>,
    document.body,
  )
}

export default BackPage
